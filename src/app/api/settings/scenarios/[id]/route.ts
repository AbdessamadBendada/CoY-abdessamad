import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/auth";
import { ScenarioInputSchema, serializeScenario } from "../route";
import { canManageTenant } from "@/lib/security/roles";

// ─── GET /api/settings/scenarios/[id] ─────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;
  const tenantId = user.tenant.id;

  // IDOR prevention: always filter by both id and tenantId
  const scenario = await prisma.winbackScenario.findFirst({
    where: { id, tenantId },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scénario introuvable" }, { status: 404 });
  }

  return NextResponse.json({ scenario: serializeScenario(scenario) });
}

// ─── PUT /api/settings/scenarios/[id] ─────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!canManageTenant(user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  const { id } = await params;
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

  // IDOR: verify ownership before any mutation
  const existing = await prisma.winbackScenario.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Scénario introuvable" }, { status: 404 });
  }

  // DPA check for autoSendMode auto
  if (data.autoSendMode === "auto" && !tenant.dpaSignedAt) {
    return NextResponse.json(
      {
        error:
          "Vous devez signer le DPA avant d'activer l'envoi automatique. Rendez-vous dans la section DPA.",
      },
      { status: 422 }
    );
  }

  // Overlap detection (warning, not blocking) — exclude current scenario
  const others = await prisma.winbackScenario.findMany({
    where: { tenantId, isActive: true, id: { not: id } },
    select: { scoreMin: true, scoreMax: true, name: true },
  });
  const overlaps = others.filter(
    (s) => s.scoreMin <= data.scoreMax && s.scoreMax >= data.scoreMin
  );
  const warnings =
    overlaps.length > 0
      ? [
          `Chevauchement avec "${overlaps[0].name}" (${overlaps[0].scoreMin}-${overlaps[0].scoreMax})`,
        ]
      : [];

  const PUT_MAX_RETRIES = 3;
  for (let attempt = 0; attempt < PUT_MAX_RETRIES; attempt++) {
    try {
      const scenario = await prisma.$transaction(
        async (tx) => {
          // Min-1-active invariant: même garde-fou que DELETE — sans cela, deux
          // onglets ouverts (ou un appel direct à l'API) peuvent désactiver tous
          // les scénarios actifs d'un tenant, ce qui bloque toute récupération auto.
          if (existing.isActive && !data.isActive) {
            const activeCount = await tx.winbackScenario.count({
              where: { tenantId, isActive: true },
            });
            if (activeCount <= 1) throw new Error("MIN_ACTIVE_SCENARIO");
          }

          return tx.winbackScenario.update({
            where: { id },
            data: {
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          action: "SCENARIO_UPDATED",
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

      return NextResponse.json({ scenario: serializeScenario(scenario), warnings });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034" &&
        attempt < PUT_MAX_RETRIES - 1
      ) {
        continue; // conflit de sérialisation — retry
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Un scénario porte déjà ce nom pour votre compte" },
          { status: 422 }
        );
      }
      if (err instanceof Error && err.message === "MIN_ACTIVE_SCENARIO") {
        return NextResponse.json(
          {
            error:
              "Impossible de désactiver le dernier scénario actif. Activez-en un autre d'abord.",
          },
          { status: 422 }
        );
      }
      console.error("[settings/scenarios/[id]] Erreur update:", err);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Erreur serveur (conflit concurrent)" }, { status: 500 });
}

// ─── DELETE /api/settings/scenarios/[id] ──────────────────────────────────────

const MAX_RETRIES = 3;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!canManageTenant(user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = user.tenant.id;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(
        async (tx) => {
          // IDOR: check ownership inside transaction
          const target = await tx.winbackScenario.findFirst({
            where: { id, tenantId },
          });
          if (!target) throw new Error("NOT_FOUND");

          // Min-1-active invariant: only guard if deleting an active scenario
          if (target.isActive) {
            const activeCount = await tx.winbackScenario.count({
              where: { tenantId, isActive: true },
            });
            if (activeCount <= 1) throw new Error("MIN_ACTIVE_SCENARIO");
          }

          await tx.winbackScenario.delete({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          action: "SCENARIO_DELETED",
          entityType: "WinbackScenario",
          entityId: id,
        },
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      // P2034 = PostgreSQL serialization failure — retry
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034" &&
        attempt < MAX_RETRIES - 1
      ) {
        continue;
      }

      const msg = err instanceof Error ? err.message : "";

      if (msg === "NOT_FOUND") {
        return NextResponse.json({ error: "Scénario introuvable" }, { status: 404 });
      }
      if (msg === "MIN_ACTIVE_SCENARIO") {
        return NextResponse.json(
          {
            error:
              "Impossible de supprimer le dernier scénario actif. Désactivez-le d'abord ou créez un autre scénario.",
          },
          { status: 422 }
        );
      }

      console.error("[settings/scenarios/[id]] Erreur delete:", err);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  // Exhausted retries on P2034
  return NextResponse.json({ error: "Erreur serveur (conflit concurrent)" }, { status: 500 });
}
