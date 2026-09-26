import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireAuthApi: vi.fn(),
  customerFindFirst: vi.fn(),
  actionUpdateMany: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.requireAuth,
  requireAuthApi: mocks.requireAuthApi,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findFirst: mocks.customerFindFirst },
    winbackAction: { updateMany: mocks.actionUpdateMany },
  },
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, notFound: mocks.notFound };
});

import CustomerDetailPage from "@/app/(dashboard)/customers/[id]/page";
import { POST as cancelAction } from "@/app/api/v1/actions/[id]/cancel/route";
import { POST as retryAction } from "@/app/api/v1/actions/[id]/retry/route";

const tenantAAdmin = {
  id: "user-a",
  role: "ADMIN",
  tenant: { id: "tenant-a" },
};

beforeEach(() => {
  mocks.requireAuth.mockResolvedValue(tenantAAdmin);
  mocks.requireAuthApi.mockResolvedValue(tenantAAdmin);
  mocks.customerFindFirst.mockReset();
  mocks.actionUpdateMany.mockReset();
  mocks.notFound.mockClear();
});

describe("tenant isolation", () => {
  it("does not return Tenant B customer details to Tenant A", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);

    await expect(
      CustomerDetailPage({ params: Promise.resolve({ id: "customer-owned-by-b" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.customerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "customer-owned-by-b", tenantId: "tenant-a" },
      }),
    );
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("cannot cancel an action owned by Tenant B", async () => {
    mocks.actionUpdateMany.mockResolvedValue({ count: 0 });

    const response = await cancelAction(new Request("http://test/actions") as never, {
      params: Promise.resolve({ id: "action-owned-by-b" }),
    });

    expect(response.status).toBe(422);
    expect(mocks.actionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "action-owned-by-b",
        tenantId: "tenant-a",
        status: { in: ["PENDING", "SCHEDULED", "NEEDS_REVIEW"] },
      },
      data: { status: "CANCELLED", failureReason: "Annulée manuellement" },
    });
  });

  it("cannot retry an action owned by Tenant B", async () => {
    mocks.actionUpdateMany.mockResolvedValue({ count: 0 });

    const response = await retryAction(new Request("http://test/actions") as never, {
      params: Promise.resolve({ id: "action-owned-by-b" }),
    });

    expect(response.status).toBe(422);
    expect(mocks.actionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "action-owned-by-b", tenantId: "tenant-a", status: "FAILED" }),
      }),
    );
  });

  it("allows an owned action to be cancelled through the tenant-scoped mutation", async () => {
    mocks.actionUpdateMany.mockResolvedValue({ count: 1 });

    const response = await cancelAction(new Request("http://test/actions") as never, {
      params: Promise.resolve({ id: "action-owned-by-a" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: { id: "action-owned-by-a", status: "CANCELLED" },
    });
  });
});

describe("RBAC enforcement", () => {
  it("blocks a MEMBER from cancelling an owned action", async () => {
    mocks.requireAuthApi.mockResolvedValue({ ...tenantAAdmin, role: "MEMBER" });
    mocks.actionUpdateMany.mockResolvedValue({ count: 1 });

    const response = await cancelAction(new Request("http://test/actions") as never, {
      params: Promise.resolve({ id: "member-action" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.actionUpdateMany).not.toHaveBeenCalled();
  });

  it("blocks a MEMBER from rescheduling an owned failed action", async () => {
    mocks.requireAuthApi.mockResolvedValue({ ...tenantAAdmin, role: "MEMBER" });
    mocks.actionUpdateMany.mockResolvedValue({ count: 1 });

    const response = await retryAction(new Request("http://test/actions") as never, {
      params: Promise.resolve({ id: "member-failed-action" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.actionUpdateMany).not.toHaveBeenCalled();
  });
});
