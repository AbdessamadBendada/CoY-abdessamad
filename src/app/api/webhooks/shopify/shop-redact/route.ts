// TODO: Implémenter logique GDPR complète avant soumission Shopify App Store
// Shopify envoie ce webhook 48h après désinstallation de l'app.
// Obligation : supprimer TOUTES les données de la boutique dans les 48h.

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
  // 1. Parser payload : { shop_id, shop_domain }
  // 2. Trouver le Tenant via integration.config.shop_domain === shop_domain, type=SHOPIFY
  // 3. Supprimer dans l'ordre (contraintes FK) :
  //    WinbackAction → Order → Customer → Integration → BetaMetrics → AuditLog → Tenant
  // 4. Conserver uniquement : AuditLog anonymisé ("SHOP_REDACT_COMPLETED", tenantId hashé)
  // 5. Notification interne (email INTERNAL_ALERT_EMAIL) avec shop_domain + timestamp
  // ⚠️  Délai max : 48h après réception — déclencher un job Trigger.dev si besoin

  return NextResponse.json({ received: true });
}
