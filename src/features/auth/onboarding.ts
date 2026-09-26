import { prisma } from "@/shared/db/prisma";
import { IntegrationType, IntegrationStatus } from "@prisma/client";

// Exportés pour réutilisation (ex: src/lib/billing/roi-guarantee.ts — éligibilité
// garantie ROI, mêmes catégories que l'onboarding).
export const HELPDESK_TYPES: IntegrationType[] = [
  IntegrationType.GORGIAS,
  IntegrationType.CRISP,
];

export const ECOMMERCE_TYPES: IntegrationType[] = [
  IntegrationType.SHOPIFY,
  IntegrationType.PRESTASHOP,
  IntegrationType.WOOCOMMERCE,
];

export type OnboardingStatus = {
  dpaSigné: boolean;
  activePendingDpa: boolean; // intégrations connectées mais DPA non signé
  helpdeskConnecté: boolean;
  boutiqueConnectée: boolean;
  clientsAnalysés: boolean;
  étapeActuelle: 1 | 2 | 3 | 4;
  estComplet: boolean;
};

export async function getOnboardingStatus(
  tenantId: string,
  dpaSignedAt: Date | null
): Promise<OnboardingStatus> {
  // dpaSignedAt vient de user.tenant — pas de requête Prisma supplémentaire
  // Fetch en parallèle pour minimiser la latence
  const [integrations, clientCount] = await Promise.all([
    prisma.integration.findMany({
      where: { tenantId },
      select: { type: true, status: true },
    }),
    prisma.customer.count({
      where: { tenantId },
    }),
  ]);


  const dpaSigné = dpaSignedAt !== null;

  const helpdeskConnecté = integrations.some(
    (i) =>
      HELPDESK_TYPES.includes(i.type) &&
      i.status === IntegrationStatus.ACTIVE
  );

  const boutiqueConnectée = integrations.some(
    (i) =>
      ECOMMERCE_TYPES.includes(i.type) &&
      i.status === IntegrationStatus.ACTIVE
  );

  const clientsAnalysés = clientCount > 0;

  // étapeActuelle suit uniquement les intégrations — DPA ne bloque plus la progression
  let étapeActuelle: 1 | 2 | 3 | 4 = 1;
  if (!helpdeskConnecté) étapeActuelle = 1;
  else if (!boutiqueConnectée) étapeActuelle = 2;
  else if (!clientsAnalysés) étapeActuelle = 3;
  else étapeActuelle = 4;

  // DPA obligatoire avant envoi d'actions et facturation — bandeau affiché si non signé
  const activePendingDpa = !dpaSigné;

  return {
    dpaSigné,
    activePendingDpa,
    helpdeskConnecté,
    boutiqueConnectée,
    clientsAnalysés,
    étapeActuelle,
    estComplet: dpaSigné && helpdeskConnecté && boutiqueConnectée && clientsAnalysés,
  };
}
