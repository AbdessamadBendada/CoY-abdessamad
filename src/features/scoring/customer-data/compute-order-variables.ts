import type { PrismaClient } from "@prisma/client";

export interface OrderVariables {
  recentOrderAmounts: number[];
  returnRate: number | undefined;
}

/**
 * Calcule les variables comportementales basées sur l'historique des commandes.
 * Retourne des valeurs vides si aucune commande n'existe encore
 * (table vide tant que les webhooks Shopify/PrestaShop ne sont pas implémentés).
 *
 * @param db - client Prisma à utiliser (passer createJobsClient() pour éviter 42P05 PgBouncer)
 */
export async function computeOrderVariables(
  customerId: string,
  totalOrders: number,
  tenantId: string,
  db: PrismaClient
): Promise<OrderVariables> {
  if (totalOrders === 0) {
    return { recentOrderAmounts: [], returnRate: undefined };
  }

  const [recentOrders, returnCount] = await Promise.all([
    db.order.findMany({
      where: { customerId, tenantId },
      orderBy: { orderedAt: "desc" },
      take: 3,
      select: { amount: true },
    }),
    db.order.count({
      where: { customerId, tenantId, isReturn: true },
    }),
  ]);

  return {
    recentOrderAmounts: recentOrders.map((o) => parseFloat(o.amount.toString())),
    returnRate: returnCount / totalOrders,
  };
}
