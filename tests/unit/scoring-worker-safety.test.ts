import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ scoreConversation: vi.fn(), order: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/ai/agents", () => ({ scoreConversation: mocks.scoreConversation }));
vi.mock("@/lib/customers/compute-order-variables", () => ({ computeOrderVariables: mocks.order }));
vi.mock("@/lib/customers/compute-service-variables", () => ({ computeServiceVariables: mocks.service }));

import { processScoringCustomer } from "@/lib/jobs/score-customers";

const customer = {
  id: "customer-a", tenantId: "tenant-a", firstName: "Ada", lastName: "Lovelace", ltv: 100,
  totalOrders: 2, totalSpent: 100, lastOrderAt: new Date("2026-09-20"), churnScore: null,
  averageBasket: 50, createdAt: new Date("2026-01-01"), scoringAttempts: 0, tenant: { sector: "ECOMMERCE" },
};

describe("scoring worker claim and retry safety", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.order.mockResolvedValue({ recentOrderAmounts: [], returnRate: 0 });
    mocks.service.mockResolvedValue({});
  });

  it("does not call Mistral when another worker already holds the customer claim", async () => {
    const prisma = { customer: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } };
    await expect(processScoringCustomer(prisma as never, { customerId: "customer-a", tenantId: "tenant-a" }))
      .resolves.toBe("skipped");
    expect(mocks.scoreConversation).not.toHaveBeenCalled();
  });

  it("releases a rate-limited customer with a future retry instead of losing it", async () => {
    const updateMany = vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    const prisma = { customer: { updateMany, findFirst: vi.fn().mockResolvedValue(customer) } };
    mocks.scoreConversation.mockRejectedValue(new Error("Mistral 429 rate limit"));
    const now = new Date("2026-09-26T12:00:00Z");

    await expect(processScoringCustomer(prisma as never, { customerId: "customer-a", tenantId: "tenant-a" }, now))
      .resolves.toBe("retrying");
    expect(updateMany.mock.calls[1][0].data).toEqual(expect.objectContaining({
      scoringClaimedAt: null,
      scoringNextAttemptAt: new Date("2026-09-26T12:01:00Z"),
    }));
  });
});
