import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAppUrl } from "@/lib/utils/get-app-url";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET!;
const APP_URL = getAppUrl();

const SHOPIFY_SCOPES = "read_orders,read_customers,write_customers,read_products,read_returns";

function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop);
}

export async function GET(request: NextRequest) {
  const user = await requireAuth();
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
  const signature = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(payload)
    .digest("base64url");
  const state = `${Buffer.from(payload).toString("base64url")}.${signature}`;

  const redirectUri = `${APP_URL}/api/shopify/oauth/callback`;

  const authUrl = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", SHOPIFY_CLIENT_ID);
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
