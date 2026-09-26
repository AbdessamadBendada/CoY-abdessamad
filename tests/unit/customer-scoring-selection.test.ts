import { describe, expect, it, vi } from "vitest";
import { BATCH_SIZE, RESCORE_DAYS, dispatchScoreCustomers } from "@/features/scoring/queue";

function scoringPrisma(customersByTenant: Record<string, number>) {
  return {
    backgroundCursor: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
    tenant: { findMany: vi.fn().mockResolvedValue(Object.keys(customersByTenant).map((id) => ({ id }))) },
    customer: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockImplementation(({ where, take }) => {
        const tenantId = where.tenantId as string;
        return Array.from({ length: Math.min(customersByTenant[tenantId], take) }, (_, index) => ({
          id: `${tenantId}-${index + 1}`, tenantId, lastScoredAt: null,
        }));
      }),
    },
  };
}

describe("scalable customer scoring selection", () => {
  it("keeps the seven-day rescore meaning but removes the five-customer daily cap", () => {
    expect(RESCORE_DAYS).toBe(7);
    expect(BATCH_SIZE).toBeGreaterThan(5);
  });

  it("interleaves tenant work so a large tenant cannot occupy the worker queue", async () => {
    const prisma = scoringPrisma({ "tenant-a": 20_000, "tenant-b": 800, "tenant-c": 5_000 });
    const result = await dispatchScoreCustomers(prisma as never, new Date("2026-09-26T12:00:00Z"));

    expect(result.candidates.length).toBe(30);
    expect(result.candidates.slice(0, 9).map((candidate) => candidate.tenantId)).toEqual([
      "tenant-a", "tenant-b", "tenant-c", "tenant-a", "tenant-b", "tenant-c", "tenant-a", "tenant-b", "tenant-c",
    ]);
  });

  it("selects only eligible, unclaimed or expired-claim work", async () => {
    const prisma = scoringPrisma({ "tenant-a": 1 });
    await dispatchScoreCustomers(prisma as never, new Date("2026-09-26T12:00:00Z"));
    const query = prisma.customer.findMany.mock.calls[0][0];
    expect(query.where.tenantId).toBe("tenant-a");
    expect(query.where.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({ OR: expect.arrayContaining([{ scoringNextAttemptAt: null }]) }),
      expect.objectContaining({ OR: expect.arrayContaining([{ scoringClaimedAt: null }]) }),
    ]));
  });
});
