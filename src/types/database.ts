// Types générés par Prisma — ce fichier sert de pont
// Les vrais types viendront de @prisma/client après le premier migrate

export type TenantPlan = "essentiel" | "starter" | "croissance" | "expert" | "coy" | "trial";
export type TenantStatus = "trial" | "active" | "past_due" | "cancelled" | "suspended";
export type IntegrationType = "gorgias" | "shopify" | "prestashop";
export type IntegrationStatus = "pending" | "active" | "error" | "disconnected";
export type ActionType = "email" | "sms" | "promo_code" | "escalation";
export type ActionStatus = "pending" | "sent" | "delivered" | "opened" | "clicked" | "converted" | "failed";
export type ChurnRiskLevel = "low" | "medium" | "high" | "critical";

export interface TenantQuotas {
  customers_limit: number;
  actions_limit: number;
  emails_limit: number;
  sms_limit: number;
  integrations_limit: number;
}

export const PLAN_QUOTAS: Record<TenantPlan, TenantQuotas> = {
  essentiel: {
    // @deprecated 2026-09-05 — palier unique CoY, conservé pour compatibilité données
    customers_limit: 1_000,
    actions_limit: 100,
    emails_limit: 500,
    sms_limit: 0,
    integrations_limit: 2, // 1 Helpdesk + 1 E-commerce (source: limit-quotas.md v3.0)
  },
  starter: {
    // @deprecated 2026-09-05 — idem
    customers_limit: 2_500,
    actions_limit: 250,
    emails_limit: 1_500,
    sms_limit: 50,
    integrations_limit: 2,
  },
  croissance: {
    // @deprecated 2026-09-05 — idem
    customers_limit: 6_000,
    actions_limit: 750,
    emails_limit: 5_000,
    sms_limit: 200,
    integrations_limit: 4,
  },
  expert: {
    // @deprecated 2026-09-05 — idem
    customers_limit: 15_000,
    actions_limit: 2_500,
    emails_limit: 15_000,
    sms_limit: -1, // illimité
    integrations_limit: -1, // illimité
  },
  coy: {
    // Palier unique CoY, 899€/mois — Plan A (05/09/2026)
    customers_limit: 10_000,
    actions_limit: 1_500,
    emails_limit: 15_000,
    sms_limit: 350,
    integrations_limit: -1, // illimité
  },
  trial: {
    // Identique à coy, sauf SMS : 0 pendant les 21 jours d'essai (décision Plan A)
    customers_limit: 10_000,
    actions_limit: 1_500,
    emails_limit: 15_000,
    sms_limit: 0,
    integrations_limit: -1,
  },
};

// Repli fail-closed pour un `plan` qui ne valide plus contre `toTenantPlan` —
// jamais un plan réel, donc tout à 0. Sert de garde-fou défensif ; en usage
// normal `toTenantPlan` ne renvoie que des clés déjà présentes dans PLAN_QUOTAS.
export const RESTRICTIVE_QUOTAS: TenantQuotas = {
  customers_limit: 0,
  actions_limit: 0,
  emails_limit: 0,
  sms_limit: 0,
  integrations_limit: 0,
};

/**
 * Résout le plan effectif d'un tenant pour l'indexation dans PLAN_QUOTAS.
 * `status === "TRIAL"` prime sur le plan souscrit — un tenant en essai n'a
 * jamais accès au SMS, même si `plan` vaut déjà COY en base (ADR Plan A).
 * Lève sur toute valeur de `plan` inconnue plutôt que de dégrader en silence.
 */
export function toTenantPlan(plan: string, status: string): TenantPlan {
  if (status === "TRIAL") return "trial";
  if (status !== "ACTIVE" && status !== "PAST_DUE") {
    throw new Error(`[toTenantPlan] statut tenant non actif: ${status}`);
  }
  const key = plan.toLowerCase();
  if (key === "coy" || key === "essentiel" || key === "starter" || key === "croissance" || key === "expert") {
    return key as TenantPlan;
  }
  throw new Error(`[toTenantPlan] valeur de plan inconnue: ${plan}`);
}
