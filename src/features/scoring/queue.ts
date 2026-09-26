import type { Prisma, PrismaClient } from "@prisma/client";
import { createJobsClient } from "@/shared/db/prisma";
import { scoreConversation } from "@/features/scoring/ai/agents";
import { computeOrderVariables } from "@/features/scoring/customer-data/compute-order-variables";
import { computeServiceVariables } from "@/features/scoring/customer-data/compute-service-variables";
import { backgroundProcessing, retryAt } from "@/shared/config/background-processing";
import { rotateAfter, roundRobin } from "@/features/scoring/fair-dispatch";
import { log, operationalAlert, reportError } from "@/shared/observability/logger";

export const RESCORE_DAYS = backgroundProcessing.rescoreDays;
export const BATCH_SIZE = backgroundProcessing.scoringBatchPerTenant;

export type ScoringCandidate = { id: string; tenantId: string; lastScoredAt: Date | null };
export type ScoringDispatchResult = {
  candidates: ScoringCandidate[];
  tenantCount: number;
  oldestEligibleAt: Date | null;
};

function eligibleCustomerWhere(tenantId: string, now: Date): Prisma.CustomerWhereInput {
  const rescoreCutoff = new Date(now.getTime() - RESCORE_DAYS * 86_400_000);
  const activeOrderCutoff = new Date(now.getTime() - backgroundProcessing.activeOrderDays * 86_400_000);
  const expiredClaim = new Date(now.getTime() - backgroundProcessing.claimLeaseMinutes * 60_000);
  return {
    tenantId,
    lastOrderAt: { gte: activeOrderCutoff },
    OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
    AND: [
      { OR: [{ lastScoredAt: null }, { lastScoredAt: { lt: rescoreCutoff } }] },
      { OR: [{ scoringNextAttemptAt: null }, { scoringNextAttemptAt: { lte: now } }] },
      { OR: [{ scoringClaimedAt: null }, { scoringClaimedAt: { lte: expiredClaim } }] },
    ],
  };
}

async function logScoringBacklog(prisma: PrismaClient, now: Date) {
  const rescoreCutoff = new Date(now.getTime() - RESCORE_DAYS * 86_400_000);
  const activeOrderCutoff = new Date(now.getTime() - backgroundProcessing.activeOrderDays * 86_400_000);
  const expiredClaim = new Date(now.getTime() - backgroundProcessing.claimLeaseMinutes * 60_000);
  const byTenant = await prisma.customer.groupBy({
    by: ["tenantId"],
    where: {
      tenant: { status: { in: ["ACTIVE", "TRIAL"] } }, lastOrderAt: { gte: activeOrderCutoff },
      OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
      AND: [
        { OR: [{ lastScoredAt: null }, { lastScoredAt: { lt: rescoreCutoff } }] },
        { OR: [{ scoringNextAttemptAt: null }, { scoringNextAttemptAt: { lte: now } }] },
        { OR: [{ scoringClaimedAt: null }, { scoringClaimedAt: { lte: expiredClaim } }] },
      ],
    },
    _count: { _all: true }, _min: { lastScoredAt: true },
  });
  const waiting = byTenant.reduce((total, row) => total + row._count._all, 0);
  const oldestEligibleAt = byTenant.reduce<Date | null>((oldest, row) =>
    row._min.lastScoredAt && (!oldest || row._min.lastScoredAt < oldest) ? row._min.lastScoredAt : oldest, null);
  log("info", "scoring.backlog", { waiting, oldestEligibleAt: oldestEligibleAt?.toISOString() ?? null,
    tenantBacklog: byTenant.sort((a, b) => b._count._all - a._count._all).slice(0, 10)
      .map((row) => ({ tenantId: row.tenantId, waiting: row._count._all })) });
  if (waiting >= backgroundProcessing.backlogAlertThreshold) {
    operationalAlert("warning", "scoring.backlog_threshold_exceeded", { waiting, threshold: backgroundProcessing.backlogAlertThreshold });
  }
}

/** Bounded, rotating, round-robin selection. Never-scored customers come first. */
export async function dispatchScoreCustomers(
  prisma: PrismaClient,
  now = new Date(),
): Promise<ScoringDispatchResult> {
  const [cursor, tenants] = await Promise.all([
    prisma.backgroundCursor.findUnique({ where: { key: "scoring" } }),
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
  ]);
  const window = rotateAfter(tenants, cursor?.value ?? null, backgroundProcessing.tenantWindow);
  if (window.length === 0) return { candidates: [], tenantCount: 0, oldestEligibleAt: null };
  await prisma.backgroundCursor.upsert({
    where: { key: "scoring" },
    create: { key: "scoring", value: window.at(-1)?.id },
    update: { value: window.at(-1)?.id },
  });

  const perTenant = await Promise.all(window.map(async ({ id: tenantId }) => ({
    tenantId,
    items: await prisma.customer.findMany({
      where: eligibleCustomerWhere(tenantId, now),
      select: { id: true, tenantId: true, lastScoredAt: true },
      orderBy: [{ lastScoredAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
      take: BATCH_SIZE,
    }),
  })));
  const candidates = roundRobin(perTenant, backgroundProcessing.scoringDispatchLimit);
  const oldestEligibleAt = candidates.reduce<Date | null>(
    (oldest, item) => item.lastScoredAt && (!oldest || item.lastScoredAt < oldest) ? item.lastScoredAt : oldest,
    null,
  );
  log("info", "scoring.dispatch", {
    tenantsVisited: window.length, candidates: candidates.length, oldestEligibleAt: oldestEligibleAt?.toISOString() ?? null,
  });
  await logScoringBacklog(prisma, now);
  return { candidates, tenantCount: window.length, oldestEligibleAt };
}

function retryableAiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|5\d\d)\b|rate.?limit|timeout|timed out|network|fetch failed/i.test(message);
}

