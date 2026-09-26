import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  deleteUser: vi.fn(),
  createAdminClient: vi.fn(),
  tenantCreate: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signUp: mocks.signUp,
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { create: mocks.tenantCreate },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { register } from "@/app/(auth)/actions";

function validRegistrationForm(): FormData {
  const form = new FormData();
  form.set("email", "owner@example.test");
  form.set("password", "safe-password");
  form.set("companyName", "Test Company");
  form.set("firstName", "Test");
  form.set("lastName", "Owner");
  form.set("sector", "Mode");
  form.set("gdprConsent", "on");
  return form;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const mock of Object.values(mocks)) mock.mockReset();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mocks.createAdminClient.mockReturnValue({
    auth: { admin: { deleteUser: mocks.deleteUser } },
  });
  mocks.deleteUser.mockResolvedValue({ error: null });
});

describe("registration failure recovery", () => {
  it("fails closed before Supabase signup when rollback credentials are unavailable", async () => {
    mocks.createAdminClient.mockImplementation(() => {
      throw new Error("missing service role");
    });

    const result = await register(validRegistrationForm());

    expect(result).toEqual({
      error: "L'inscription est temporairement indisponible. Veuillez réessayer plus tard.",
    });
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.tenantCreate).not.toHaveBeenCalled();
  });

  it("creates the tenant, OWNER user and monthly quota in one nested database write", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    });
    mocks.tenantCreate.mockResolvedValue({ id: "tenant-a" });

    const result = await register(validRegistrationForm());

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(mocks.tenantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test Company",
        email: "owner@example.test",
        sector: "Mode",
        status: "TRIAL",
        users: {
          create: expect.objectContaining({
            authUserId: "auth-user-1",
            role: "OWNER",
          }),
        },
        quotaUsages: {
          create: { period: expect.stringMatching(/^\d{4}-\d{2}$/) },
        },
      }),
    });
  });

  it("rolls back the Supabase user when tenant creation fails", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "auth-user-created-first" } },
      error: null,
    });
    mocks.tenantCreate.mockRejectedValue(new Error("database unavailable"));

    const result = await register(validRegistrationForm());

    expect(mocks.signUp).toHaveBeenCalledOnce();
    expect(mocks.tenantCreate).toHaveBeenCalledOnce();
    expect(mocks.deleteUser).toHaveBeenCalledWith("auth-user-created-first");
    expect(result).toEqual({
      error: "Erreur lors de la création du compte. Veuillez réessayer.",
    });
  });

  it("returns an explicit recovery code when Auth rollback also fails", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "auth-user-needs-recovery" } },
      error: null,
    });
    mocks.tenantCreate.mockRejectedValue(new Error("database unavailable"));
    mocks.deleteUser.mockResolvedValue({ error: new Error("admin API unavailable") });

    const result = await register(validRegistrationForm());

    expect(result).toEqual({
      error: "Le compte n'a pas pu être finalisé. Contactez le support avant de réessayer.",
      code: "REGISTRATION_RECOVERY_REQUIRED",
    });
  });
});
