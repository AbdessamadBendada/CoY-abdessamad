import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customerFindUnique: vi.fn(),
  customerUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.customerFindUnique,
      update: mocks.customerUpdate,
    },
    auditLog: { create: mocks.auditCreate },
  },
}));

import OptOutPage from "@/app/optout/[token]/page";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.customerUpdate.mockResolvedValue({});
  mocks.auditCreate.mockResolvedValue({});
});

describe("current opt-out GET behavior", () => {
  it("documents that merely rendering a valid GET link immediately unsubscribes the customer", async () => {
    mocks.customerFindUnique.mockResolvedValue({
      id: "customer-a",
      tenantId: "tenant-a",
      optedOutAt: null,
    });

    const page = await OptOutPage({ params: Promise.resolve({ token: "valid-token" }) });

    expect(page).toBeTruthy();
    expect(mocks.customerFindUnique).toHaveBeenCalledWith({
      where: { optOutToken: "valid-token" },
      select: { id: true, tenantId: true, optedOutAt: true },
    });
    expect(mocks.customerUpdate).toHaveBeenCalledWith({
      where: { id: "customer-a" },
      data: {
        optedOutAt: expect.any(Date),
        cooldownUntil: expect.any(Date),
      },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-a",
          action: "CUSTOMER_OPTED_OUT",
          entityId: "customer-a",
        }),
      }),
    );
  });

  it("keeps repeat GET requests idempotent after the customer is opted out", async () => {
    mocks.customerFindUnique.mockResolvedValue({
      id: "customer-a",
      tenantId: "tenant-a",
      optedOutAt: new Date("2026-01-01T00:00:00Z"),
    });

    await OptOutPage({ params: Promise.resolve({ token: "valid-token" }) });

    expect(mocks.customerUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
