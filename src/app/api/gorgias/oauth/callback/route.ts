import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/shared/db/prisma";
import { encrypt } from "@/shared/security/crypto";
import { registerGorgiasWebhooks } from "@/features/integrations/connection/providers/register-gorgias-webhooks";
import { getCurrentUser } from "@/features/auth/server";
import { getAppUrl } from "@/shared/utils/get-app-url";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Gorgias OAuth] Variable d'environnement manquante: ${name}`);
  }
  return value;
}

const APP_URL = getAppUrl();

interface GorgiasTokenResponse {
  access_token?:  string;
  refresh_token?: string;
  token_type?:    string;
  error?:         string;
}

// Vérifie et extrait tenantId + subdomain du state signé
function verifyState(state: string, oauthStateSecret: string): { tenantId: string; subdomain: string } | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const payload = Buffer.from(encodedPayload, "base64url").toString();
  const segments = payload.split(":");
  // Format: tenantId:timestamp:subdomain
  if (segments.length !== 3) return null;

  const [tenantId, timestamp, subdomain] = segments;

  // Vérifie que le state n'a pas expiré (10 minutes)
  if (!tenantId || !timestamp || !subdomain || Date.now() - parseInt(timestamp) > 600_000) {
    return null;
  }

  const expectedSig = createHmac("sha256", oauthStateSecret)
    .update(payload)
    .digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }

  return { tenantId, subdomain };
}

export async function GET(request: NextRequest) {
  const gorgiasClientId = requireEnv("GORGIAS_CLIENT_ID");
  const gorgiasClientSecret = requireEnv("GORGIAS_CLIENT_SECRET");
  const oauthStateSecret = requireEnv("OAUTH_STATE_SECRET");
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  // Erreur explicite renvoyée par Gorgias (ex: refus utilisateur, scope invalide)
  const gorgiasError = searchParams.get("error");
  const gorgiasErrorDescription = searchParams.get("error_description");
  if (gorgiasError) {
    console.error(`[Gorgias OAuth] Erreur Gorgias: ${gorgiasError} — ${gorgiasErrorDescription ?? "pas de détail"}`);
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_oauth_denied`);
  }

  // Validation des paramètres obligatoires
  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_invalid_params`);
  }

  // Vérifie le state contre le cookie (timingSafeEqual pour éviter les timing attacks)
  const cookieState = request.cookies.get("gorgias_oauth_state")?.value;
  if (!cookieState) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_invalid_state`);
  }
  try {
    if (!timingSafeEqual(Buffer.from(cookieState), Buffer.from(state))) {
      return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_invalid_state`);
    }
  } catch {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_invalid_state`);
  }

  // Extrait et vérifie tenantId + subdomain
  const verified = verifyState(state, oauthStateSecret);
  if (!verified) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_expired_state`);
  }

  const { tenantId, subdomain } = verified;

  // Vérifie que la session en cours appartient bien à ce tenant (prévient CSRF inter-tenant)
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.tenant.id !== tenantId) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_unauthorized`);
  }

  // Vérifie que le tenant existe
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_tenant_not_found`);
  }

  // Échange le code contre un access token
  let accessToken: string;
  let refreshToken: string | null = null;
  try {
    const redirectUri = `${APP_URL}/api/gorgias/oauth/callback`;
    const tokenRes = await fetch(`https://${subdomain}.gorgias.com/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type:    "authorization_code",
        client_id:     gorgiasClientId,
        client_secret: gorgiasClientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
    });

    const tokenData = (await tokenRes.json()) as GorgiasTokenResponse;

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Gorgias OAuth] Échange de code échoué:", tokenData.error ?? "unknown");
      return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_token_failed`);
    }

    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token ?? null;
  } catch (err) {
    console.error("[Gorgias OAuth] Erreur réseau lors de l'échange de code:", err);
    return NextResponse.redirect(`${APP_URL}/integrations?error=gorgias_network_error`);
  }

  // Sauvegarde l'intégration en DB
  const integration = await prisma.integration.upsert({
    where: { tenantId_type: { tenantId, type: "GORGIAS" } },
    update: {
      status: "ACTIVE",
      config: {
        shop_domain:   subdomain,
        access_token:  encrypt(accessToken),
        ...(refreshToken ? { refresh_token: encrypt(refreshToken) } : {}),
      },
      lastError:   null,
      lastErrorAt: null,
      updatedAt:   new Date(),
    },
    create: {
      tenantId,
      type:   "GORGIAS",
      status: "ACTIVE",
      config: {
        shop_domain:   subdomain,
        access_token:  encrypt(accessToken),
        ...(refreshToken ? { refresh_token: encrypt(refreshToken) } : {}),
      },
    },
  });

  // Enregistre les webhooks Gorgias (fire-and-forget)
  void registerGorgiasWebhooks(subdomain, accessToken, integration.id).catch((err) =>
    console.error("[Gorgias OAuth] Échec enregistrement webhooks:", err)
  );

  // Supprime le cookie d'état
  const response = NextResponse.redirect(`${APP_URL}/integrations?connected=gorgias`);
  response.cookies.set("gorgias_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
