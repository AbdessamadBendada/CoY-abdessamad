import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customerFindUnique: vi.fn(),
  transaction: vi.fn(),
  customerUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findUnique: mocks.customerFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import OptOutPage from "@/app/optout/[token]/page";
import { confirmOptOut } from "@/app/optout/[token]/actions";

const validToken = "a".repeat(64);

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  mocks.customerUpdateMany.mockResolvedValue({ count: 1 });
  mocks.auditCreate.mockResolvedValue({});
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      customer: { updateMany: mocks.customerUpdateMany },
      auditLog: { create: mocks.auditCreate },
    }),
  );
});

describe("confirmed opt-out flow", () => {
  it("renders a confirmation page without mutating data on GET", async () => {
    mocks.customerFindUnique.mockResolvedValue({ optedOutAt: null });

    const page = await OptOutPage({
      params: Promise.resolve({ token: validToken }),
      searchParams: Promise.resolve({}),
    });

    expect(page).toBeTruthy();
    expect(mocks.customerFindUnique).toHaveBeenCalledWith({
      where: { optOutToken: validToken },
      select: { optedOutAt: true },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("unsubscribes atomically only after the confirmation POST", async () => {
    mocks.customerFindUnique.mockResolvedValue({
      id: "customer-a",
      tenantId: "tenant-a",
      optedOutAt: null,
    });
    const form = new FormData();
    form.set("token", validToken);

    await expect(confirmOptOut(form)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.customerUpdateMany).toHaveBeenCalledWith({
      where: { id: "customer-a", optedOutAt: null },
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
          details: { source: "OPT_OUT_CONFIRMATION" },
        }),
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(`/optout/${validToken}?confirmed=1`);
  });

  it("does not write a second audit entry when a concurrent confirmation already won", async () => {
    mocks.customerFindUnique.mockResolvedValue({
      id: "customer-a",
      tenantId: "tenant-a",
      optedOutAt: null,
    });
    mocks.customerUpdateMany.mockResolvedValue({ count: 0 });
    const form = new FormData();
    form.set("token", validToken);

    await expect(confirmOptOut(form)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
