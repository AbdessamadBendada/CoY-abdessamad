import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFindMany: vi.fn(),
  customerFindMany: vi.fn(),
  disconnect: vi.fn(),
  scoreConversation: vi.fn(),
  computeOrderVariables: vi.fn(),
  computeServiceVariables: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  createJobsClient: () => ({
    tenant: { findMany: mocks.tenantFindMany },
    customer: { findMany: mocks.customerFindMany },
    $disconnect: mocks.disconnect,
  }),
}));
vi.mock("@/lib/ai/agents", () => ({ scoreConversation: mocks.scoreConversation }));
vi.mock("@/lib/customers/compute-order-variables", () => ({
  computeOrderVariables: mocks.computeOrderVariables,
}));
vi.mock("@/lib/customers/compute-service-variables", () => ({
  computeServiceVariables: mocks.computeServiceVariables,
}));

import { BATCH_SIZE, RESCORE_DAYS, runScoreCustomers } from "@/lib/jobs/score-customers";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.tenantFindMany.mockResolvedValue([{ id: "tenant-a", sector: "ECOMMERCE" }]);
  mocks.customerFindMany.mockResolvedValue([]);
  mocks.disconnect.mockResolvedValue(undefined);
});

describe("current customer scoring selection", () => {
  it("locks the current BATCH_SIZE at 5", () => {
    expect(BATCH_SIZE).toBe(5);
  });

  it("locks the current RESCORE_DAYS at 7", () => {
    expect(RESCORE_DAYS).toBe(7);
  });

  it("selects at most five eligible customers per tenant and scopes the query", async () => {
    const before = Date.now();

    const result = await runScoreCustomers();

    const after = Date.now();
    expect(result).toEqual({ scored: 0, errors: 0 });
    expect(mocks.tenantFindMany).toHaveBeenCalledWith({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, sector: true },
    });
    expect(mocks.customerFindMany).toHaveBeenCalledOnce();
    const query = mocks.customerFindMany.mock.calls[0][0];
    expect(query.take).toBe(5);
    expect(query.where.tenantId).toBe("tenant-a");

    const cutoff = query.where.AND[0].OR[1].lastScoredAt.lt as Date;
    const expectedMin = before - 7 * 24 * 60 * 60 * 1000;
    const expectedMax = after - 7 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax);
  });
});
