import { describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ captureException: vi.fn(), captureMessage: vi.fn(), withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setExtras: vi.fn() })) }));
vi.mock("@sentry/nextjs", () => sentry);

import { log, reportError } from "@/shared/observability/logger";

describe("operational logger", () => {
  it("redacts credentials and omits customer content from structured logs", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    log("error", "integration.failed", { tenantId: "tenant-1", accessToken: "secret", email: "person@example.com", content: "private" });
    const entry = JSON.parse(error.mock.calls[0][0]);
    expect(entry).toMatchObject({ tenantId: "tenant-1", accessToken: "[redacted]", email: "[omitted]", content: "[omitted]" });
  });

  it("reports a sanitized operational error to Sentry", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reportError("scoring.failed", new Error("provider unavailable"), { tenantId: "tenant-1", apiKey: "secret" });
    expect(sentry.captureException).toHaveBeenCalled();
    expect(error.mock.calls[0][0]).not.toContain("secret");
  });
});
