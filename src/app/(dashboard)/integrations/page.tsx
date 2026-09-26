export const dynamic = "force-dynamic";


import { requireAuth } from "@/features/auth/server";
import { prisma } from "@/shared/db/prisma";
import { PLAN_QUOTAS } from "@/types/database";
import { IntegrationCard } from "@/components/dashboard/integration-card";
import { ACTIVE_INTEGRATIONS } from "@/features/integrations/config/active-integrations";

type IntegrationType = (typeof ACTIVE_INTEGRATIONS)[number];

const PLAN_LABELS: Record<string, string> = {
  COY: "CoY",
  ESSENTIEL: "Essentiel",
  STARTER: "Starter",
  CROISSANCE: "Croissance",
  EXPERT: "Expert",
};

export default async function IntegrationsPage() {
  const user = await requireAuth();
  const tenantId = user.tenant.id;

  const integrations = await prisma.integration.findMany({
    where: { tenantId },
    select: { id: true, type: true, status: true, config: true, lastSyncAt: true, lastError: true },
  });

  const planKey = user.tenant.plan.toLowerCase() as keyof typeof PLAN_QUOTAS;
  const limit = PLAN_QUOTAS[planKey]?.integrations_limit ?? 1;
  const activeCount = integrations.filter((i) => i.status === "ACTIVE").length;
  const quotaReached = limit !== -1 && activeCount >= limit;

  function getIntegration(type: IntegrationType) {
    const found = integrations.find((i) => i.type === type);
    if (!found) return null;
    const cfg = found.config as Record<string, unknown> | null;
    return {
      id: found.id,
      status: found.status as "PENDING" | "ACTIVE" | "ERROR" | "DISCONNECTED",
      displayName: (cfg?.shop_domain ?? cfg?.subdomain ?? cfg?.site_url ?? cfg?.website_id ?? null) as string | null,
      lastSyncAt: found.lastSyncAt,
      lastError: found.lastError,
    };
  }

  return (
    <div className="app-page">
      {/* En-tête */}
      <div className="app-page-header"><div>
        <p className="app-page-kicker">Sources de données</p>
        <h2>Intégrations</h2>
        <p className="app-page-description">
          Connectez les plateformes qui alimentent la détection et les actions de récupération.
        </p>
      </div></div>

      {/* Compteur quota */}
      <div className="flex w-fit items-center gap-2 rounded-full border border-[#e8e0dc] bg-white/70 px-3 py-1.5 text-xs text-[#7e737d] shadow-sm">
        <span>
          {activeCount} intégration{activeCount !== 1 ? "s" : ""} active
          {activeCount !== 1 ? "s" : ""}
        </span>
        <span className="text-border">·</span>
        <span>
          {limit === -1
            ? "illimitées sur votre plan"
            : `${limit} maximum sur votre plan ${PLAN_LABELS[user.tenant.plan] ?? user.tenant.plan}`}
        </span>
      </div>

      {/* Cards P1 — intégrations actives */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {ACTIVE_INTEGRATIONS.map((type) => {
          const existing = getIntegration(type);
          const isActive = existing?.status === "ACTIVE";
          return (
            <IntegrationCard
              key={type}
              type={type}
              existingIntegration={existing}
              disabled={quotaReached && !isActive}
              tenantId={tenantId}
            />
          );
        })}
      </div>

    </div>
  );
}
