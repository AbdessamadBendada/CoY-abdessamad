import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/shared/db/prisma";
import { decrypt } from "@/shared/security/crypto";
import {
  processPrestaShopOrder,
  type PrestaShopOrderPayload,
} from "@/features/integrations/prestashop/process-order";

// ─── Validation API key PrestaShop ───────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function validatePrestaShopAuth(request: NextRequest, apiKey: string): boolean {
  // PrestaShop envoie l'API key en Basic auth : base64(api_key:)
  const authHeader = request.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const key = decoded.endsWith(":") ? decoded.slice(0, -1) : decoded.split(":")[0];
    return safeEqual(key, apiKey);
  }
  // Fallback : header X-PrestaShop-Api-Key
  const directKey = request.headers.get("X-PrestaShop-Api-Key") ?? "";
  return safeEqual(directKey, apiKey);
}

// ─── POST /api/webhooks/prestashop?integrationId=xxx ─────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const integrationId = searchParams.get("integrationId");

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId manquant" }, { status: 400 });
  }

  const rawBody = await request.text();

  // Récupérer l'intégration PrestaShop active par son ID opaque
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, type: "PRESTASHOP", status: "ACTIVE" },
    include: { tenant: { select: { sector: true } } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Intégration PrestaShop introuvable ou inactive" }, { status: 404 });
  }

  const tenantId = integration.tenantId;

  // Valider l'API key
  const config = (integration.config ?? {}) as Record<string, string>;
  if (config.api_key) {
    if (!validatePrestaShopAuth(request, decrypt(config.api_key))) {
      return NextResponse.json({ error: "Authentification invalide" }, { status: 401 });
    }
  }

  // Parser le payload
  let payload: PrestaShopOrderPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  // Vérifier les données minimales requises
  if (!payload.id_order || !payload.id_customer) {
    return NextResponse.json({ received: true });
  }

  if (!payload.customer?.email) {
    console.warn(
      `[webhook/prestashop] Email client absent pour la commande #${payload.id_order} (tenant: ${tenantId}). ` +
      `Le module WinBack PrestaShop est requis pour inclure les données client dans le payload. ` +
      `Commande ignorée — aucun client créé en DB.`
    );
    return NextResponse.json({ received: true, warning: "email_client_absent" });
  }

  await processPrestaShopOrder(
    tenantId,
    integration.id,
    integration.tenant.sector ?? "",
    payload
  );

  return NextResponse.json({ received: true });
}
