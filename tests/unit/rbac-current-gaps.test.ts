import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireAuthApi: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.requireAuth,
  requireAuthApi: mocks.requireAuthApi,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/security/log-event", () => ({ logSecurityEvent: vi.fn() }));
vi.mock("@/lib/ai/agents", () => ({ generateAction: vi.fn() }));

import { GET as startShopifyOAuth } from "@/app/api/shopify/oauth/install/route";
import { GET as startGorgiasOAuth } from "@/app/api/gorgias/oauth/install/route";
import { POST as previewScenario } from "@/app/api/settings/scenarios/preview/route";
import { POST as createScenario } from "@/app/api/settings/scenarios/route";
import {
  PUT as updateScenario,
  DELETE as deleteScenario,
} from "@/app/api/settings/scenarios/[id]/route";

const member = {
  id: "member-a",
  role: "MEMBER",
  tenant: { id: "tenant-a", sector: "Mode" },
};

beforeEach(() => {
  mocks.requireAuth.mockResolvedValue(member);
  mocks.requireAuthApi.mockResolvedValue(member);
  process.env.SHOPIFY_CLIENT_ID = "shopify-test-client";
  process.env.GORGIAS_CLIENT_ID = "gorgias-test-client";
  process.env.OAUTH_STATE_SECRET = "test-state-secret";
});

describe("sensitive-operation RBAC enforcement", () => {
  it("blocks a MEMBER from initiating Shopify OAuth", async () => {
    const request = new NextRequest(
      "http://localhost/api/shopify/oauth/install?shop=demo.myshopify.com",
    );

    const response = await startShopifyOAuth(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("location")).toBeNull();
  });

  it("blocks a MEMBER from initiating Gorgias OAuth", async () => {
    const request = new NextRequest(
      "http://localhost/api/gorgias/oauth/install?subdomain=demo",
    );

    const response = await startGorgiasOAuth(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("location")).toBeNull();
  });

  it("blocks a MEMBER before AI scenario-preview validation", async () => {
    const request = new NextRequest("http://localhost/api/settings/scenarios/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await previewScenario(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Droits administrateur requis" });
  });

  it("blocks a MEMBER from creating, updating, or deleting scenarios", async () => {
    const request = new NextRequest("http://localhost/api/settings/scenarios", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const [createResponse, updateResponse, deleteResponse] = await Promise.all([
      createScenario(request),
      updateScenario(request, { params: Promise.resolve({ id: "scenario-a" }) }),
      deleteScenario(request, { params: Promise.resolve({ id: "scenario-a" }) }),
    ]);

    expect(createResponse.status).toBe(403);
    expect(updateResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
  });
});
