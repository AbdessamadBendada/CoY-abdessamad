import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_QUOTAS, toTenantPlan } from "@/types/database";
import type { ROIGuaranteeResult } from "@/lib/billing/roi-guarantee";

const PLAN_LABELS: Record<string, string> = {
  COY: "CoY",
  ESSENTIEL: "Essentiel",
  STARTER: "Starter",
  CROISSANCE: "Croissance",
  EXPERT: "Expert",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  TRIAL:     { label: "Essai gratuit",       bg: "rgba(232,184,75,0.12)",  color: "#C99A30" },
  ACTIVE:    { label: "Actif",               bg: "rgba(92,138,58,0.10)",   color: "#5C8A3A" },
  PAST_DUE:  { label: "Paiement en retard",  bg: "rgba(192,68,42,0.08)",   color: "#C0442A" },
  CANCELLED: { label: "Résilié",             bg: "rgba(122,99,85,0.08)",   color: "#7A6355" },
  SUSPENDED: { label: "Suspendu",            bg: "rgba(192,68,42,0.08)",   color: "#C0442A" },
};

interface QuotaBarProps {
  label: string;
  used: number;
  max: number | null;
}

function QuotaBar({ label, used, max }: QuotaBarProps) {
  const unlimited = max === null || max === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const fillColor = pct > 80 ? "#C99A30" : "#D97757";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.75rem", color: "#7A6355", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "0.72rem", color: "#B8A898", fontVariantNumeric: "tabular-nums" }}>
          {unlimited ? `${used} / ∞` : `${used} / ${max}`}
        </span>
      </div>
      <div style={{ height: 4, background: "#E8DDD0", borderRadius: 9999, overflow: "hidden" }}>
        {!unlimited && (
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: fillColor,
              borderRadius: 9999,
              transition: "width 400ms ease-out",
            }}
          />
        )}
      </div>
    </div>
  );
}

interface Props {
  plan: string;
  status: string;
  billingCycle: string;
  trialDaysLeft: number | null;
  usage: { customers: number; actions: number; sms: number };
  roiGuarantee: ROIGuaranteeResult;
}

export function CurrentPlanCard({
  plan,
  status,
  billingCycle,
  trialDaysLeft,
  usage,
  roiGuarantee,
}: Props) {
  const planName = PLAN_LABELS[plan] ?? plan;
  const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE;
  // toTenantPlan lève sur valeur inconnue — un composant de rendu ne doit jamais
  // planter la page billing pour ça, donc repli sur les quotas COY (palier actif).
  let planKey: keyof typeof PLAN_QUOTAS;
  try {
    planKey = toTenantPlan(plan, status);
  } catch {
    planKey = "coy";
  }
  const quotas = PLAN_QUOTAS[planKey];

  const customersMax = quotas?.customers_limit ?? null;
  const actionsMax = quotas?.actions_limit ?? null;
  const smsMax = quotas?.sms_limit ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Plan actuel</CardTitle>
          <span
            style={{ background: statusInfo.bg, color: statusInfo.color }}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          >
            {statusInfo.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-3xl font-bold">{planName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Facturation{" "}
              {billingCycle === "YEARLY" ? "annuelle (−20%)" : "mensuelle"}
            </p>
          </div>

          {status === "TRIAL" && trialDaysLeft !== null && (() => {
            const urgent = trialDaysLeft <= 7;
            const timerColor = urgent ? "#D97757" : "#C99A30";
            const timerBg = urgent ? "rgba(217,119,87,0.12)" : "rgba(232,184,75,0.12)";
            const timerBorder = urgent ? "rgba(217,119,87,0.25)" : "rgba(232,184,75,0.25)";
            return (
              <div
                style={{ background: timerBg, border: `1px solid ${timerBorder}` }}
                className="rounded-lg px-4 py-3 text-center min-w-[140px]"
              >
                <p style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  fontSize: "1.75rem",
                  fontWeight: 400,
                  lineHeight: 1,
                  color: timerColor,
                }}>
                  {trialDaysLeft}j
                </p>
                <p className="text-xs" style={{ color: timerColor, marginTop: "0.2rem" }}>
                  restant{trialDaysLeft !== 1 ? "s" : ""} d&apos;essai
                </p>
              </div>
            );
          })()}

          {status === "PAST_DUE" && (
            <div
              style={{ background: "rgba(192,68,42,0.08)", border: "1px solid rgba(192,68,42,0.2)", color: "#C0442A" }}
              className="rounded-lg px-4 py-3 text-center text-sm font-semibold"
            >
              Paiement requis
            </div>
          )}
        </div>

        {/* Quota bars */}
        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid #E8DDD0",
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
          }}
        >
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#B8A898", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.125rem" }}>
            Utilisation du plan
          </p>
          <QuotaBar label="Clients surveillés" used={usage.customers} max={customersMax} />
          <QuotaBar label="Actions ce mois" used={usage.actions} max={actionsMax} />
          <QuotaBar label="SMS ce mois" used={usage.sms} max={smsMax} />
        </div>

        {/* Garantie ROI 60 jours — informatif uniquement, octroi manuel (voir CGV Art. 10) */}
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "0.875rem",
            borderTop: "1px solid #E8DDD0",
          }}
        >
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#B8A898", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
            Garantie ROI 60 jours
          </p>
          {roiGuarantee.isEligible ? (
            <p className="text-xs" style={{ color: roiGuarantee.roiAchieved ? "#5C8A3A" : "#7A6355" }}>
              CA sauvé sur 30 jours : <strong>{roiGuarantee.revenueSaved30d.toFixed(0)}€</strong> / {roiGuarantee.subscriptionCost}€
              {roiGuarantee.roiAchieved
                ? " — objectif atteint."
                : " — en dessous du seuil pour l'instant."}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "#B8A898" }}>
              {roiGuarantee.ineligibilityReason}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