/** Atomically claims and scores one customer; duplicate Trigger.dev runs skip. */
export async function processScoringCustomer(
  prisma: PrismaClient,
  input: { customerId: string; tenantId: string },
  now = new Date(),
): Promise<"scored" | "skipped" | "retrying" | "failed"> {
  const claim = await prisma.customer.updateMany({
    where: { id: input.customerId, ...eligibleCustomerWhere(input.tenantId, now) },
    data: { scoringClaimedAt: now, scoringAttempts: { increment: 1 } },
  });
  if (claim.count === 0) return "skipped";

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId: input.tenantId },
    include: { tenant: { select: { sector: true } } },
  });
  if (!customer) return "skipped";
  try {
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor((now.getTime() - customer.lastOrderAt.getTime()) / 86_400_000) : undefined;
    const monthsSinceCreation = Math.max(1, (now.getTime() - customer.createdAt.getTime()) / (30 * 86_400_000));
    const orderFrequencyPerMonth = customer.totalOrders > 0
      ? Math.round((customer.totalOrders / monthsSinceCreation) * 100) / 100 : undefined;
    const [{ recentOrderAmounts, returnRate }, serviceVars] = await Promise.all([
      computeOrderVariables(customer.id, customer.totalOrders, input.tenantId, prisma),
      computeServiceVariables(customer.id, input.tenantId, prisma),
    ]);
    const result = await scoreConversation([], {
      firstName: customer.firstName, lastName: customer.lastName, ltv: Number(customer.ltv),
      totalOrders: customer.totalOrders, totalSpent: Number(customer.totalSpent),
      lastOrderAt: customer.lastOrderAt?.toISOString() ?? null, previousChurnScore: customer.churnScore,
      tenantSector: customer.tenant.sector,
      averageBasket: customer.averageBasket != null ? Number(customer.averageBasket) : undefined,
      daysSinceLastOrder, orderFrequencyPerMonth,
      recentOrderAmounts: recentOrderAmounts.length ? recentOrderAmounts : undefined, returnRate, ...serviceVars,
    });
    await prisma.$transaction([
      prisma.customer.update({ where: { id: customer.id }, data: {
        churnScore: result.churnScore, churnRisk: result.churnRisk, lastScoredAt: now,
        scoringClaimedAt: null, scoringAttempts: 0, scoringNextAttemptAt: null, scoringLastError: null,
        scoringDetails: { sentimentScore: result.sentimentScore, sentimentLabel: result.sentimentLabel,
          triggers: result.triggers, reasoning: result.reasoning, aiModelUsed: result.aiModelUsed,
          scoredAt: now.toISOString(), source: "BACKGROUND_WORKER" } as Prisma.InputJsonValue,
      }}),
      prisma.auditLog.create({ data: { tenantId: input.tenantId, action: "SCORING_COMPLETED",
        entityType: "Customer", entityId: customer.id,
        details: { source: "BACKGROUND_WORKER", churnScore: result.churnScore } as Prisma.InputJsonValue }}),
    ]);
    return "scored";
  } catch (error) {
    const attempts = customer.scoringAttempts + 1;
    const retrying = retryableAiError(error) && attempts < backgroundProcessing.scoringMaxAttempts;
    await prisma.customer.updateMany({
      where: { id: input.customerId, tenantId: input.tenantId, scoringClaimedAt: now },
      data: { scoringClaimedAt: null,
        scoringNextAttemptAt: retrying ? retryAt(attempts, now) : new Date(now.getTime() + RESCORE_DAYS * 86_400_000),
        scoringLastError: (error instanceof Error ? error.message : String(error)).slice(0, 500) },
    });
    reportError("scoring.worker_failed", error, { customerId: input.customerId, tenantId: input.tenantId, retrying, attempts });
    return retrying ? "retrying" : "failed";
  }
}

async function runWithConcurrency<T>(items: T[], concurrency: number, run: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await run(items[next++]);
  }));
}

/** Manual/cron fallback. Trigger.dev uses the same fair dispatcher with isolated workers. */
export async function runScoreCustomers(): Promise<{ scored: number; errors: number; queued: number }> {
  const prisma = createJobsClient();
  try {
    const dispatch = await dispatchScoreCustomers(prisma);
    let scored = 0; let errors = 0;
    await runWithConcurrency(dispatch.candidates, backgroundProcessing.scoringConcurrency, async (candidate) => {
      const result = await processScoringCustomer(prisma, { customerId: candidate.id, tenantId: candidate.tenantId });
      if (result === "scored") scored++;
      if (result === "failed") errors++;
    });
    return { scored, errors, queued: dispatch.candidates.length };
  } finally { await prisma.$disconnect(); }
}
