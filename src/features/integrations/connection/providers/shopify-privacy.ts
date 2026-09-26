import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/shared/db/prisma";

export type ShopifyPrivacyPayload = {
  shop_id?: number;
  shop_domain?: string;
  customer?: { id?: number; email?: string; phone?: string };
  orders_requested?: number[];
  orders_to_redact?: number[];
  data_request?: { id?: number };
};

export function validateShopifyPrivacyHmac(rawBody: string, signature: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret || !signature) return false;
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return supplied.length === computed.length && timingSafeEqual(computed, supplied);
}

export function parseShopifyPrivacyPayload(rawBody: string): ShopifyPrivacyPayload | null {
  try {
    const value = JSON.parse(rawBody) as ShopifyPrivacyPayload;
    return typeof value === "object" && value !== null ? value : null;
  } catch {
    return null;
  }
}

export async function findShopifyIntegration(shopDomain: string) {
  return prisma.integration.findFirst({
    where: {
      type: "SHOPIFY",
      config: { path: ["shop_domain"], equals: shopDomain },
    },
    select: { id: true, tenantId: true },
  });
}
