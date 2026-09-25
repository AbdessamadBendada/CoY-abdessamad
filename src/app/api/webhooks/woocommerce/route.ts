import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  processWooCommerceOrder,
  type WooCommerceOrderPayload,
} from "@/lib/jobs/process-woocommerce-order";
import { createHmac, timingSafeEqual } from "crypto";
import { decrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/security/log-event";

// ─── Validation HMAC WooCommerce ────────────────────────────────────────────
// WooCommerce signe : base64(HMAC-SHA256(webhook_secret, rawBody))
// Header : X-WC-Webhook-Signature

function validateWooCommerceSignature(
  rawBody: string,
  secret: string,
  signature: string
): boolean {
  const computed = createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── POST /api/webhooks/woocommerce?integrationId=xxx ───────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const integrationId = searchParams.get("integrationId");

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId manquant" }, { status: 400 });
  }

  const rawBody = await request.text();

  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, type: "WOOCOMMERCE", status: "ACTIVE" },
    include: { tenant: { select: { sector: true } } },
  });

  if (!integration) {
    return NextResponse.json(
      { error: "Intégration WooCommerce introuvable ou inactive" },
      { status: 404 }
    );
  }

  const tenantId = integration.tenantId;
  const config = (integration.config ?? {}) as Record<string, string>;

  if (!config.webhook_secret) {
    console.error(
      `[webhook/woocommerce] webhook_secret absent pour tenant ${tenantId} — setup incomplet`
    );
    return NextResponse.json({ error: "Configuration incomplète" }, { status: 500 });
  }

  const signature = request.headers.get("X-WC-Webhook-Signature") ?? "";
  if (!validateWooCommerceSignature(rawBody, decrypt(config.webhook_secret), signature)) {
    await logSecurityEvent({
      event: "HMAC_FAILURE",
      severity: "CRITICAL",
      tenantId,
      request,
      details: { integration: "woocommerce" },
    });
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  // Webhook signé valide — mise à jour lastSyncAt fire-and-forget
  void prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  }).catch(() => {});

  let payload: WooCommerceOrderPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!payload.id || !payload.billing?.email) {
    return NextResponse.json({ received: true });
  }

  try {
    await processWooCommerceOrder(
      tenantId,
      integration.id,
      integration.tenant.sector ?? "",
      payload
    );
  } catch (err) {
    // Ne pas bloquer — WooCommerce doit recevoir 200 pour éviter les relances
    console.error("[webhook/woocommerce] Erreur traitement commande:", err);
  }

  return NextResponse.json({ received: true });
}
