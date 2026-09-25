import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrendingUp, Users, AlertTriangle, BarChart3 } from "lucide-react";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { getOnboardingStatus } from "@/lib/onboarding";
import { PLANS } from "@/config/plans";
import { KpiValue } from "./kpi-value";

interface KPISectionProps {
  tenantId: string;
  trialActive: boolean;
  dpaSignedAt: Date | null;
}

export async function KPISection({ tenantId, trialActive, dpaSignedAt }: KPISectionProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // getOnboardingStatus est isolé du try/catch KPI — un échec des requêtes KPI
  // ne fait plus tomber l'état d'onboarding en valeurs par défaut
  const onboarding = await getOnboardingStatus(tenantId, dpaSignedAt);

  let convertedThisMonth = 0;
  let customersAtRisk = 0;
  let revenueSavedAgg: { _sum: { convertedValue: unknown } } = { _sum: { convertedValue: null } };

  try {
    [
      convertedThisMonth,
      customersAtRisk,
      revenueSavedAgg,
    ] = await Promise.all([
      prisma.winbackAction.count({
        where: { tenantId, status: "CONVERTED", convertedAt: { gte: monthStart } },
      }),
      prisma.customer.count({
        where: { tenantId, churnRisk: { in: ["HIGH", "CRITICAL"] } },
      }),
      prisma.winbackAction.aggregate({
        where: { tenantId, status: "CONVERTED", convertedAt: { gte: monthStart } },
        _sum: { convertedValue: true },
      }),
    ]);
  } catch (err) {
    console.error("[KPISection] KPI queries failed — affichage des valeurs par défaut", err);
  }

  const revenueSavedThisMonth = parseFloat(
    (revenueSavedAgg._sum.convertedValue ?? 0).toString()
  );
  const planCost = PLANS.coy.price_monthly / 100;
  const roiMultiplier =
    !trialActive && planCost > 0 && revenueSavedThisMonth > 0
      ? (revenueSavedThisMonth / planCost).toFixed(1)
      : null;

  const onboardingDone = onboarding.estComplet;

  // Bannière contextuelle — une seule à la fois, par ordre de priorité
  let contextualBanner: "atRisk" | null = null;
  if (customersAtRisk > 0 && convertedThisMonth === 0 && !trialActive) {
    contextualBanner = "atRisk";
  }

  const kpisSecondaires = [
    {
      label: "Clients récupérés",
      value: String(convertedThisMonth),
      sub:
        convertedThisMonth > 0
          ? "Clients sauvés ce mois"
          : "Vos premières récupérations arrivent.",
      icon: Users,
      accent: "#D97757",
      cta: null,
    },
    {
      label: "Clients à risque actif",
      value: String(customersAtRisk),
      sub: "Score risque > 70",
      icon: AlertTriangle,
      accent: "#2B2523",
      variant: "atRisk" as const,
      cta:
        customersAtRisk > 0
          ? { label: "Voir les alertes →", href: "/customers" }
          : null,
    },
    {
      label: "ROI CoY",
      value: roiMultiplier ? `${roiMultiplier}×` : "—",
      sub: roiMultiplier
        ? `Pour ${planCost}€/mois investis`
        : "En attente de vos premières actions",
      icon: BarChart3,
      accent: "#2B2523",
      cta: null,
    },
  ];

  return (
    <>
      {/* Bannière contextuelle */}
      {contextualBanner === "atRisk" && (
        <div
          style={{
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#DC2626" }}>
              {customersAtRisk} client{customersAtRisk > 1 ? "s" : ""} récupérable
              {customersAtRisk > 1 ? "s" : ""} identifié{customersAtRisk > 1 ? "s" : ""} ce mois
            </p>
            <p style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: "0.1rem" }}>
              CoY peut déclencher une action maintenant.
            </p>
          </div>
          <Link href="/customers">
            <Button
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              style={{ borderColor: "#DC2626", color: "#DC2626" }}
            >
              Voir les clients →
            </Button>
          </Link>
        </div>
      )}

      {/* KPIs — 4 cartes sur une seule rangée desktop (hero + 3 secondaires) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Hero KPI — CA sauvé ce mois */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8DDD0",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            boxShadow: "0 1px 3px rgba(43,37,35,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 500, color: "#7A6355", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              CA sauvé ce mois
            </p>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "0.5rem",
                background: "rgba(184,168,152,0.15)",
                border: "1px solid rgba(184,168,152,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingUp style={{ width: 13, height: 13, color: "#B8A898" }} />
            </div>
          </div>
          <KpiValue
            value={revenueSavedThisMonth > 0 ? `${revenueSavedThisMonth.toFixed(0)} €` : "—"}
            style={{
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontSize: "2.25rem",
              fontWeight: 400,
              color: "#2B2523",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          />
          <p style={{ fontSize: "0.8rem", color: "#7A6355" }}>
            {revenueSavedThisMonth > 0 ? "CA récupéré ce mois" : "Premières conversions en cours."}
          </p>
        </div>

        {/* KPIs secondaires */}
        {kpisSecondaires.map((kpi) => {
          const Icon = kpi.icon;
          const isAtRiskActive = kpi.variant === "atRisk" && customersAtRisk > 0;
          return (
            <div
              key={kpi.label}
              style={{
                background: isAtRiskActive ? "rgba(192,68,42,0.04)" : "#fff",
                border: isAtRiskActive ? "1px solid rgba(217,119,87,0.2)" : "1px solid #E8DDD0",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                boxShadow: "0 1px 3px rgba(43,37,35,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 500, color: "#7A6355", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {kpi.label}
                </p>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "0.5rem",
                    background: "rgba(184,168,152,0.15)",
                    border: "1px solid rgba(184,168,152,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon style={{ width: 13, height: 13, color: "#B8A898" }} />
                </div>
              </div>
              <KpiValue
                value={kpi.value}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  fontSize: "2.25rem",
                  fontWeight: 400,
                  color: "#2B2523",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              />
              <p style={{ fontSize: "0.8rem", color: "#7A6355" }}>{kpi.sub}</p>
              {kpi.cta && (
                <Link
                  href={kpi.cta.href}
                  style={{ fontSize: "0.75rem", color: "#D97757", fontWeight: 600 }}
                >
                  {kpi.cta.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Checklist onboarding */}
      {!onboardingDone && (
        <OnboardingChecklist status={onboarding} />
      )}
    </>
  );
}
