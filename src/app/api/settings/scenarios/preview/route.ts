import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/security/log-event";
import { generateAction } from "@/lib/ai/agents";
import { sanitizeEmailHtml } from "@/lib/utils/sanitize-email-html";
import { toValidTone, toValidCompensationType } from "@/types/scenarios";
import { PLAN_PSYCH_TRIGGERS } from "@/config/psych-triggers";
import { SECTOR_MODE, SECTOR_SPORT, SECTOR_DECORATION, SECTOR_AUTRE } from "@/config/sectors";

// Rate limit: 5 previews/hour/tenant — stored in QuotaUsage DB (atomically)
// period format: "preview:YYYY-MM-DDTHH" — cannot collide with business periods
// "YYYY-MM" (different string shape, contains a literal colon), regardless of
// how future code queries QuotaUsage.
const PREVIEW_RATE_LIMIT = 5;

// Fictional customers per sector for fallback (no real customer in range)
const FICTIONAL_CUSTOMERS: Record<string, { firstName: string; sector: string }> = {
  [SECTOR_MODE]: { firstName: "Emma", sector: SECTOR_MODE },
  [SECTOR_SPORT]: { firstName: "Thomas", sector: SECTOR_SPORT },
  [SECTOR_DECORATION]: { firstName: "Julie", sector: SECTOR_DECORATION },
  [SECTOR_AUTRE]: { firstName: "Alex", sector: SECTOR_AUTRE },
};

const RequestSchema = z.object({
  scenarioId: z.string().min(1),
  customerId: z.string().optional(),
});

async function incrementPreviewRateLimit(
  tenantId: string,
  hour: string
): Promise<number> {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      return await tx.quotaUsage.upsert({
        where: { tenantId_period: { tenantId, period: `preview:${hour}` } },
        create: { tenantId, period: `preview:${hour}`, actionsCount: 1 },
        update: { actionsCount: { increment: 1 } },
      });
    });
    return updated.actionsCount;
  } catch (err) {
    // P2002 = unique constraint on concurrent first-request — retry with update-only
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const updated = await prisma.quotaUsage.update({
        where: { tenantId_period: { tenantId, period: `preview:${hour}` } },
        data: { actionsCount: { increment: 1 } },
      });
      return updated.actionsCount;
    }
    throw err;
  }
}

