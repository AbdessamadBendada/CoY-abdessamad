import { describe, expect, it, vi } from "vitest";
import { createPrivacyExport } from "@/features/privacy/export";

const customer = {
  id: "customer-a", tenantId: "tenant-a", externalId: "shop-1", email: "buyer@example.test", firstName: "Buyer", lastName: null, phone: null,
  optedOutAt: new Date("2026-01-01"), createdAt: new Date(), updatedAt: new Date(), churnScore: 82, churnRisk: "HIGH", lastScoredAt: new Date(),
  orders: [{ id: "order-a", tenantId: "tenant-a", customerId: "customer-a", externalId: "o-1", source: "SHOPIFY", amount: 10, orderedAt: new Date() }],
  actions: [{ id: "action-a", tenantId: "tenant-a", customerId: "customer-a", type: "AUTOMATED", status: "SENT", subject: "Hello", content: "Message", channel: "EMAIL", scheduledAt: null, sentAt: null, deliveredAt: null, openedAt: null, clickedAt: null, createdAt: new Date() }],
  conversations: [{ id: "conversation-a", tenantId: "tenant-a", customerId: "customer-a", externalId: null, source: "IMPORT", subject: null, status: "CLOSED", sentimentScore: null, sentimentLabel: null, createdAt: new Date(), messages: [{ id: "message-a", content: "support message" }] }],
};

describe("privacy export", () => {
  it("exports only the matched tenant/customer profile, orders, action and conversation records", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "export-a" });
    const prisma = { customer: { findFirst: vi.fn().mockResolvedValue(customer) }, privacyExport: { upsert } };
    await createPrivacyExport(prisma as never, "tenant-a", "customer-a", "shopify:int:request");
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-a", tenantId: "tenant-a" } }));
    const payload = upsert.mock.calls[0][0].create.payload;
    expect(payload.customer).toMatchObject({ id: "customer-a", email: "buyer@example.test", optedOutAt: customer.optedOutAt, churnScore: 82 });
    expect(payload.orders).toHaveLength(1); expect(payload.winbackActions).toHaveLength(1); expect(payload.conversations[0].messages).toHaveLength(1);
    expect(JSON.stringify(payload)).not.toContain("tenant-b");
  });

  it("refuses a customer that is not in the requesting tenant", async () => {
    const prisma = { customer: { findFirst: vi.fn().mockResolvedValue(null) }, privacyExport: { upsert: vi.fn() } };
    await expect(createPrivacyExport(prisma as never, "tenant-a", "customer-b", "request")).rejects.toThrow("Customer not found in tenant");
  });
});
