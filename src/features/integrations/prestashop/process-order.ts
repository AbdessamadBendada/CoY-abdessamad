import { prisma } from "@/shared/db/prisma";
import type { Prisma } from "@prisma/client";
import { checkAttribution } from "@/features/analytics/check-attribution";

// ─── Types payload PrestaShop ──────────────────────────────────────────────

export interface PrestaShopCustomer {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  phone?: string | null;
  phone_mobile?: string | null;
}

export interface PrestaShopOrderPayload {
  id_order: number;
  id_customer: number;
  current_state: number; // état numérique
  total_paid: string;
  date_add: string; // "YYYY-MM-DD HH:MM:SS"
  customer?: PrestaShopCustomer | null;
}

// ─── Mapping current_state → OrderStatus ─────────────────────────────────

export function mapPrestaShopStatus(
  state: number
): "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURNED" | "REFUNDED" | "CANCELLED" {
  if (state === 6) return "DELIVERED";
  if (state === 4 || state === 5) return "SHIPPED";
  if (state === 7) return "CANCELLED";
  if (state === 9) return "REFUNDED";
  if (state === 13) return "RETURNED";
  return "CONFIRMED";
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

// ─── processPrestaShopOrder ───────────────────────────────────────────────
//
// Logique partagée : appelée par le webhook handler et le polling cron.
// Requiert que payload.customer.email soit présent.

export async function processPrestaShopOrder(
  tenantId: string,
  integrationId: string,
  tenantSector: string,
  payload: PrestaShopOrderPayload
): Promise<void> {
  if (!payload.id_order || !payload.id_customer) return;

  const customerData = payload.customer;
  if (!customerData?.email) return;

  const email = customerData.email;
  const phone = customerData.phone_mobile ?? customerData.phone ?? null;

  // Upsert Customer
  const customer = await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: {
      tenantId,
      integrationId,
      externalId: String(payload.id_customer),
      email,
      firstName: customerData.firstname ?? null,
      lastName: customerData.lastname ?? null,
      phone,
    },
    update: {
      firstName: customerData.firstname ?? undefined,
      lastName: customerData.lastname ?? undefined,
      phone: phone ?? undefined,
    },
  });

  // Upsert Order + recalcul stats — atomique dans une transaction
  const orderStatus = mapPrestaShopStatus(payload.current_state);
  const isReturn = orderStatus === "RETURNED" || orderStatus === "REFUNDED";
  const amount = parseFloat(payload.total_paid) || 0;
  const orderedAt = new Date(payload.date_add.replace(" ", "T"));

  await prisma.$transaction(async (tx) => {
    await tx.order.upsert({
      where: {
        tenantId_externalId_source: {
          tenantId,
          externalId: String(payload.id_order),
          source: "PRESTASHOP",
        },
      },
      create: {
        tenantId,
        customerId: customer.id,
        externalId: String(payload.id_order),
        source: "PRESTASHOP",
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
      entityId: String(payload.id_order),
      details: {
        source: "PRESTASHOP_WEBHOOK",
        prestashopOrderId: payload.id_order,
        amount,
        isReturn,
        currentState: payload.current_state,
      } as Prisma.InputJsonValue,
    },
  });
}
