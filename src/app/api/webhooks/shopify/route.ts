import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/db/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { checkAttribution } from "@/features/analytics/check-attribution";
import { decrypt } from "@/shared/security/crypto";
import { logSecurityEvent } from "@/shared/security/events/log-event";
import { sendSystemEmail } from "@/features/messaging/brevo/send-system-email";

// ─── Types payload Shopify ─────────────────────────────────────────────────

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

interface ShopifyOrder {
  id: number;
  email: string;
  customer?: ShopifyCustomer | null;
  total_price: string;
  financial_status: string; // paid | refunded | partially_refunded | pending | voided
  fulfillment_status: string | null; // fulfilled | null
  created_at: string;
  cancelled_at: string | null;
}

// ─── Validation HMAC Shopify ──────────────────────────────────────────────

function validateShopifyHmac(rawBody: string, secret: string, signature: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Mapping financial_status → OrderStatus ──────────────────────────────

function mapOrderStatus(financialStatus: string, cancelledAt: string | null): "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURNED" | "REFUNDED" | "CANCELLED" {
  if (cancelledAt) return "CANCELLED";
  if (financialStatus === "refunded") return "REFUNDED";
  if (financialStatus === "partially_refunded") return "RETURNED";
  if (financialStatus === "paid") return "CONFIRMED";
  if (financialStatus === "pending") return "PENDING";
  return "CONFIRMED";
}

// ─── Recalcul des stats Customer depuis la table orders ───────────────────
// Exclut isReturn=true (retours/remboursements) ET status=CANCELLED.

async function recalcCustomerStats(customerId: string, tx: Prisma.TransactionClient) {
  const agg = await tx.order.aggregate({
    where: { customerId, isReturn: false, status: { not: "CANCELLED" } },
    _count: { id: true },
    _sum: { amount: true },
    _max: { orderedAt: true },
  });

  const totalOrders = agg._count.id;
  const totalSpent = agg._sum.amount ?? 0;
  const lastOrderAt = agg._max.orderedAt;
  const averageBasket = totalOrders > 0 ? Number(totalSpent) / totalOrders : 0;

  await tx.customer.update({
    where: { id: customerId },
    data: {
      totalOrders,
      totalSpent,
      lastOrderAt,
      averageBasket,
      ltv: totalSpent, // MVP — LTV = total dépensé
    },
  });
}

// ─── POST /api/webhooks/shopify?tenantId=xxx ──────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const integrationId = searchParams.get("integrationId");

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId manquant" }, { status: 400 });
  }

  const rawBody = await request.text();
  const topic = request.headers.get("X-Shopify-Topic") ?? "";

  // Récupérer l'intégration Shopify active par son ID opaque
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, type: "SHOPIFY", status: "ACTIVE" },
    include: { tenant: { select: { sector: true } } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Intégration Shopify introuvable ou inactive" }, { status: 404 });
  }

  const tenantId = integration.tenantId;

  // Valider la signature HMAC — obligatoire (toute intégration OAuth possède webhook_secret)
  const config = (integration.config ?? {}) as Record<string, string>;
  if (!config.webhook_secret) {
    console.error(`[webhook/shopify] webhook_secret absent pour tenant ${tenantId} — configuration incomplète`);
    return NextResponse.json({ error: "Configuration incomplète" }, { status: 500 });
  }
  const signature = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  if (!validateShopifyHmac(rawBody, decrypt(config.webhook_secret), signature)) {
    await logSecurityEvent({
      event: "HMAC_FAILURE",
      severity: "CRITICAL",
      tenantId,
      request,
      details: { integration: "shopify" },
    });
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  // Parser le payload
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  // ── Traitement selon le topic ─────────────────────────────────────────

  if (topic === "orders/create" || topic === "orders/updated") {
    const order = payload as ShopifyOrder;

    const email = order.customer?.email ?? order.email;
    if (!email) return NextResponse.json({ received: true });

    // Upsert Customer
    const customer = await prisma.customer.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: {
        tenantId,
        integrationId: integration.id,
        externalId: String(order.customer?.id ?? email),
        email,
        firstName: order.customer?.first_name ?? null,
        lastName: order.customer?.last_name ?? null,
        phone: order.customer?.phone ?? null,
      },
      update: {
        firstName: order.customer?.first_name ?? undefined,
        lastName: order.customer?.last_name ?? undefined,
        phone: order.customer?.phone ?? undefined,
      },
    });

    // Upsert Order + recalcul stats — atomique dans une transaction
    const isReturn =
      order.financial_status === "refunded" ||
      order.financial_status === "partially_refunded";
    const amount = parseFloat(order.total_price) || 0;

    await prisma.$transaction(async (tx) => {
      await tx.order.upsert({
        where: {
          tenantId_externalId_source: {
            tenantId,
            externalId: String(order.id),
            source: "SHOPIFY",
          },
        },
        create: {
          tenantId,
          customerId: customer.id,
          externalId: String(order.id),
          source: "SHOPIFY",
          status: mapOrderStatus(order.financial_status, order.cancelled_at),
          amount,
          isReturn,
          orderedAt: new Date(order.created_at),
        },
        update: {
          status: mapOrderStatus(order.financial_status, order.cancelled_at),
          amount,
          isReturn,
        },
      });

      await recalcCustomerStats(customer.id, tx);
      // Attribution conversion : si le client avait une action WinBack en cours → CONVERTED
      if (!isReturn) {
        await checkAttribution(customer.id, amount, isReturn, tx, integration.tenant.sector);
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "ORDER_SYNCED",
        entityType: "Order",
        entityId: String(order.id),
        details: {
          source: "SHOPIFY_WEBHOOK",
          topic,
          shopifyOrderId: order.id,
          amount,
          isReturn,
        } as Prisma.InputJsonValue,
      },
    });
  } else if (topic === "customers/update") {
    const shopifyCustomer = payload as ShopifyCustomer;

    if (!shopifyCustomer.email) return NextResponse.json({ received: true });

    await prisma.customer.upsert({
      where: { tenantId_email: { tenantId, email: shopifyCustomer.email } },
      create: {
        tenantId,
        integrationId: integration.id,
        externalId: String(shopifyCustomer.id),
        email: shopifyCustomer.email,
        firstName: shopifyCustomer.first_name ?? null,
        lastName: shopifyCustomer.last_name ?? null,
        phone: shopifyCustomer.phone ?? null,
      },
      update: {
        firstName: shopifyCustomer.first_name ?? undefined,
        lastName: shopifyCustomer.last_name ?? undefined,
        phone: shopifyCustomer.phone ?? undefined,
      },
    });
  } else if (topic === "app/scopes_update") {
    const scopesPayload = payload as { previous_scopes: string; updated_scopes: string };
    const shopDomain = config.shop_domain ?? "";

    // Échappement HTML pour éviter l'injection dans les emails
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // 1. AuditLog
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "SHOPIFY_SCOPES_UPDATED",
        entityType: "Integration",
        entityId: integration.id,
        details: {
          previous_scopes: scopesPayload.previous_scopes,
          updated_scopes: scopesPayload.updated_scopes,
          shop_domain: shopDomain,
        } as Prisma.InputJsonValue,
      },
    });

    // 2. Email tenant owner
    const owner = await prisma.user.findFirst({
      where: { tenantId, role: "OWNER" },
      select: { email: true, firstName: true },
    });
    if (owner?.email) {
      sendSystemEmail({
        to: owner.email,
        toName: owner.firstName ?? "",
        subject: `[WinBack] Boutique Shopify re-autorisée — ${esc(shopDomain)}`,
        html: `<p>Bonjour ${esc(owner.firstName ?? "")},</p>
               <p>Votre boutique <strong>${esc(shopDomain)}</strong> a bien été re-autorisée
               avec les nouveaux accès WinBack (<code>${esc(scopesPayload.updated_scopes)}</code>).</p>
               <p>Aucune action supplémentaire n'est requise.</p>`,
      });
    }

    // 3. Alerte interne
    const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
    if (alertEmail) {
      sendSystemEmail({
        to: alertEmail,
        toName: "WinBack Alerts",
        subject: `[WinBack] Shopify scopes_update — tenant ${tenantId} / ${esc(shopDomain)}`,
        html: `<p>Scopes précédents : ${esc(scopesPayload.previous_scopes)}</p>
               <p>Nouveaux scopes : ${esc(scopesPayload.updated_scopes)}</p>`,
      });
    }
  }
  // Événements non gérés — acquitter silencieusement

  return NextResponse.json({ received: true });
}
