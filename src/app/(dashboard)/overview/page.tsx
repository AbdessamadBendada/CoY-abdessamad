export const dynamic = "force-dynamic";


import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { KPISection } from "./_components/kpi-section";
import { RevenueChartSection } from "./_components/revenue-chart-section";
import { AlertsSection } from "./_components/alerts-section";
import { InsightsIA } from "./_components/insights-ia";

const PLAN_LABELS: Record<string, string> = {
  COY: "CoY",
  ESSENTIEL: "Essentiel",
  STARTER: "Starter",
  CROISSANCE: "Croissance",
  EXPERT: "Expert",
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COY:        { bg: "rgba(217,119,87,0.08)", text: "#D97757", border: "rgba(217,119,87,0.2)" },
  ESSENTIEL:  { bg: "rgba(217,119,87,0.08)", text: "#D97757", border: "rgba(217,119,87,0.2)" },
  STARTER:    { bg: "rgba(217,119,87,0.08)", text: "#D97757", border: "rgba(217,119,87,0.2)" },
  CROISSANCE: { bg: "rgba(217,119,87,0.08)", text: "#D97757", border: "rgba(217,119,87,0.2)" },
  EXPERT:     { bg: "rgba(217,119,87,0.08)", text: "#D97757", border: "rgba(217,119,87,0.2)" },
};

// Skeletons pulse — affichés pendant le streaming des sections async
function KPISkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div style={{ height: 120, background: "#F3F4F6", borderRadius: "0.75rem" }} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 100, background: "#F3F4F6", borderRadius: "0.75rem" }} />
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{ height: 200, background: "#F3F4F6", borderRadius: "0.75rem" }}
    />
  );
}

function AlertsSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{ height: 200, background: "#F3F4F6", borderRadius: "0.75rem" }}
    />
  );
}

export default async function OverviewPage() {
  // requireAuth() est wrappé avec React cache() — 0ms si le layout l'a déjà appelé
  const user = await requireAuth();
  const tenant = user.tenant;

  const trialDaysLeft =
    tenant.status === "TRIAL" && tenant.trialEndsAt
      ? Math.max(0, differenceInDays(new Date(tenant.trialEndsAt), new Date()))
      : null;

  const planColors = PLAN_COLORS[tenant.plan] ?? PLAN_COLORS["ESSENTIEL"];

  const todayLabel = (() => {
    const raw = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {/* ── En-tête — statique, rendu immédiat (0 requête DB) ───────────────── */}
      <div className="flex items-center justify-between gap-4" style={{ flexShrink: 0 }}>
        <div>
          <h2
            style={{
              color: "#2B2523",
              fontFamily: "var(--font-heading)",
              fontSize: "1.75rem",
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            Bonjour{user.firstName ? `, ${user.firstName}` : ""} 👋
          </h2>
          <p className="text-xs" style={{ color: "#6B7280", marginTop: "0.1rem" }}>
            {todayLabel} — Voici ce qui s&apos;est passé pendant que vous dormiez.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <RefreshButton />
          <span
            style={{
              background: planColors.bg,
              color: planColors.text,
              border: `1px solid ${planColors.border}`,
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.2rem 0.625rem",
              borderRadius: "9999px",
            }}
          >
            Plan {PLAN_LABELS[tenant.plan] ?? tenant.plan}
          </span>
        </div>
      </div>

      {/* ── Bannière trial — statique (données du tenant, pas de DB) ─────────── */}
      {trialDaysLeft !== null && (
        <div
          style={{
            background: "#F5EDE4",
            border: "1px solid rgba(217,119,87,0.3)",
            borderLeft: "3px solid #D97757",
            borderRadius: "0.625rem",
            padding: "0.5rem 0.875rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#5A3825" }}>
            Essai gratuit — {trialDaysLeft} jour{trialDaysLeft !== 1 ? "s" : ""} restant
            {trialDaysLeft !== 1 ? "s" : ""}
          </p>
          <Link href="/billing">
            <Button size="sm" className="whitespace-nowrap">
              Voir mon abonnement →
            </Button>
          </Link>
        </div>
      )}

      {/* ── KPIs — streaming (bannières contextuelles + CA + 3 KPIs + onboarding) */}
      <div style={{ flexShrink: 0 }}>
        <Suspense fallback={<KPISkeleton />}>
          <KPISection
            tenantId={tenant.id}
            trialActive={trialDaysLeft !== null}
            dpaSignedAt={tenant.dpaSignedAt}
          />
        </Suspense>
      </div>

      {/* ── Row 2 — Graphique (60%) + Alertes+Insights (40%) — streaming ────── */}
      <div
        className="grid gap-3 grid-cols-1 lg:grid-cols-5"
        style={{ flex: 1, minHeight: 0 }}
      >
        {/* Graphique — prend toute la hauteur disponible */}
        <div className="lg:col-span-3" style={{ minHeight: 0, overflow: "hidden" }}>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChartSection tenantId={tenant.id} />
          </Suspense>
        </div>
        {/* Colonne droite : Alertes (flex-1) + Insights IA (compact, auto) */}
        <div
          className="lg:col-span-2"
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 0 }}
        >
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Suspense fallback={<AlertsSkeleton />}>
              <AlertsSection tenantId={tenant.id} />
            </Suspense>
          </div>
          <div style={{ flexShrink: 0 }}>
            <InsightsIA />
          </div>
        </div>
      </div>
    </div>
  );
}
