import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { registerShopifyWebhooks } from "@/lib/integrations/register-shopify-webhooks";
import { getCurrentUser } from "@/lib/auth";
import { populateBetaMetricsBaseline } from "@/lib/beta-metrics";
import { getAppUrl } from "@/lib/utils/get-app-url";

const SHOPIFY_CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const OAUTH_STATE_SECRET    = process.env.OAUTH_STATE_SECRET!;
const APP_URL = getAppUrl();

interface ShopifyTokenResponse {
  access_token?: string;
  error?: string;
}

// Vérifie la signature HMAC de la requête Shopify
function verifyShopifyHmac(params: URLSearchParams, hmac: string): boolean {
  const sorted = Array.from(params.entries())
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}=${val}`)
    .join("&");

  const computed = createHmac("sha256", SHOPIFY_CLIENT_SECRET)
    .update(sorted)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  } catch {
    return false;
  }
}

// Vérifie et extrait le tenantId du state signé
function verifyState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const payload = Buffer.from(encodedPayload, "base64url").toString();
  const [tenantId, timestamp] = payload.split(":");

  // Vérifie que le state n'a pas expiré (10 minutes)
  if (!tenantId || !timestamp || Date.now() - parseInt(timestamp) > 600_000) {
    return null;
  }

  const expectedSig = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(payload)
    .digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }

  return tenantId;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  // Validation des paramètres obligatoires
  if (!code || !shop || !state || !hmac) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_invalid_params`);
  }

  // Vérifie la signature HMAC Shopify
  if (!verifyShopifyHmac(searchParams, hmac)) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_invalid_hmac`);
  }

  // Vérifie le state contre le cookie (timingSafeEqual — anti timing attack)
  const cookieState = request.cookies.get("shopify_oauth_state")?.value;
  if (!cookieState) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_invalid_state`);
  }
  try {
    if (!timingSafeEqual(Buffer.from(cookieState), Buffer.from(state))) {
      return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_invalid_state`);
    }
  } catch {
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_invalid_state`);
  }

  // Extrait et vérifie le tenantId
  const tenantId = verifyState(state);
  if (!tenantId) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_expired_state`);
  }

  // Vérifie que la session en cours appartient bien à ce tenant (prévient CSRF inter-tenant)
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.tenant.id !== tenantId) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_unauthorized`);
  }

  // Échange le code contre un access token
  let accessToken: string;
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as ShopifyTokenResponse;

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Shopify OAuth] Échange de code échoué:", tokenData.error ?? "unknown");
      return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_token_failed`);
    }

    accessToken = tokenData.access_token;
  } catch (err) {
    console.error("[Shopify OAuth] Erreur réseau lors de l'échange de code:", err);
    return NextResponse.redirect(`${APP_URL}/integrations?error=shopify_network_error`);
  }

  const shopDomain = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Sauvegarde l'intégration en DB
  // webhook_secret = SHOPIFY_CLIENT_SECRET (utilisé pour vérifier les webhooks API-registered)
  const integration = await prisma.integration.upsert({
    where: { tenantId_type: { tenantId, type: "SHOPIFY" } },
    update: {
      status: "ACTIVE",
      config: {
        shop_domain: shopDomain,
        access_token: encrypt(accessToken),
        webhook_secret: encrypt(SHOPIFY_CLIENT_SECRET),
      },
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      type: "SHOPIFY",
      status: "ACTIVE",
      config: {
        shop_domain: shopDomain,
        access_token: encrypt(accessToken),
        webhook_secret: encrypt(SHOPIFY_CLIENT_SECRET),
      },
    },
  });

  // Enregistre les webhooks Shopify (fire-and-forget — ne bloque pas la redirection)
  void registerShopifyWebhooks(shopDomain, accessToken, integration.id).catch((err) =>
    console.error("[Shopify OAuth] Échec enregistrement webhooks:", err)
  );

  // Baseline BetaMetrics — fire-and-forget, idempotent (crée uniquement si pas encore existant)
  void populateBetaMetricsBaseline(tenantId).catch((err) =>
    console.error("[Shopify OAuth] Erreur baseline BetaMetrics:", err)
  );

  // Supprime le cookie d'état
  const response = NextResponse.redirect(`${APP_URL}/integrations?connected=shopify`);
  response.cookies.set("shopify_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
