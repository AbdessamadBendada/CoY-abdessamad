import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findShopifyIntegration,
  parseShopifyPrivacyPayload,
  validateShopifyPrivacyHmac,
} from "@/lib/integrations/shopify-privacy";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  if (!validateShopifyPrivacyHmac(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const payload = parseShopifyPrivacyPayload(rawBody);
  if (!payload?.shop_domain) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const integration = await findShopifyIntegration(payload.shop_domain);
  if (!integration) return NextResponse.json({ received: true });

  // Delete Shopify-derived personal/customer data first, then the encrypted
  // access token in the integration record. The merchant account and invoices
  // are retained independently for billing/legal obligations.
  const deletedCustomers = await prisma.$transaction(async (tx) => {
    const customers = await tx.customer.deleteMany({
      where: { tenantId: integration.tenantId, integrationId: integration.id },
    });
    await tx.integration.delete({ where: { id: integration.id } });
    await tx.auditLog.create({
      data: {
        tenantId: integration.tenantId,
        action: "SHOPIFY_SHOP_REDACTED",
        entityType: "Integration",
        details: { source: "SHOPIFY", deletedCustomers: customers.count },
      },
    });
    return customers.count;
  });

  return NextResponse.json({ received: true, deletedCustomers });
}
