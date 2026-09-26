import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), deleteMany: vi.fn(), disconnect: vi.fn() }));
vi.mock("@/shared/db/prisma", () => ({ createJobsClient: () => ({ stripeWebhookEvent: { findMany: mocks.findMany, deleteMany: mocks.deleteMany }, $disconnect: mocks.disconnect }) }));
vi.mock("@/shared/observability/logger", () => ({ log: vi.fn(), reportError: vi.fn() }));
import { cleanupProcessedWebhookEvents } from "@/features/operations/cleanup-processed-webhooks";

describe("processed webhook cleanup", () => {
  it("deletes only a bounded batch of successfully processed Stripe event IDs", async () => {
    mocks.findMany.mockResolvedValue([{ id: "evt_1" }]); mocks.deleteMany.mockResolvedValue({ count: 1 }); mocks.disconnect.mockResolvedValue(undefined);
    await expect(cleanupProcessedWebhookEvents()).resolves.toEqual({ deleted: 1, hasMore: false });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500, where: { processedAt: { not: null, lt: expect.any(Date) } } }));
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["evt_1"] } } });
  });
});
