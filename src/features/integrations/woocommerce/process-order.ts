import { prisma } from "@/shared/db/prisma";
import type { Prisma } from "@prisma/client";
import { checkAttribution } from "@/features/analytics/check-attribution";

// ─── Types payload WooCommerce ─────────────────────────────────────────────

export interface WooCommerceBilling {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

export interface WooCommerceRefund {
  id: number;
}

export interface WooCommerceOrderPayload {
  id: number;
  status: string;
  total: string;
  date_created: string; // ISO 8601
  billing: WooCommerceBilling;
  refunds?: WooCommerceRefund[];
}

// ─── Mapping status WooCommerce → OrderStatus ─────────────────────────────

export function mapWooCommerceStatus(
  status: string
): "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURNED" | "REFUNDED" | "CANCELLED" {
  switch (status) {
    case "completed":    return "DELIVERED";
    case "processing":   return "CONFIRMED";
    case "shipped":      return "SHIPPED";
    case "cancelled":    return "CANCELLED";
    case "refunded":     return "REFUNDED";
    case "failed":       return "CANCELLED";
    default:             return "PENDING";
  }
}

// ─── Recalcul des stats Customer depuis la table orders ───────────────────

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
      ltv: totalSpent,
    },
  });
}

// ─── processWooCommerceOrder ──────────────────────────────────────────────
//
// Logique partagée appelée par le polling cron.
// Requiert que payload.billing.email soit présent.

export async function processWooCommerceOrder(
  tenantId: string,
  integrationId: string,
  tenantSector: string,
  payload: WooCommerceOrderPayload
): Promise<void> {
  if (!payload.id) return;

  const email = payload.billing?.email;
  if (!email) return;

  const phone = payload.billing.phone ?? null;

  // Upsert Customer
  const customer = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: {
      tenantId,
      integrationId,
      externalId: String(payload.id),
      email,
      firstName: payload.billing.first_name ?? null,
      lastName: payload.billing.last_name ?? null,
      phone,
    },
    update: {
      firstName: payload.billing.first_name ?? undefined,
      lastName: payload.billing.last_name ?? undefined,
      phone: phone ?? undefined,
    },
  });

  // Upsert Order + recalcul stats — atomique dans une transaction
  const orderStatus = mapWooCommerceStatus(payload.status);
  const isReturn = (payload.refunds?.length ?? 0) > 0 || payload.status === "refunded";
  const amount = parseFloat(payload.total) || 0;
  const orderedAt = new Date(payload.date_created);

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: {
        tenantId_externalId_source: {
          tenantId,
          externalId: String(payload.id),
          source: "WOOCOMMERCE",
        },
      },
      create: {
        tenantId,
        customerId: customer.id,
        externalId: String(payload.id),
        source: "WOOCOMMERCE",
        status: orderStatus,
        amount,
        isReturn,
        orderedAt,
      },
      update: {
        status: orderStatus,
        amount,
        isReturn,
      },
    });

    await recalcCustomerStats(customer.id, tx);
    if (!isReturn) {
      await checkAttribution(customer.id, amount, isReturn, tx, tenantSector);
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "ORDER_SYNCED",
      entityType: "Order",
      entityId: String(payload.id),
      details: {
        source: "WOOCOMMERCE_POLLING",
        woocommerceOrderId: payload.id,
        amount,
        isReturn,
        status: payload.status,
      } as Prisma.InputJsonValue,
    },
  });
}
