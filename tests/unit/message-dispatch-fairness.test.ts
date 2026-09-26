import { describe, expect, it, vi } from "vitest";
import { dispatchScheduledActions, retryableDeliveryError } from "@/features/messaging/dispatch";

function prismaForMessages() {
  return {
    backgroundCursor: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) },
    tenant: { findMany: vi.fn().mockResolvedValue(["tenant-a", "tenant-b", "tenant-c"].map((id) => ({ id }))) },
    winbackAction: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockImplementation(({ where, take }) => Array.from({ length: take }, (_, index) => ({
        id: `${where.tenantId}-${index + 1}`, tenantId: where.tenantId, scheduledAt: new Date("2026-09-26T11:00:00Z"), sendAttempts: 0,
      }))),
    },
  };
}

describe("fair message dispatch", () => {
  it("interleaves due actions across tenants instead of taking a global first-30 slice", async () => {
    const prisma = prismaForMessages();
    const result = await dispatchScheduledActions(prisma as never, new Date("2026-09-26T12:00:00Z"));
    expect(result.actions.slice(0, 9).map((action) => action.tenantId)).toEqual([
      "tenant-a", "tenant-b", "tenant-c", "tenant-a", "tenant-b", "tenant-c", "tenant-a", "tenant-b", "tenant-c",
    ]);
  });

  it("does not select a future retry before its scheduled time", async () => {
    const prisma = prismaForMessages();
    await dispatchScheduledActions(prisma as never, new Date("2026-09-26T12:00:00Z"));
    const firstQuery = prisma.winbackAction.findMany.mock.calls[0][0];
    expect(firstQuery.where.nextSendAttemptAt).toEqual({ lte: new Date("2026-09-26T12:00:00Z") });
  });

  it("retries only definite rate-limit/server failures, not ambiguous network outcomes", () => {
    expect(retryableDeliveryError("Brevo email 429: rate limited")).toBe(true);
    expect(retryableDeliveryError("Brevo email 503: unavailable")).toBe(true);
    expect(retryableDeliveryError("Erreur réseau Brevo : timeout")).toBe(false);
    expect(retryableDeliveryError("Brevo email 400: invalid recipient")).toBe(false);
  });
});
