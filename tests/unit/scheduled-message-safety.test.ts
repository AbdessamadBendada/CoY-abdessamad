import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  disconnect: vi.fn(),
  generateAction: vi.fn(),
  moderateAction: vi.fn(),
  sendEmail: vi.fn(),
  sendSms: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  createJobsClient: () => ({
    winbackAction: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
    $disconnect: mocks.disconnect,
  }),
}));
vi.mock("@/lib/ai/agents", () => ({
  generateAction: mocks.generateAction,
  moderateAction: mocks.moderateAction,
}));
vi.mock("@/lib/brevo/send-email", () => ({ sendBrevoEmail: mocks.sendEmail }));
vi.mock("@/lib/brevo/send-sms", () => ({ sendBrevoSms: mocks.sendSms }));

import { capScheduledPromoValue, runSendScheduled } from "@/lib/jobs/send-scheduled";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.disconnect.mockResolvedValue(undefined);
});

describe("scheduled message claim safety", () => {
  it("selects only due SCHEDULED actions, so already processed actions are not resent", async () => {
    mocks.findMany.mockResolvedValue([]);

    const result = await runSendScheduled({ actionIds: ["action-1"] });

    expect(result).toEqual({ processed: 0, sent: 0, failed: 0, skipped: 0 });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["action-1"] },
          status: "SCHEDULED",
          scheduledAt: { lte: expect.any(Date) },
          customer: { optedOutAt: null },
        }),
      }),
    );
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });

  it("does not send when another worker already claimed the same action", async () => {
    mocks.findMany.mockResolvedValue([{ id: "action-1" }]);
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const result = await runSendScheduled({ actionIds: ["action-1"] });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "action-1", status: "SCHEDULED" }),
      data: expect.objectContaining({ status: "SENDING", sendAttempts: { increment: 1 } }),
    });
    expect(result).toEqual({ processed: 1, sent: 0, failed: 0, skipped: 0 });
    expect(mocks.generateAction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });

  it("keeps a failed claim from creating a provider-side duplicate", async () => {
    mocks.findMany.mockResolvedValue([{ id: "action-1" }, { id: "action-1" }]);
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await runSendScheduled({ actionIds: ["action-1", "action-1"] });

    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });
});

describe("scheduled discount limits", () => {
  it("caps percentage discounts at 50 percent", () => {
    expect(capScheduledPromoValue(80, "PERCENTAGE")).toBe(50);
  });

  it("caps fixed discounts at both the scenario limit and the €500 hard limit", () => {
    expect(capScheduledPromoValue(300, "FIXED", 75)).toBe(75);
    expect(capScheduledPromoValue(900, "FIXED")).toBe(500);
  });

  it("does not reinterpret free shipping or an absent promotion value", () => {
    expect(capScheduledPromoValue(1, "FREE_SHIPPING")).toBe(1);
    expect(capScheduledPromoValue(null, null)).toBeNull();
  });
});
