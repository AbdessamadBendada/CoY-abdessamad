import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSubscription: vi.fn(),
  webhookCreate: vi.fn(),
  webhookFindUnique: vi.fn(),
  webhookUpdateMany: vi.fn(),
  webhookUpdate: vi.fn(),
  webhookDelete: vi.fn(),
  tenantFindUnique: vi.fn(),
  tenantUpdateMany: vi.fn(),
  tenantUpdate: vi.fn(),
  auditCreate: vi.fn(),
  createSetupFee: vi.fn(),
  sendSystemEmail: vi.fn(),
}));

vi.mock("@/features/billing/stripe/client", () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.retrieveSubscription },
  },
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      create: mocks.webhookCreate,
      findUnique: mocks.webhookFindUnique,
      updateMany: mocks.webhookUpdateMany,
      update: mocks.webhookUpdate,
      delete: mocks.webhookDelete,
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
      updateMany: mocks.tenantUpdateMany,
      update: mocks.tenantUpdate,
    },
    auditLog: { create: mocks.auditCreate },
  },
}));

vi.mock("@/features/billing/services/setup-fee", () => ({
  createSetupFeeInvoiceItem: mocks.createSetupFee,
}));
vi.mock("@/features/messaging/brevo/send-system-email", () => ({ sendSystemEmail: mocks.sendSystemEmail }));
vi.mock("@/features/billing/services/facturx", () => ({ generateFacturxXml: vi.fn() }));

import { POST } from "@/app/api/webhooks/stripe/route";

function stripeRequest(): Request {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "test-signature" },
    body: "{\"event\":true}",
  });
}

function subscriptionEvent(
  status: "active" | "past_due" | "unpaid" | "canceled",
  created = 1_700_000_000,
) {
  return {
    id: `evt_${status}_${created}`,
    type: "customer.subscription.updated",
    created,
    data: {
      object: {
        id: "sub_123",
        status,
        metadata: { tenantId: "tenant-a" },
      },
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_only";
  delete process.env.INTERNAL_ALERT_EMAIL;
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.webhookCreate.mockResolvedValue({ id: "event" });
  mocks.webhookUpdate.mockResolvedValue({});
  mocks.webhookDelete.mockResolvedValue({});
  mocks.auditCreate.mockResolvedValue({});
});

describe("Stripe webhook safety", () => {
  it("rejects an invalid Stripe signature before touching billing state", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const response = await POST(stripeRequest() as never);

    expect(response.status).toBe(400);
    expect(mocks.webhookCreate).not.toHaveBeenCalled();
    expect(mocks.tenantUpdateMany).not.toHaveBeenCalled();
  });

  it("acknowledges an already processed Stripe event without processing it twice", async () => {
    const event = subscriptionEvent("active");
    mocks.constructEvent.mockReturnValue(event);
    mocks.webhookCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    mocks.webhookFindUnique.mockResolvedValue({
      id: event.id,
      processedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const response = await POST(stripeRequest() as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(mocks.tenantFindUnique).not.toHaveBeenCalled();
    expect(mocks.webhookUpdate).not.toHaveBeenCalled();
  });

  it("moves an ACTIVE tenant to PAST_DUE for a supported subscription event", async () => {
    const event = subscriptionEvent("past_due");
    mocks.constructEvent.mockReturnValue(event);
    mocks.tenantFindUnique.mockResolvedValue({
      id: "tenant-a",
      status: "ACTIVE",
      plan: "COY",
      billingCycle: "MONTHLY",
      stripeCustomerId: "cus_123",
    });
    mocks.tenantUpdateMany.mockResolvedValue({ count: 1 });

    const response = await POST(stripeRequest() as never);

    expect(response.status).toBe(200);
    expect(mocks.tenantUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "tenant-a",
        status: { in: ["TRIAL", "ACTIVE"] },
        OR: [
          { lastBillingEventAt: null },
          { lastBillingEventAt: { lte: new Date(event.created * 1000) } },
        ],
      },
      data: {
        status: "PAST_DUE",
        lastBillingEventAt: new Date(event.created * 1000),
      },
    });
    expect(mocks.webhookUpdate).toHaveBeenCalledWith({
      where: { id: event.id },
      data: { processedAt: expect.any(Date) },
    });
  });

  it("does not overwrite billing state when the temporal transition guard rejects an old event", async () => {
    const event = subscriptionEvent("past_due", 1_600_000_000);
    mocks.constructEvent.mockReturnValue(event);
    mocks.tenantFindUnique.mockResolvedValue({
      id: "tenant-a",
      status: "ACTIVE",
      plan: "COY",
      billingCycle: "MONTHLY",
      stripeCustomerId: "cus_123",
    });
    mocks.tenantUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(stripeRequest() as never);

    expect(response.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "WEBHOOK_TRANSITION_SKIPPED",
          entityId: "tenant-a",
        }),
      }),
    );
    expect(mocks.webhookUpdate).toHaveBeenCalledOnce();
  });
});
