import type { Prisma } from "@prisma/client";
import { SECTOR_MODE, SECTOR_SPORT, SECTOR_DECORATION } from "@/config/sectors";

// ─── Multiplicateurs LTV par secteur (ADR-018 — business-metrics.md) ─────────
// Utilisé pour projeter la valeur d'un client récupéré au-delà de la commande immédiate.
// Source : Business Plan V3.1 + ADR-018 (DECISIONS.md) — 3 verticales prioritaires.
// Changement de base de calcul (round 3, chantier B) : la clé "Sport" ne matchait jamais
// le libellé canonique "Sport & Outdoor", donc un tenant Sport recevait 1,7x (défaut) au
// lieu de 2,2x. Corrigé ici — cf. CHANGELOG.md pour la date d'effet.

const DEFAULT_LTV_MULTIPLIER = 1.7;

const SECTOR_LTV_MULTIPLIERS: Record<string, number> = {
  [SECTOR_SPORT]: 2.2,
  [SECTOR_MODE]: 1.8,
  [SECTOR_DECORATION]: 1.8,
};

function getLtvMultiplier(sector?: string | null): number {
  if (!sector) return DEFAULT_LTV_MULTIPLIER;
  return Object.hasOwn(SECTOR_LTV_MULTIPLIERS, sector)
    ? SECTOR_LTV_MULTIPLIERS[sector]
    : DEFAULT_LTV_MULTIPLIER;
}

// ─── Fenêtre d'attribution ────────────────────────────────────────────────────

const ATTRIBUTION_WINDOW_DAYS = 30;

// ─── checkAttribution ─────────────────────────────────────────────────────────
//
// Appelé dans la transaction Shopify/PrestaShop lors d'un `orders/create` réel.
// Si le client avait une action WinBack en cours (SENT/OPENED/CLICKED) dans les
// 30 derniers jours, la marque CONVERTED et calcule le CA récupéré.
//
// Doit être appelé DANS une $transaction pour garantir l'atomicité.

export async function checkAttribution(
  customerId: string,
  orderAmount: number,
  isReturn: boolean,
  tx: Prisma.TransactionClient,
  tenantSector?: string | null
): Promise<void> {
  // Les retours/remboursements ne génèrent pas de conversion
  if (isReturn || orderAmount <= 0) return;

  const windowStart = new Date(
    Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000
  );

  // Chercher l'action la plus récente éligible (SENT, OPENED ou CLICKED)
  const pendingAction = await tx.winbackAction.findFirst({
    where: {
      customerId,
      status: { in: ["SENT", "OPENED", "CLICKED"] },
      sentAt: { gte: windowStart },
    },
    orderBy: { sentAt: "desc" },
    select: { id: true },
  });

  if (!pendingAction) return;

  // CA récupéré = montant commande × multiplicateur LTV sectoriel (ADR-018)
  const convertedValue = Math.round(orderAmount * getLtvMultiplier(tenantSector) * 100) / 100;

  await tx.winbackAction.update({
    where: { id: pendingAction.id },
    data: {
      status: "CONVERTED",
      convertedAt: new Date(),
      convertedValue,
    },
  });
}
