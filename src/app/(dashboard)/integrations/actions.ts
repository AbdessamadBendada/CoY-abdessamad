"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import type { Prisma, IntegrationType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_QUOTAS, toTenantPlan } from "@/types/database";
import { testPrestaShop, testWooCommerce, testCrisp } from "@/lib/integrations/test-connection";
import { encrypt, decrypt } from "@/lib/crypto";

// ─── CONNECT ─────────────────────────────────────────────────────────────────
//
// Gère les intégrations par clé API (PrestaShop, WooCommerce, Crisp).
// Gorgias et Shopify utilisent le flux OAuth (callbacks dédiés).

export async function connectIntegration(formData: FormData) {
  const user = await requireAuth();
  const tenantId = user.tenant.id;
  let planKey: keyof typeof PLAN_QUOTAS;
  try {
    planKey = toTenantPlan(user.tenant.plan, user.tenant.status);
  } catch {
    return { error: "Compte suspendu, annulé, ou plan invalide. Contactez le support." };
  }
  const type = formData.get("type") as string;

  // Vérification quota
  const limit = PLAN_QUOTAS[planKey]?.integrations_limit ?? 1;
  if (limit !== -1) {
    const activeCount = await prisma.integration.count({
      where: { tenantId, status: "ACTIVE" },
    });
    if (activeCount >= limit) {
      return {
        error: `Votre plan ${user.tenant.plan} est limité à ${limit} intégration${limit > 1 ? "s" : ""}. Passez à un plan supérieur pour en ajouter d'autres.`,
      };
    }
  }

  let testResult: { ok: boolean; shopName?: string; error?: string };
  let config: Prisma.InputJsonValue;
  let generatedWebhookSecret: string | undefined;

  if (type === "PRESTASHOP") {
    const shopDomain = (formData.get("shop_domain") as string)?.trim();
    const apiKey = (formData.get("api_key") as string)?.trim();

    if (!shopDomain || !apiKey) {
      return { error: "Tous les champs sont requis." };
    }

    testResult = await testPrestaShop(shopDomain, apiKey);
    config = {
      shop_domain: shopDomain,
      api_key: encrypt(apiKey),
    };
  } else if (type === "WOOCOMMERCE") {
    const siteUrl = (formData.get("site_url") as string)?.trim();
    const consumerKey = (formData.get("consumer_key") as string)?.trim();
    const consumerSecret = (formData.get("consumer_secret") as string)?.trim();

    if (!siteUrl || !consumerKey || !consumerSecret) {
      return { error: "Tous les champs sont requis." };
    }

    testResult = await testWooCommerce(siteUrl, consumerKey, consumerSecret);
    generatedWebhookSecret = randomBytes(32).toString("hex");
    config = {
      site_url: siteUrl,
      consumer_key: encrypt(consumerKey),
      consumer_secret: encrypt(consumerSecret),
      webhook_secret: encrypt(generatedWebhookSecret),
    };
  } else if (type === "CRISP") {
    const websiteId = (formData.get("website_id") as string)?.trim();

    if (!websiteId) {
      return { error: "Le Website ID est requis." };
    }

    testResult = await testCrisp(websiteId);
    config = { website_id: websiteId };
  } else {
    return { error: "Type d'intégration non reconnu." };
  }

  if (!testResult.ok) {
    return { error: testResult.error };
  }

  // Sauvegarde en base (upsert — une seule intégration par type par tenant)
  const savedIntegration = await prisma.integration.upsert({
    where: {
      tenantId_type: {
        tenantId,
        type: type as IntegrationType,
      },
    },
    update: {
      status: "ACTIVE",
      config,
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      type: type as IntegrationType,
      status: "ACTIVE",
      config,
    },
  });

  revalidatePath("/integrations");
  return {
    success: true,
    shopName: testResult.shopName,
    // WooCommerce uniquement — afficher une seule fois pour configuration webhook
    ...(generatedWebhookSecret
      ? { webhookSecret: generatedWebhookSecret, webhookIntegrationId: savedIntegration.id }
      : {}),
  };
}

// ─── REVEAL API KEY ───────────────────────────────────────────────────────────
//
// Décrypte la clé API PrestaShop à la demande — la valeur n'est jamais
// sérialisée dans le HTML initial (évite l'exposition dans le payload RSC).

