import type { PrismaClient } from "@prisma/client";

export interface ServiceVariables {
  conversations30d: number;
  unresolvedCount: number;
  avgResolutionTimeHours: number | undefined;
}

/**
 * Calcule les variables de service client depuis la table Conversation.
 * Retourne des valeurs null-safe si aucune conversation n'existe.
 * avgResolutionTimeHours n'est calculé que si closedAt est renseigné (webhook Gorgias).
 *
 * @param db - client Prisma à utiliser (passer createJobsClient() pour éviter 42P05 PgBouncer)
 */
export async function computeServiceVariables(
  customerId: string,
  tenantId: string,
  db: PrismaClient
): Promise<ServiceVariables> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [conversations30d, unresolvedCount, closedConversations] =
    await Promise.all([
      db.conversation.count({
        where: { customerId, tenantId, createdAt: { gte: thirtyDaysAgo } },
      }),
      db.conversation.count({
        where: { customerId, tenantId, status: "OPEN" },
      }),
      db.conversation.findMany({
        where: { customerId, tenantId, closedAt: { not: null } },
        select: { createdAt: true, closedAt: true },
        take: 20,
      }),
    ]);

  let avgResolutionTimeHours: number | undefined;
  if (closedConversations.length > 0) {
    const totalHours = closedConversations.reduce((sum, c) => {
      const diffMs = c.closedAt!.getTime() - c.createdAt.getTime();
      return sum + diffMs / 3_600_000;
    }, 0);
    avgResolutionTimeHours =
      Math.round((totalHours / closedConversations.length) * 10) / 10;
  }

  return { conversations30d, unresolvedCount, avgResolutionTimeHours };
}