// ─── POST /api/settings/scenarios/preview ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const tenantId = user.tenant.id;
  const tenant = user.tenant;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { scenarioId, customerId } = parsed.data;

  // Secteur fictif de repli — calculé une fois, utilisé pour le message d'absence
  // de client ET pour le prénom fictif final (évite la fonction-scope antérieure
  // qui laissait ce calcul inaccessible au second site d'usage).
  const sectorFallback =
    tenant.sector && Object.hasOwn(FICTIONAL_CUSTOMERS, tenant.sector)
      ? FICTIONAL_CUSTOMERS[tenant.sector]
      : FICTIONAL_CUSTOMERS[SECTOR_MODE];

  // ── IDOR: verify scenario ownership ──────────────────────────────────────────
  const scenario = await prisma.winbackScenario.findFirst({
    where: { id: scenarioId, tenantId },
  });
  if (!scenario) {
    return NextResponse.json({ error: "Scénario introuvable" }, { status: 404 });
  }

  // ── IDOR: verify customer ownership if provided ───────────────────────────────
  if (customerId) {
    const customerExists = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    if (!customerExists) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }
  }

  // ── Rate limit (upsert-then-check, TOCTOU-safe) ───────────────────────────────
  const hour = new Date().toISOString().slice(0, 13); // "2026-06-15T19"
  const usageCount = await incrementPreviewRateLimit(tenantId, hour);
  if (usageCount > PREVIEW_RATE_LIMIT) {
    await logSecurityEvent({
      event: "RATE_LIMIT_EXCEEDED",
      severity: "MEDIUM",
      tenantId,
      request,
      details: { route: "scenarios/preview", limit: PREVIEW_RATE_LIMIT, usageCount },
    });
    return NextResponse.json(
      { error: "Limite d'aperçus atteinte (5 par heure). Réessayez plus tard." },
      { status: 429 }
    );
  }

  // ── Find a real customer in the score range ────────────────────────────────────
  const customer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          ltv: true, totalOrders: true, churnScore: true, churnRisk: true,
        },
      })
    : await prisma.customer.findFirst({
        where: {
          tenantId,
          churnScore: { gte: scenario.scoreMin, lte: scenario.scoreMax },
        },
        orderBy: { churnScore: "desc" },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          ltv: true, totalOrders: true, churnScore: true, churnRisk: true,
        },
      });

  let usedFictionalCustomer = false;
  let fictionalMessage: string | null = null;

  if (!customer) {
    usedFictionalCustomer = true;
    fictionalMessage = `Aucun client dans la plage ${scenario.scoreMin}-${scenario.scoreMax} actuellement — aperçu basé sur un exemple fictif (${sectorFallback.sector})`;
  }

  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client"
    : sectorFallback.firstName;
  const customerEmail = customer?.email ?? "exemple@boutique.fr";
  const customerLtv = customer ? parseFloat(customer.ltv.toString()) : 450;
  const customerOrders = customer?.totalOrders ?? 8;
  const customerScore = customer?.churnScore ?? Math.round((scenario.scoreMin + scenario.scoreMax) / 2);
  const customerRisk = customer?.churnRisk ?? "HIGH";

  // ── Build available psych triggers filtered by scenario config ─────────────────
  const planTriggers =
    PLAN_PSYCH_TRIGGERS[tenant.plan] ?? PLAN_PSYCH_TRIGGERS["COY"];

  const scenarioTriggers = scenario.triggersConfig
    ? (scenario.triggersConfig as { triggers: { id: string; enabled: boolean }[] }).triggers
        .filter((t) => t.enabled)
        .map((t) => t.id)
    : null;

  const availablePsychTriggers = scenarioTriggers
    ? planTriggers.filter((t) => scenarioTriggers.includes(t))
    : planTriggers;

  const effectiveTriggers =
    availablePsychTriggers.length > 0 ? availablePsychTriggers : planTriggers;

  const channel = (scenario.channel ?? "EMAIL") as "EMAIL" | "SMS";

  // ── Call Mistral (dry-run — no action created in DB) ──────────────────────────
  let generated;
  try {
    generated = await generateAction({
      customerName,
      customerEmail,
      ltv: customerLtv,
      totalOrders: customerOrders,
      churnScore: customerScore,
      churnRisk: customerRisk ?? "HIGH",
      detectedTriggers: [],
      channel,
      availablePsychTriggers: effectiveTriggers,
      tenantName: tenant.name,
      tenantSector: tenant.sector,
      tone: toValidTone(scenario.tone),
      vouvoiement: scenario.vouvoiement,
      compensationType: toValidCompensationType(scenario.compensationType),
      compensationValue: scenario.compensationValue
        ? parseFloat(scenario.compensationValue.toString())
        : undefined,
    });
  } catch (err) {
    console.error("[scenarios/preview] Erreur génération Mistral:", err);
    return NextResponse.json(
      { error: "Erreur du moteur de génération IA. Réessayez dans un moment." },
      { status: 500 }
    );
  }

  // Sanitiser avant de renvoyer au client — EMAIL : whitelist HTML (rendu via
  // dangerouslySetInnerHTML côté modal). SMS : aucune balise HTML attendue, on
  // les supprime par défense en profondeur (le SMS est rendu en texte brut).
  // moderateAction supprimé de l'aperçu (Phase C) — re-validation différée à l'envoi réel.
  const safeContent =
    channel === "EMAIL"
      ? sanitizeEmailHtml(generated.content)
      : generated.content.replace(/<[^>]*>/g, "");
  const safeSubject = (generated.subject ?? "")
    .replace(/<[^>]*>/g, "")
    .slice(0, 200);

  // AuditLog for GDPR traceability — content NOT persisted (preview only)
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: user.id,
      action: "SCENARIO_PREVIEW_GENERATED",
      entityType: "WinbackScenario",
      entityId: scenarioId,
      details: {
        aiModelUsed: generated.aiModelUsed,
        tone: scenario.tone,
        compensationType: scenario.compensationType,
        customerId: customer?.id ?? null,
        usedFictionalCustomer,
        channel,
      } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    subject: safeSubject,
    content: safeContent,
    channel,
    psychologicalTrigger: generated.psychologicalTrigger,
    tone: scenario.tone,
    compensationType: scenario.compensationType,
    compensationValue: scenario.compensationValue
      ? parseFloat(scenario.compensationValue.toString())
      : null,
    disclaimer:
      "Aperçu avant re-validation CoY — le message final peut légèrement différer.",
    wasUsingRealCustomer: !usedFictionalCustomer,
    fictionalMessage,
    customerPreview: {
      firstName: customer?.firstName ?? sectorFallback.firstName,
      score: customerScore,
    },
  });
}