export async function revealPrestashopApiKey(
  integrationId: string
): Promise<{ key: string } | { error: string }> {
  const user = await requireAuth();

  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      tenantId: user.tenant.id,
      type: "PRESTASHOP",
      status: "ACTIVE",
    },
  });

  if (!integration) {
    return { error: "Intégration introuvable ou inactive." };
  }

  const config = (integration.config ?? {}) as Record<string, string>;
  if (!config.api_key) {
    return { error: "Clé API non configurée — reconnectez l'intégration." };
  }

  let key: string;
  try {
    key = decrypt(config.api_key);
  } catch {
    return { error: "Impossible de déchiffrer la clé API — reconnectez l'intégration." };
  }

  // Audit trail (P6) — action légitime, pas un SecurityEvent
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenant.id,
      action: "API_KEY_REVEALED",
      entityType: "Integration",
      entityId: integrationId,
      details: { source: "dashboard", type: "PRESTASHOP" } as Prisma.InputJsonValue,
    },
  });

  return { key };
}

// ─── REVEAL WOOCOMMERCE CREDENTIALS ──────────────────────────────────────────

export async function revealWooCommerceCredentials(
  integrationId: string
): Promise<{ siteUrl: string; consumerKey: string; webhookSecret?: string } | { error: string }> {
  const user = await requireAuth();

  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      tenantId: user.tenant.id,
      type: "WOOCOMMERCE",
      status: "ACTIVE",
    },
  });

  if (!integration) {
    return { error: "Intégration introuvable ou inactive." };
  }

  const config = (integration.config ?? {}) as Record<string, string>;
  if (!config.consumer_key || !config.site_url) {
    return { error: "Credentials non configurés — reconnectez l'intégration." };
  }

  let consumerKey: string;
  try {
    consumerKey = decrypt(config.consumer_key);
  } catch {
    return { error: "Impossible de déchiffrer la clé — reconnectez l'intégration." };
  }

  let webhookSecret: string | undefined;
  if (config.webhook_secret) {
    try {
      webhookSecret = decrypt(config.webhook_secret);
    } catch {
      // webhook_secret absent ou corrompu — non bloquant
    }
  }

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenant.id,
      action: "API_KEY_REVEALED",
      entityType: "Integration",
      entityId: integrationId,
      details: { source: "dashboard", type: "WOOCOMMERCE" } as Prisma.InputJsonValue,
    },
  });

  return { siteUrl: config.site_url, consumerKey, webhookSecret };
}


// ─── REGENERATE WOOCOMMERCE WEBHOOK SECRET ────────────────────────────────────

export async function regenerateWooCommerceWebhookSecret(
  integrationId: string
): Promise<{ webhookSecret: string } | { error: string }> {
  const user = await requireAuth();

  const integration = await prisma.integration.findFirst({
    where: {
      id: integrationId,
      tenantId: user.tenant.id,
      type: "WOOCOMMERCE",
      status: "ACTIVE",
    },
  });

  if (!integration) {
    return { error: "Intégration introuvable ou inactive." };
  }

  const config = (integration.config ?? {}) as Record<string, string>;
  const newSecret = randomBytes(32).toString("hex");

  await prisma.integration.update({
    where: { id: integrationId },
    data: { config: { ...config, webhook_secret: encrypt(newSecret) } },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenant.id,
      action: "API_KEY_REVEALED",
      entityType: "Integration",
      entityId: integrationId,
      details: {
        source: "dashboard",
        type: "WOOCOMMERCE",
        action: "webhook_secret_regenerated",
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/integrations");
  return { webhookSecret: newSecret };
}

// ─── DISCONNECT ───────────────────────────────────────────────────────────────

export async function disconnectIntegration(integrationId: string) {
  const user = await requireAuth();

  // Vérifier que l'intégration appartient bien au tenant de l'utilisateur
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenantId: user.tenant.id },
  });

  if (!integration) {
    return { error: "Intégration introuvable." };
  }

  await prisma.integration.update({
    where: { id: integrationId },
    data: { status: "DISCONNECTED" },
  });

  revalidatePath("/integrations");
  return { success: true };
}
