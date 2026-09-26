import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  checkout: vi.fn(),
  tenantUpdate: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/features/auth/server", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/features/billing/services/checkout", () => ({ createCoyCheckoutSession: mocks.checkout }));
vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    tenant: { update: mocks.tenantUpdate },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/integrations/connection/providers/test-connection", () => ({
  testPrestaShop: vi.fn(),
  testWooCommerce: vi.fn(),
  testCrisp: vi.fn(),
}));
vi.mock("@/shared/security/crypto", () => ({ encrypt: vi.fn(), decrypt: vi.fn() }));

import { createCheckoutSession } from "@/app/(dashboard)/billing/actions";
import { connectIntegration } from "@/app/(dashboard)/integrations/actions";
import {
  updateCompanyInfo,
  updateWinbackSettings,
} from "@/app/(dashboard)/settings/actions";
import { acceptDpa } from "@/app/dpa/actions";

const member = {
  id: "member-a",
  role: "MEMBER",
  tenant: {
    id: "tenant-a",
    plan: "COY",
    status: "ACTIVE",
    email: "owner@example.test",
    dpaSignedAt: new Date(),
    stripeCustomerId: null,
  },
};

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  mocks.requireAuth.mockResolvedValue(member);
});

describe("management server-action RBAC", () => {
  it("blocks MEMBER from starting billing checkout", async () => {
    await expect(createCheckoutSession()).resolves.toEqual({
      error: "Seul le propriétaire du compte peut modifier l'abonnement.",
    });
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("blocks MEMBER from accepting the tenant DPA", async () => {
    await expect(acceptDpa()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/overview");
    expect(mocks.tenantUpdate).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("blocks MEMBER from changing company or win-back settings", async () => {
    const form = new FormData();
    await expect(updateCompanyInfo(form)).resolves.toEqual({
      error: "Droits administrateur requis.",
    });
    await expect(updateWinbackSettings(form)).resolves.toEqual({
      error: "Droits administrateur requis.",
    });
    expect(mocks.tenantUpdate).not.toHaveBeenCalled();
  });

  it("blocks MEMBER from connecting an integration", async () => {
    const form = new FormData();
    form.set("type", "PRESTASHOP");
    await expect(connectIntegration(form)).resolves.toEqual({
      error: "Droits administrateur requis.",
    });
  });
});
