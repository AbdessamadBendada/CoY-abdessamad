// TODO: Implémenter logique GDPR complète avant soumission Shopify App Store
// Shopify envoie ce webhook quand un client demande la suppression de ses données.
// Obligation : supprimer ou anonymiser les données PII dans les 30 jours.

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function validateShopifyHmac(rawBody: string, secret: string, signature: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const secret = process.env.SHOPIFY_CLIENT_SECRET ?? "";

  if (!validateShopifyHmac(rawBody, secret, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  // TODO: Implémenter logique GDPR complète avant soumission Shopify App Store
  // 1. Parser payload : { shop_id, shop_domain, customer: { id, email, phone }, orders_to_redact }
  // 2. Anonymiser Customer (email → hash, phone → null, firstName/lastName → "REDACTED")
  // 3. Anonymiser WinbackAction.recipientEmail pour ce customer
  // 4. Conserver agrégats anonymisés dans BetaMetrics (pas de PII)
  // 5. AuditLog avec tenantId uniquement (sans données PII)
  // 6. Notification interne (email INTERNAL_ALERT_EMAIL)

  return NextResponse.json({ received: true });
}
