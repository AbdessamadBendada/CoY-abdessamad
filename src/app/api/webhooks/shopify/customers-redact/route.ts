import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/db/prisma";
import {
  findShopifyIntegration,
  parseShopifyPrivacyPayload,
  validateShopifyPrivacyHmac,
} from "@/features/integrations/connection/providers/shopify-privacy";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  if (!validateShopifyPrivacyHmac(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const payload = parseShopifyPrivacyPayload(rawBody);
  if (!payload?.shop_domain || !payload.customer ||
      (!payload.customer.id && !payload.customer.email)) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const integration = await findShopifyIntegration(payload.shop_domain);
  if (!integration) return NextResponse.json({ received: true });

  // Customer cascades delete orders, actions, CSAT, conversations and messages.
  // Aggregate tenant metrics contain no customer PII and are intentionally kept.
  const result = await prisma.customer.deleteMany({
    where: {
      tenantId: integration.tenantId,
      integrationId: integration.id,
      OR: [
        ...(payload.customer.id ? [{ externalId: String(payload.customer.id) }] : []),
        ...(payload.customer.email ? [{ email: payload.customer.email }] : []),
      ],
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: integration.tenantId,
      action: "SHOPIFY_CUSTOMER_REDACTED",
      entityType: "PrivacyRequest",
      details: { source: "SHOPIFY", deletedRecords: result.count },
    },
  });

  return NextResponse.json({ received: true });
}
