export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultScenariosForSector } from "@/lib/config/scenario-defaults";
import {
  CHURN_SCORE_DEFAULT_THRESHOLD,
  COOLDOWN_DAYS_DEFAULT,
} from "@/config/constants";
import { SettingsTabs } from "./components/settings-tabs";
import type { ScenarioForClient } from "./components/scenarios-tab";

export default async function SettingsPage() {
  const user = await requireAuth();
  const tenant = user.tenant;
  const tenantId = tenant.id;

  const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
  const churnThreshold =
    typeof settings.churn_threshold === "number"
      ? settings.churn_threshold
      : CHURN_SCORE_DEFAULT_THRESHOLD;
  const cooldownDays =
    typeof settings.cooldown_days === "number"
      ? settings.cooldown_days
      : COOLDOWN_DAYS_DEFAULT;

  // ── Seed scénarios par défaut à la première visite (idempotent) ─────────────
  await prisma.$transaction(async (tx) => {
    const count = await tx.winbackScenario.count({ where: { tenantId } });
    if (count === 0) {
      const defaults = defaultScenariosForSector(tenant.sector, tenantId);
      if (defaults.length > 0) {
        await tx.winbackScenario.createMany({ data: defaults, skipDuplicates: true });
      }
    }
  });

  // ── Fetch scénarios ordonnés ─────────────────────────────────────────────────
  const rawScenarios = await prisma.winbackScenario.findMany({
    where: { tenantId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  // Serialize Decimal + Date fields for Client Components
  const scenarios: ScenarioForClient[] = rawScenarios.map((s) => ({
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    priority: s.priority,
    scoreMin: s.scoreMin,
    scoreMax: s.scoreMax,
    channel: s.channel as "EMAIL" | "SMS" | null,
    tone: s.tone,
    vouvoiement: s.vouvoiement,
    autoSendMode: s.autoSendMode,
    compensationType: s.compensationType,
    compensationValue: s.compensationValue ? Number(s.compensationValue) : null,
    compensationMaxEur: Number(s.compensationMaxEur),
    triggersConfig: s.triggersConfig as ScenarioForClient["triggersConfig"],
    usageCount: s.usageCount,
    subjectTemplate: s.subjectTemplate ?? null,
    contentTemplate: s.contentTemplate ?? null,
  }));

  // ── Métriques par scénario (parallèle) ──────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [customerCountEntries, actionCountEntries] = await Promise.all([
    Promise.all(
      scenarios.map((s) =>
        prisma.customer
          .count({ where: { tenantId, churnScore: { gte: s.scoreMin, lte: s.scoreMax } } })
          .then((count) => [s.id, count] as const)
      )
    ),
    Promise.all(
      scenarios.map((s) =>
        prisma.winbackAction
          .count({ where: { scenarioId: s.id, createdAt: { gte: monthStart } } })
          .then((count) => [s.id, count] as const)
      )
    ),
  ]);

  const customerCounts = Object.fromEntries(customerCountEntries);
  const monthlyActionCounts = Object.fromEntries(actionCountEntries);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <div style={{ flexShrink: 0 }}>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#2B2523" }}>
          Paramètres
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          Gérez les informations de votre boutique et les préférences de détection CoY.
        </p>
      </div>

      <SettingsTabs
        name={tenant.name}
        email={tenant.email}
        phone={tenant.phone ?? ""}
        website={tenant.website ?? ""}
        siret={tenant.siret ?? ""}
        churnThreshold={churnThreshold}
        cooldownDays={cooldownDays}
        scenarios={scenarios}
        tenantPlan={tenant.plan}
        tenantStatus={tenant.status}
        tenantSector={tenant.sector}
        dpaSignedAt={tenant.dpaSignedAt ? tenant.dpaSignedAt.toISOString() : null}
        customerCounts={customerCounts}
        monthlyActionCounts={monthlyActionCounts}
      />
    </div>
  );
}
