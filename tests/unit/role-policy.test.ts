import { describe, expect, it } from "vitest";
import { canManageBilling, canManageTenant } from "@/lib/security/roles";

describe("role policy", () => {
  it("allows OWNER and ADMIN to manage tenant configuration", () => {
    expect(canManageTenant("OWNER")).toBe(true);
    expect(canManageTenant("ADMIN")).toBe(true);
  });

  it("blocks MEMBER from tenant configuration", () => {
    expect(canManageTenant("MEMBER")).toBe(false);
  });

  it("allows only OWNER to manage billing and DPA acceptance", () => {
    expect(canManageBilling("OWNER")).toBe(true);
    expect(canManageBilling("ADMIN")).toBe(false);
    expect(canManageBilling("MEMBER")).toBe(false);
  });
});
