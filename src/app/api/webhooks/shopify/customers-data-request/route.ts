// TODO: Implémenter logique GDPR complète avant soumission Shopify App Store
// Shopify envoie ce webhook quand un client demande ses données personnelles.
// Obligation : exporter et transmettre les données dans les 30 jours.

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
  // 1. Parser payload : { shop_id, shop_domain, orders_requested, customers_requested, data_request }
  // 2. Récupérer les données WinBack liées au(x) customer_id(s) dans data_request.customers
  // 3. Exporter Customer, Order, WinbackAction en JSON ou PDF
  // 4. Envoyer au merchant_email (payload.email) dans les 30 jours
  // 5. AuditLog + notification interne

  return NextResponse.json({ received: true });
}
