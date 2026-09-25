export const dynamic = "force-dynamic";


import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {/* En-tête — statique, rendu immédiat */}
      <div style={{ flexShrink: 0 }}>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#2B2523" }}>Clients à risque</h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          Clients détectés à risque de départ, classés par score d&apos;insatisfaction.
        </p>
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
