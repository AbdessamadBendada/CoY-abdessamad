import { createJobsClient } from "@/lib/prisma";
import { scoreConversation } from "@/lib/ai/agents";
import { computeOrderVariables } from "@/lib/customers/compute-order-variables";
import { computeServiceVariables } from "@/lib/customers/compute-service-variables";
import type { Prisma } from "@prisma/client";

// ─── Constantes ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 5;          // Max clients scorés par tenant par run
const RESCORE_DAYS = 7;        // Re-scorer si dernier scoring > 7 jours
const ACTIVE_ORDER_DAYS = 90;  // Ignorer les clients sans commande depuis 90j

// ─── runScoreCustomers ────────────────────────────────────────────────────────
//
// Score périodique des clients inactifs ou dont le dernier scoring date de > 7j.
// Appelé par le Trigger.dev scheduled task ET par /api/cron/score-customers.
// Utilise DIRECT_URL (port 5432) pour éviter les conflits PgBouncer 42P05.

export async function runScoreCustomers(): Promise<{ scored: number; errors: number }> {
  const prisma = createJobsClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - RESCORE_DAYS * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - ACTIVE_ORDER_DAYS * 24 * 60 * 60 * 1000);

  let totalScored = 0;
  let totalErrors = 0;

  try {
  const tenants = await prisma.tenant.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: { id: true, sector: true },
  });

  for (const tenant of tenants) {
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: tenant.id,
        lastOrderAt: { gte: ninetyDaysAgo },
        OR: [
          { cooldownUntil: null },
          { cooldownUntil: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { lastScoredAt: null },
              { lastScoredAt: { lt: sevenDaysAgo } },
            ],
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ltv: true,
        totalOrders: true,
        totalSpent: true,
        lastOrderAt: true,
        churnScore: true,
        averageBasket: true,
        createdAt: true,
      },
      take: BATCH_SIZE,
    });

    for (const customer of customers) {
      try {
        const nowMs = Date.now();
        const daysSinceLastOrder = customer.lastOrderAt
          ? Math.floor((nowMs - customer.lastOrderAt.getTime()) / 86400000)
          : undefined;
        const monthsSinceCreation = Math.max(
          1,
          (nowMs - customer.createdAt.getTime()) / (30 * 86400000)
        );
        const orderFrequencyPerMonth =
          customer.totalOrders > 0
            ? Math.round((customer.totalOrders / monthsSinceCreation) * 100) / 100
            : undefined;

        const [{ recentOrderAmounts, returnRate }, serviceVars] = await Promise.all([
          computeOrderVariables(customer.id, customer.totalOrders, tenant.id, prisma),
          computeServiceVariables(customer.id, tenant.id, prisma),
        ]);

        const result = await scoreConversation([], {
          firstName: customer.firstName,
          lastName: customer.lastName,
          ltv: parseFloat(customer.ltv.toString()),
          totalOrders: customer.totalOrders,
          totalSpent: parseFloat(customer.totalSpent.toString()),
          lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
          previousChurnScore: customer.churnScore,
          tenantSector: tenant.sector,
          averageBasket:
            customer.averageBasket != null
              ? parseFloat(customer.averageBasket.toString())
              : undefined,
          daysSinceLastOrder,
          orderFrequencyPerMonth,
          recentOrderAmounts: recentOrderAmounts.length > 0 ? recentOrderAmounts : undefined,
          returnRate,
          ...serviceVars,
        });

        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            churnScore: result.churnScore,
            churnRisk: result.churnRisk,
            lastScoredAt: now,
            scoringDetails: {
              sentimentScore: result.sentimentScore,
              sentimentLabel: result.sentimentLabel,
              triggers: result.triggers,
              reasoning: result.reasoning,
              aiModelUsed: result.aiModelUsed,
              scoredAt: now.toISOString(),
              source: "CRON",
            } as Prisma.InputJsonValue,
          },
        });

        await prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "SCORING_COMPLETED",
            entityType: "Customer",
            entityId: customer.id,
            details: {
              source: "CRON_SCORE_CUSTOMERS",
              churnScore: result.churnScore,
              churnRisk: result.churnRisk,
              aiModelUsed: result.aiModelUsed,
            } as Prisma.InputJsonValue,
          },
        });

        totalScored++;
      } catch (err) {
        console.error(`[job/score-customers] Erreur scoring client ${customer.id}:`, err);
        totalErrors++;
      }
    }
  }

  console.log(`[job/score-customers] ${totalScored} client(s) scoré(s), ${totalErrors} erreur(s)`);
  return { scored: totalScored, errors: totalErrors };
  } finally {
    await prisma.$disconnect();
  }
}
