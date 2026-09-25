import { createHmac } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAppUrl } from "@/lib/utils/get-app-url";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Gorgias OAuth] Variable d'environnement manquante: ${name}`);
  }
  return value;
}

const GORGIAS_CLIENT_ID  = requireEnv("GORGIAS_CLIENT_ID");
const OAUTH_STATE_SECRET = requireEnv("OAUTH_STATE_SECRET");
const APP_URL = getAppUrl();

// tags:write et events:read retirés (ADR-016) — 0 usage runtime, moindre privilège
const GORGIAS_SCOPES = "openid email profile offline customers:read tickets:read";

function isValidGorgiasSubdomain(subdomain: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*$/.test(subdomain);
}

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const tenantId = user.tenant.id;

  const subdomain = request.nextUrl.searchParams.get("subdomain")?.trim().toLowerCase();

  if (!subdomain) {
    return NextResponse.json({ error: "Paramètre 'subdomain' manquant." }, { status: 400 });
  }

  if (!isValidGorgiasSubdomain(subdomain)) {
    return NextResponse.json(
      { error: "Sous-domaine Gorgias invalide. Format attendu : maboutique" },
      { status: 400 }
    );
  }

  // Génère un state signé : base64url(tenantId:timestamp:subdomain).hmac
  const timestamp = Date.now().toString();
  const payload   = `${tenantId}:${timestamp}:${subdomain}`;
  const signature = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(payload)
    .digest("base64url");
  const state = `${Buffer.from(payload).toString("base64url")}.${signature}`;

  const redirectUri = `${APP_URL}/api/gorgias/oauth/callback`;

  const authUrl = new URL(`https://${subdomain}.gorgias.com/oauth/authorize`);
  authUrl.searchParams.set("client_id", GORGIAS_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GORGIAS_SCOPES);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Cookie httpOnly pour valider le state au retour
  response.cookies.set("gorgias_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
