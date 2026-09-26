import { prisma } from "@/shared/db/prisma";
import { PLANS } from "@/config/plans";
import { HELPDESK_TYPES, ECOMMERCE_TYPES } from "@/features/auth/onboarding";

// Palier unique CoY (Plan A) — garantie ROI 2 mois maximum offerts (plafond
// guaranteeExtensionCount ≤ 2), octroi manuel. Seuil fixe 899 € HT (prix COY).
const SUBSCRIPTION_COST_EUR = PLANS.coy.price_monthly / 100;
const MAX_GUARANTEE_EXTENSIONS = 2;
const MIN_ACTIONS_FOR_ELIGIBILITY = 10;
const GUARANTEE_WINDOW_DAYS = 30;

export interface ROIGuaranteeResult {
  /** Le tenant remplit les critères d'éligibilité (1 helpdesk + 1 e-commerce actives,
   * ≥10 actions/30j, status ACTIVE, plafond d'extensions non atteint) */
  isEligible: boolean;
  /** CA sauvé (status CONVERTED) sur les 30 derniers jours, en EUR */
  revenueSaved30d: number;
  /** Coût mensuel du plan CoY, en EUR (899) */
  subscriptionCost: number;
  /** true si revenueSaved30d ≥ subscriptionCost */
  roiAchieved: boolean;
  /** Nombre d'extensions déjà accordées (plafond 2) */
  guaranteeExtensionCount: number;
  /** Raison de non-éligibilité (si isEligible = false) */
  ineligibilityReason?: string;
}

/**
 * SECURITY: tenantId MUST come from requireAuth().tenant.id.
 * Never pass a tenantId sourced from req.query / req.body / route params directly.
 */
export async function checkROIGuarantee(tenantId: string): Promise<ROIGuaranteeResult> {
  const windowStart = new Date(Date.now() - GUARANTEE_WINDOW_DAYS * 24 * 3600 * 1000);

  const [tenant, integrations, recentActionsCount, revenueSavedAgg] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, status: true, guaranteeExtensionCount: true },
    }),
    prisma.integration.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { type: true },
    }),
    prisma.winbackAction.count({
      where: { tenantId, createdAt: { gte: windowStart } },
    }),
    prisma.winbackAction.aggregate({
      where: {
        tenantId,
        status: "CONVERTED",
        convertedAt: { gte: windowStart },
      },
      _sum: { convertedValue: true },
    }),
  ]);

  if (!tenant) {
    return {
      isEligible: false,
      revenueSaved30d: 0,
      subscriptionCost: SUBSCRIPTION_COST_EUR,
      roiAchieved: false,
      guaranteeExtensionCount: 0,
      ineligibilityReason: "Garantie indisponible",
    };
  }

  const revenueSaved30d =
    Math.round(Number(revenueSavedAgg._sum.convertedValue ?? 0) * 100) / 100;

  const base = {
    revenueSaved30d,
    subscriptionCost: SUBSCRIPTION_COST_EUR,
    roiAchieved: revenueSaved30d >= SUBSCRIPTION_COST_EUR,
    guaranteeExtensionCount: tenant.guaranteeExtensionCount,
  };

  if (tenant.plan !== "COY") {
    return { ...base, isEligible: false, ineligibilityReason: "Garantie ROI non applicable sur ce plan" };
  }

  if (tenant.status !== "ACTIVE") {
    return { ...base, isEligible: false, ineligibilityReason: "Garantie ROI applicable uniquement aux abonnements actifs" };
  }

  if (tenant.guaranteeExtensionCount >= MAX_GUARANTEE_EXTENSIONS) {
    return { ...base, isEligible: false, ineligibilityReason: "Plafond de la garantie déjà atteint" };
  }

  const hasHelpdesk = integrations.some((i) => HELPDESK_TYPES.includes(i.type));
  const hasEcommerce = integrations.some((i) => ECOMMERCE_TYPES.includes(i.type));

  if (!hasHelpdesk || !hasEcommerce) {
    return {
      ...base,
      isEligible: false,
      ineligibilityReason: "Au moins une intégration helpdesk et une intégration e-commerce actives sont requises",
    };
  }

  if (recentActionsCount < MIN_ACTIONS_FOR_ELIGIBILITY) {
    return {
      ...base,
      isEligible: false,
      ineligibilityReason: `Moins de ${MIN_ACTIONS_FOR_ELIGIBILITY} actions envoyées sur les 30 derniers jours (${recentActionsCount} envoyée${recentActionsCount > 1 ? "s" : ""})`,
    };
  }

  return { ...base, isEligible: true };
}
