import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/shared/db/prisma";
import { requireAuthApi } from "@/features/auth/server";
import {
  TONE_VALUES,
  AUTO_SEND_MODE_VALUES,
  COMPENSATION_TYPE_VALUES,
  TRIGGER_ID_ALLOWLIST,
  SCENARIO_LIMITS,
} from "@/types/scenarios";
import type { Prisma, WinbackScenario } from "@prisma/client";
import { canManageTenant } from "@/shared/security/events/roles";

// Sérialisation explicite Decimal → number — ne jamais dépendre du JSON.stringify
// implicite de Prisma.Decimal (toJSON renvoie une string, format non contractuel).
export function serializeScenario(scenario: WinbackScenario) {
  return {
    ...scenario,
    compensationValue:
      scenario.compensationValue !== null ? Number(scenario.compensationValue) : null,
    compensationMaxEur: Number(scenario.compensationMaxEur),
  };
}

// ─── Validation schema ─────────────────────────────────────────────────────────

const stripAllHtml = (s: string) => s.replace(/<[^>]*>/g, "");

export const ScenarioInputSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(100)
      .trim()
      .regex(/^[^\x00-\x1F\x7F]*$/, "Caractères de contrôle interdits"),
    isActive: z.boolean(),
    priority: z.number().int().min(0).max(100),
    scoreMin: z.number().int().min(0).max(99),
    scoreMax: z.number().int().min(1).max(100),
    channel: z.enum(["EMAIL", "SMS"]).nullable().optional(),
    tone: z.enum(TONE_VALUES),
    vouvoiement: z.boolean(),
    autoSendMode: z.enum(AUTO_SEND_MODE_VALUES),
    compensationType: z.enum(COMPENSATION_TYPE_VALUES).optional(),
    compensationValue: z.number().min(0).max(10000).multipleOf(0.01).optional(),
    compensationMaxEur: z.number().min(0).max(500).default(50),
    triggersConfig: z
      .object({
        triggers: z
          .array(
            z.object({
              id: z.enum(TRIGGER_ID_ALLOWLIST),
              weight: z.number().min(0).max(1),
              enabled: z.boolean(),
            })
          )
          .max(10),
      })
      .nullable()
      .optional(),
    subjectTemplate: z.string().max(200).trim().optional().nullable()
      .transform(v => (v ? stripAllHtml(v) : v)),
    contentTemplate: z.string().max(2000).trim().optional().nullable()
      .transform(v => (v ? stripAllHtml(v) : v)),
  })
  .refine((d) => d.scoreMin < d.scoreMax, {
    message: "scoreMin doit être inférieur à scoreMax",
  })
  .refine(
    (d) =>
      !(
        d.compensationType === "discount_percent" &&
        (d.compensationValue ?? 0) > 50
      ),
    { message: "Remise % limitée à 50% maximum" }
  )
  .refine(
    (d) =>
      !(
        d.compensationType === "free_shipping" &&
        d.compensationValue !== undefined
      ),
    { message: "free_shipping n'accepte pas de valeur" }
  )
  .refine(
    (d) => !(d.compensationType && d.compensationValue === undefined),
    { message: "compensationValue requis si compensationType défini" }
  )
  .refine(
    (d) =>
      !(
        d.compensationType &&
        d.compensationValue !== undefined &&
        d.compensationValue > d.compensationMaxEur
      ),
    { message: "compensationValue ne peut pas dépasser compensationMaxEur" }
  );

// ─── GET /api/settings/scenarios ──────────────────────────────────────────────

export async function GET() {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const tenantId = user.tenant.id;

  const scenarios = await prisma.winbackScenario.findMany({
    where: { tenantId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ scenarios: scenarios.map(serializeScenario) });
}

// ─── POST /api/settings/scenarios ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!canManageTenant(user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  const tenantId = user.tenant.id;
  const tenant = user.tenant;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = ScenarioInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // ── DPA check for autoSendMode auto ──────────────────────────────────────────
  if (data.autoSendMode === "auto" && !tenant.dpaSignedAt) {
    return NextResponse.json(
      {
        error:
          "Vous devez signer le DPA avant d'activer l'envoi automatique. Rendez-vous dans la section DPA.",
      },
      { status: 422 }
    );
  }

  // ── Plan quota check (trial hérite du plan souscrit — ADR-015) ──────────────
  const planKey = tenant.plan;
  const limit = SCENARIO_LIMITS[planKey] ?? 1;
  if (limit !== -1) {
    const count = await prisma.winbackScenario.count({ where: { tenantId } });
    if (count >= limit) {
      return NextResponse.json(
        {
          error: `Limite de ${limit} scénario(s) atteinte sur votre plan. Passez au plan supérieur pour en créer davantage.`,
        },
        { status: 422 }
      );
    }
  }

  // ── Overlap detection (warning, not blocking) ─────────────────────────────────
  const existing = await prisma.winbackScenario.findMany({
    where: { tenantId, isActive: true },
    select: { scoreMin: true, scoreMax: true, name: true },
  });
  const overlaps = existing.filter(
    (s) => s.scoreMin <= data.scoreMax && s.scoreMax >= data.scoreMin
  );
  const warnings =
    overlaps.length > 0
      ? [
          `Chevauchement avec "${overlaps[0].name}" (${overlaps[0].scoreMin}-${overlaps[0].scoreMax})`,
        ]
      : [];

  // ── Create scenario ───────────────────────────────────────────────────────────
  try {
    const scenario = await prisma.winbackScenario.create({
      data: {
        tenantId,
        name: data.name,
        isActive: data.isActive,
        priority: data.priority,
        scoreMin: data.scoreMin,
        scoreMax: data.scoreMax,
        channel: data.channel ?? null,
        tone: data.tone,
        vouvoiement: data.vouvoiement,
        autoSendMode: data.autoSendMode,
        compensationType: data.compensationType ?? null,
        compensationValue:
          data.compensationValue !== undefined ? data.compensationValue : null,
        compensationMaxEur: data.compensationMaxEur,
        triggersConfig: data.triggersConfig
          ? (data.triggersConfig as Prisma.InputJsonValue)
          : undefined,
        subjectTemplate: data.subjectTemplate ?? null,
        contentTemplate: data.contentTemplate ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "SCENARIO_CREATED",
        entityType: "WinbackScenario",
        entityId: scenario.id,
        details: {
          name: scenario.name,
          tone: scenario.tone,
          autoSendMode: scenario.autoSendMode,
          isActive: scenario.isActive,
          scoreMin: scenario.scoreMin,
          scoreMax: scenario.scoreMax,
          compensationType: scenario.compensationType,
          compensationValue: scenario.compensationValue
            ? Number(scenario.compensationValue)
            : null,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ scenario: serializeScenario(scenario), warnings }, { status: 201 });
  } catch (err) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002") {
      return NextResponse.json(
        { error: "Un scénario porte déjà ce nom pour votre compte" },
        { status: 422 }
      );
    }
    console.error("[settings/scenarios] Erreur création:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
