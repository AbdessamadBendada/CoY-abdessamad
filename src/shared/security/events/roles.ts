import type { UserRole } from "@prisma/client";

export function canManageTenant(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageBilling(role: UserRole): boolean {
  return role === "OWNER";
}
