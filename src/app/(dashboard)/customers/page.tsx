export const dynamic = "force-dynamic";


import { Suspense } from "react";
import { requireAuth } from "@/features/auth/server";
import { CustomersContent } from "./_components/customers-content";

const VALID_RISKS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
type RiskFilter = (typeof VALID_RISKS)[number];

function parseRisk(value: string | undefined): RiskFilter {
  if (!value) return "ALL";
  const upper = value.toUpperCase() as RiskFilter;
  return VALID_RISKS.includes(upper) ? upper : "ALL";
}

function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 80, background: "#F3F4F6", borderRadius: "0.75rem" }} />
        ))}
      </div>
      <div style={{ height: 400, background: "#F3F4F6", borderRadius: "0.75rem" }} />
    </div>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ risk?: string }>;
}) {
  // requireAuth() est wrappé avec React cache() — 0ms si le layout l'a déjà appelé
  const [user, { risk: rawRisk }] = await Promise.all([requireAuth(), searchParams]);

  const riskFilter = parseRisk(rawRisk);

  return (
    <div className="app-page">
      {/* En-tête — statique, rendu immédiat */}
      <div className="app-page-header">
        <div>
        <p className="app-page-kicker">Portefeuille client</p>
        <h2>Clients à risque</h2>
        <p className="app-page-description">
          Clients détectés à risque de départ, classés par score d&apos;insatisfaction.
        </p>
        </div>
      </div>

      {/* KPIs + tableau — streaming, prend le reste de la hauteur */}
      <Suspense fallback={<ContentSkeleton />}>
        <CustomersContent
          tenantId={user.tenant.id}
          plan={user.tenant.plan}
          riskFilter={riskFilter}
        />
      </Suspense>
    </div>
  );
}
