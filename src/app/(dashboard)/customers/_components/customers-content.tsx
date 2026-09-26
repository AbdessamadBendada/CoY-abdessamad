import { prisma } from "@/shared/db/prisma";
import { PLAN_QUOTAS } from "@/types/database";
import { QUOTA_CRITICAL_PERCENT } from "@/config/constants";
import { StatCard } from "@/components/dashboard/stat-card";
import { CustomersEmptyState } from "../components/customers-empty-state";
import { CustomersFilters } from "../components/customers-filters";
import { CustomerTable, type CustomerRow } from "../components/customer-table";

type RiskFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface CustomersContentProps {
  tenantId: string;
  plan: string;
  riskFilter: RiskFilter;
}

export async function CustomersContent({
  tenantId,
  plan,
  riskFilter,
}: CustomersContentProps) {
  const whereFiltered = {
    tenantId,
    ...(riskFilter !== "ALL"
      ? { churnRisk: riskFilter as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }
      : {}),
  };

  const [customers, riskGroups, totalCustomers, activeIntegrations] =
    await Promise.all([
      prisma.customer.findMany({
        where: whereFiltered,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          churnScore: true,
          churnRisk: true,
          lastScoredAt: true,
          ltv: true,
          totalOrders: true,
          lastOrderAt: true,
          cooldownUntil: true,
          lastActionAt: true,
          recoveredAt: true,
          _count: { select: { actions: true } },
        },
        orderBy: [{ churnScore: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      prisma.customer.groupBy({
        by: ["churnRisk"],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.customer.count({ where: { tenantId } }),
      prisma.integration.findMany({
        where: { tenantId, status: "ACTIVE" },
        select: { type: true },
      }),
    ]);

  // Sérialisation (Decimal + Date → primitifs pour Client Components)
  const serializedCustomers: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    churnScore: c.churnScore,
    churnRisk: c.churnRisk as CustomerRow["churnRisk"],
    lastScoredAt: c.lastScoredAt?.toISOString() ?? null,
    ltv: parseFloat(c.ltv.toString()),
    totalOrders: c.totalOrders,
    lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
    cooldownUntil: c.cooldownUntil?.toISOString() ?? null,
    lastActionAt: c.lastActionAt?.toISOString() ?? null,
    recoveredAt: c.recoveredAt?.toISOString() ?? null,
    actionsCount: c._count.actions,
  }));

  // Métriques par niveau de risque
  const countByRisk: Partial<Record<RiskFilter, number>> = {};
  for (const group of riskGroups) {
    if (group.churnRisk) {
      countByRisk[group.churnRisk as RiskFilter] = group._count.id;
    }
  }
  const criticalCount = countByRisk["CRITICAL"] ?? 0;
  const highCount = countByRisk["HIGH"] ?? 0;

  // Quota plan
  const planKey = plan.toLowerCase() as keyof typeof PLAN_QUOTAS;
  const quota = PLAN_QUOTAS[planKey];
  const customersLimit = quota?.customers_limit ?? 1000;
  const quotaPercent =
    customersLimit === -1
      ? 0
      : Math.min(100, Math.round((totalCustomers / customersLimit) * 100));

  const hasActiveIntegration = activeIntegrations.length > 0;
  const activeIntegrationTypes = activeIntegrations.map((i) => i.type);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", height: "100%", minHeight: 0 }}>
      {/* KPI cards */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4" style={{ flexShrink: 0 }}>
        <StatCard
          label="Score critique"
          value={criticalCount}
          sub="Score ≥ 85"
          accent={criticalCount > 0 ? "coral" : "default"}
        />
        <StatCard
          label="Très haut risque"
          value={highCount}
          sub="Score 60 – 84"
          accent={highCount > 0 ? "amber" : "default"}
        />
        <StatCard label="Total clients" value={totalCustomers} sub="Synchronisés" accent="teal" />
        <StatCard
          label="Quota plan"
          value={`${quotaPercent}%`}
          sub={`${totalCustomers} / ${
            customersLimit === -1 ? "∞" : customersLimit.toLocaleString("fr-FR")
          }`}
          accent={quotaPercent >= QUOTA_CRITICAL_PERCENT ? "coral" : "default"}
        />
      </div>

      {/* Barre quota */}
      {customersLimit !== -1 && totalCustomers > 0 && (
        <div className="space-y-1" style={{ flexShrink: 0 }}>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Utilisation quota clients</span>
            <span>{quotaPercent}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* État vide ou liste */}
      {totalCustomers === 0 ? (
        <CustomersEmptyState
          hasActiveIntegration={hasActiveIntegration}
          activeIntegrationTypes={activeIntegrationTypes}
        />
      ) : (
        <>
          <div style={{ flexShrink: 0 }}>
            <CustomersFilters
              currentRisk={riskFilter}
              countByRisk={countByRisk}
              total={totalCustomers}
            />
          </div>
          {/* Table — prend toute la hauteur restante, scroll interne */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <CustomerTable customers={serializedCustomers} />
            {totalCustomers > 100 && riskFilter === "ALL" && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Affichage des 100 premiers clients. La pagination complète sera disponible en V2.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
