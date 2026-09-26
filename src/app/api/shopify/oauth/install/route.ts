import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/features/auth/server";
import { getAppUrl } from "@/shared/utils/get-app-url";
import { canManageTenant } from "@/shared/security/events/roles";

const APP_URL = getAppUrl();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[Shopify OAuth] Variable d'environnement manquante: ${name}`);
  return value;
}

// Minimum scopes used by order/customer webhook processing.
// read_all_orders is required for a useful first historical import (>60 days).
// Shopify may require app approval for this scope before production use.
const SHOPIFY_SCOPES = "read_orders,read_all_orders,read_customers";

function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop);
}

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!canManageTenant(user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }
  const shopifyClientId = requireEnv("SHOPIFY_CLIENT_ID");
  const oauthStateSecret = requireEnv("OAUTH_STATE_SECRET");
  const tenantId = user.tenant.id;

  const shop = request.nextUrl.searchParams.get("shop")?.trim().toLowerCase();

  if (!shop) {
    return NextResponse.json({ error: "Paramètre 'shop' manquant." }, { status: 400 });
  }

  const normalizedShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!isValidShopDomain(normalizedShop)) {
    return NextResponse.json(
      { error: "Domaine Shopify invalide. Format attendu : maboutique.myshopify.com" },
      { status: 400 }
    );
  }

  // Génère un state signé : base64url(tenantId:timestamp:hmac)
  const timestamp = Date.now().toString();
  const payload = `${tenantId}:${timestamp}`;
  const signature = createHmac("sha256", oauthStateSecret)
    .update(payload)
    .digest("base64url");
  const state = `${Buffer.from(payload).toString("base64url")}.${signature}`;

  const redirectUri = `${APP_URL}/api/shopify/oauth/callback`;

  const authUrl = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", shopifyClientId);
  authUrl.searchParams.set("scope", SHOPIFY_SCOPES);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Cookie httpOnly pour valider le state au retour
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
