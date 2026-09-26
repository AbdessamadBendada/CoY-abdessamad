import { describe, expect, it } from "vitest";
import { backgroundProcessing, retryAt } from "@/lib/config/background-processing";
import { roundRobin } from "@/lib/jobs/fair-dispatch";

describe("background processing scale simulation", () => {
  it("gives all realistic tenant backlogs immediate progress without exceeding configured concurrency", () => {
    const work = roundRobin([
      { tenantId: "a", items: Array.from({ length: 20_000 }, (_, i) => `a-${i}`) },
      { tenantId: "b", items: Array.from({ length: 5_000 }, (_, i) => `b-${i}`) },
      { tenantId: "c", items: Array.from({ length: 500 }, (_, i) => `c-${i}`) },
    ], 150);

    expect(work).toHaveLength(150);
    expect(work.slice(0, 9)).toEqual(["a-0", "b-0", "c-0", "a-1", "b-1", "c-1", "a-2", "b-2", "c-2"]);
    expect(work.filter((id) => id.startsWith("a-")).length).toBe(50);
    expect(work.filter((id) => id.startsWith("b-")).length).toBe(50);
    expect(work.filter((id) => id.startsWith("c-")).length).toBe(50);
    expect(backgroundProcessing.scoringConcurrency).toBeGreaterThan(0);
  });

  it("uses bounded exponential retry backoff", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    expect(retryAt(1, now).getTime()).toBe(now.getTime() + 60_000);
    expect(retryAt(2, now).getTime()).toBe(now.getTime() + 120_000);
    expect(retryAt(99, now).getTime()).toBe(now.getTime() + 3_600_000);
  });
});
