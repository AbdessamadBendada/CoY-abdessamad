import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSystemEmail } from "@/lib/brevo/send-system-email";
import { escapeHtml } from "@/lib/utils/escape-html";
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
  if (!payload?.shop_domain || !payload.customer ||
      (!payload.customer.id && !payload.customer.email)) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const integration = await findShopifyIntegration(payload.shop_domain);
  if (!integration) return NextResponse.json({ received: true });

  const customer = await prisma.customer.findFirst({
    where: {
      tenantId: integration.tenantId,
      integrationId: integration.id,
      OR: [
        ...(payload.customer.id ? [{ externalId: String(payload.customer.id) }] : []),
        ...(payload.customer.email ? [{ email: payload.customer.email }] : []),
      ],
    },
    select: {
      id: true,
      _count: { select: { orders: true, actions: true, conversations: true } },
    },
  });

  const requestId = payload.data_request?.id ? String(payload.data_request.id) : "non fourni";
  await prisma.auditLog.create({
    data: {
      tenantId: integration.tenantId,
      action: "SHOPIFY_CUSTOMER_DATA_REQUESTED",
      entityType: "PrivacyRequest",
      entityId: requestId,
      details: {
        source: "SHOPIFY",
        matched: Boolean(customer),
        orders: customer?._count.orders ?? 0,
        actions: customer?._count.actions ?? 0,
        conversations: customer?._count.conversations ?? 0,
      },
    },
  });

  const recipient = process.env.INTERNAL_ALERT_EMAIL ??
    (await prisma.user.findFirst({
      where: { tenantId: integration.tenantId, role: "OWNER" },
      select: { email: true },
    }))?.email;

  if (recipient) {
    sendSystemEmail({
      to: recipient,
      subject: `[CoY] Demande d'accès aux données Shopify #${escapeHtml(requestId)}`,
      html: `<p>Une demande Shopify de consultation des données a été reçue et journalisée.</p>
        <p>Boutique : <strong>${escapeHtml(payload.shop_domain)}</strong><br>
        Correspondance CoY : <strong>${customer ? "oui" : "aucune donnée trouvée"}</strong></p>
        <p>Traitez cette demande avec la procédure décrite dans le guide d'exploitation, dans le délai légal applicable. Aucun identifiant client n'est inclus dans cet email.</p>`,
    });
  }

  return NextResponse.json({ received: true });
}
