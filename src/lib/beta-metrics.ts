import { prisma, createJobsClient } from "@/lib/prisma";

// ─── C2 — Baseline population (upsert au premier sync) ───────────────────────
//
// À appeler en fire-and-forget après la première sync Shopify ou PrestaShop.
// Vérifie l'existence avant de créer — idempotent, ne crashe jamais.

export async function populateBetaMetricsBaseline(tenantId: string): Promise<void> {
  const db = createJobsClient();
  try {
    const existing = await db.betaMetrics.findUnique({
      where: { tenantId },
      select: { id: true },
    });
    if (existing) return;

    const now = new Date();

    const [totalCustomers, aovResult, repeatCustomers, tenant] = await Promise.all([
      db.customer.count({ where: { tenantId } }),
      db.customer.aggregate({
        where: { tenantId, totalOrders: { gt: 0 } },
        _avg: { averageBasket: true, ltv: true },
      }),
      db.customer.count({ where: { tenantId, totalOrders: { gt: 1 } } }),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { sector: true, name: true },
      }),
    ]);

    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    await db.betaMetrics.upsert({
      where: { tenantId },
      create: {
        tenantId,
        baselineDate: now,
        baselineTotalCustomers: totalCustomers,
        baselineAov: aovResult._avg.averageBasket
          ? parseFloat(aovResult._avg.averageBasket.toString())
          : null,
        baselineLtvAvg: aovResult._avg.ltv
          ? parseFloat(aovResult._avg.ltv.toString())
          : null,
        baselineRepeatRate: repeatRate,
        vertical: tenant?.sector ?? null,
        brandName: tenant?.name ?? null,
      },
      update: {},
    });

    console.log(`[beta-metrics] Baseline créé — tenant ${tenantId}: ${totalCustomers} clients, AOV ${aovResult._avg.averageBasket?.toString() ?? "N/A"}€`);
  } catch (err) {
    console.warn(`[beta-metrics] populateBetaMetricsBaseline échoué pour ${tenantId}:`, err);
  } finally {
    await db.$disconnect();
  }
}

// ─── C3 — Fonctions d'incrémentation ─────────────────────────────────────────
//
// Chacune : atomic increment sur betaMetrics. Si l'entrée n'existe pas (baseline
// non encore créé), log warning sans crasher.

export async function incrementFlaggedAtRisk(tenantId: string): Promise<void> {
  try {
    await prisma.betaMetrics.update({
      where: { tenantId },
      data: { customersFlaggedAtRisk: { increment: 1 } },
    });
  } catch {
    console.warn(`[beta-metrics] incrementFlaggedAtRisk: aucune entrée pour ${tenantId}`);
  }
}

export async function incrementActionSent(tenantId: string): Promise<void> {
  try {
    await prisma.betaMetrics.update({
      where: { tenantId },
      data: { actionsSent: { increment: 1 } },
    });
  } catch {
    console.warn(`[beta-metrics] incrementActionSent: aucune entrée pour ${tenantId}`);
  }
}

export async function incrementActionOpened(tenantId: string): Promise<void> {
  try {
    await prisma.betaMetrics.update({
      where: { tenantId },
      data: { actionsOpened: { increment: 1 } },
    });
  } catch {
    console.warn(`[beta-metrics] incrementActionOpened: aucune entrée pour ${tenantId}`);
  }
}

export async function incrementActionClicked(tenantId: string): Promise<void> {
  try {
    await prisma.betaMetrics.update({
      where: { tenantId },
      data: { actionsClicked: { increment: 1 } },
    });
  } catch {
    console.warn(`[beta-metrics] incrementActionClicked: aucune entrée pour ${tenantId}`);
  }
}

export async function incrementRecovered(tenantId: string, amount: number): Promise<void> {
  try {
    await prisma.betaMetrics.update({
      where: { tenantId },
      data: {
        customersRecovered: { increment: 1 },
        revenueRecovered: { increment: amount },
      },
    });
  } catch {
    console.warn(`[beta-metrics] incrementRecovered: aucune entrée pour ${tenantId}`);
  }
}
