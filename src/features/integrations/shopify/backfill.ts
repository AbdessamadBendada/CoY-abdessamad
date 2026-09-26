import { createJobsClient } from "@/shared/db/prisma";
import { decrypt } from "@/shared/security/crypto";
import { log, reportError } from "@/shared/observability/logger";

type ShopifyNode = { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null; totalPriceSet?: { shopMoney?: { amount?: string; currencyCode?: string } }; createdAt?: string; displayFinancialStatus?: string; cancelledAt?: string | null; customer?: ShopifyNode | null };
type Page = { edges: Array<{ cursor: string; node: ShopifyNode }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

const CUSTOMER_QUERY = `query Customers($cursor: String) { customers(first: 100, after: $cursor) { edges { cursor node { id email firstName lastName phone } } pageInfo { hasNextPage endCursor } } }`;
const ORDER_QUERY = `query Orders($cursor: String) { orders(first: 100, after: $cursor, sortKey: CREATED_AT) { edges { cursor node { id email createdAt cancelledAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } customer { id email firstName lastName phone } } } pageInfo { hasNextPage endCursor } } }`;

function externalId(id: string) { return id.split("/").at(-1) ?? id; }

async function query(shop: string, token: string, body: string, cursor: string | null) {
  const response = await fetch(`https://${shop}/admin/api/2026-01/graphql.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query: body, variables: { cursor } }), signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Shopify backfill request failed: ${response.status}`);
  const json = await response.json() as { data?: { customers?: Page; orders?: Page }; errors?: unknown };
  if (json.errors || !json.data) throw new Error("Shopify GraphQL returned errors");
  return json.data.customers ?? json.data.orders!;
}

async function upsertCustomer(prisma: ReturnType<typeof createJobsClient>, tenantId: string, integrationId: string, value: ShopifyNode) {
  if (!value.email) return false;
  await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email: value.email } },
    create: { tenantId, integrationId, externalId: externalId(value.id), email: value.email, firstName: value.firstName ?? null, lastName: value.lastName ?? null, phone: value.phone ?? null },
    update: { integrationId, firstName: value.firstName ?? undefined, lastName: value.lastName ?? undefined, phone: value.phone ?? undefined },
  });
  return true;
}

/** Processes exactly one bounded GraphQL page. Safe to resume after a retry. */
export async function runShopifyBackfill(integrationId: string) {
  const prisma = createJobsClient();
  try {
    const integration = await prisma.integration.findFirst({ where: { id: integrationId, type: "SHOPIFY", status: "ACTIVE", backfillStatus: "RUNNING" } });
    if (!integration) return { status: "skipped" as const };
    const config = (integration.config ?? {}) as Record<string, string>;
    if (!config.shop_domain || !config.access_token) throw new Error("Shopify integration credentials are missing");
    const phase = integration.backfillPhase ?? "CUSTOMERS";
    const page = await query(config.shop_domain, decrypt(config.access_token), phase === "CUSTOMERS" ? CUSTOMER_QUERY : ORDER_QUERY, integration.backfillCursor);
    let importedCustomers = 0; let importedOrders = 0;
    for (const { node } of page.edges) {
      if (phase === "CUSTOMERS") { if (await upsertCustomer(prisma, integration.tenantId, integration.id, node)) importedCustomers++; continue; }
      const identity = node.customer ?? node;
      if (!identity.email) continue;
      await upsertCustomer(prisma, integration.tenantId, integration.id, identity);
      const customer = await prisma.customer.findUnique({ where: { tenantId_email: { tenantId: integration.tenantId, email: identity.email } }, select: { id: true } });
      if (!customer || !node.createdAt) continue;
      const paid = node.displayFinancialStatus === "PAID";
      const refunded = /REFUND/i.test(node.displayFinancialStatus ?? "");
      await prisma.order.upsert({ where: { tenantId_externalId_source: { tenantId: integration.tenantId, externalId: externalId(node.id), source: "SHOPIFY" } },
        create: { tenantId: integration.tenantId, customerId: customer.id, externalId: externalId(node.id), source: "SHOPIFY", status: node.cancelledAt ? "CANCELLED" : refunded ? "REFUNDED" : paid ? "CONFIRMED" : "PENDING", amount: Number(node.totalPriceSet?.shopMoney?.amount ?? 0), currency: node.totalPriceSet?.shopMoney?.currencyCode ?? "EUR", isReturn: refunded, orderedAt: new Date(node.createdAt) },
        update: { amount: Number(node.totalPriceSet?.shopMoney?.amount ?? 0), status: node.cancelledAt ? "CANCELLED" : refunded ? "REFUNDED" : paid ? "CONFIRMED" : "PENDING", isReturn: refunded }, });
      importedOrders++;
    }
    const nextPhase = page.pageInfo.hasNextPage ? phase : phase === "CUSTOMERS" ? "ORDERS" : null;
    await prisma.integration.update({ where: { id: integration.id }, data: {
      backfillPhase: nextPhase, backfillCursor: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
      backfillStatus: nextPhase ? "RUNNING" : "COMPLETED", backfillCompletedAt: nextPhase ? null : new Date(), lastSyncAt: new Date(), lastError: null, lastErrorAt: null,
      backfillCustomersImported: { increment: importedCustomers }, backfillOrdersImported: { increment: importedOrders },
    } });
    log("info", "integration.shopify.backfill_page", { integrationId, tenantId: integration.tenantId, phase, importedCustomers, importedOrders, hasMore: Boolean(nextPhase) });
    return { status: nextPhase ? "running" as const : "completed" as const, importedCustomers, importedOrders };
  } catch (error) {
    await prisma.integration.updateMany({ where: { id: integrationId }, data: { backfillStatus: "FAILED", lastError: "Historical Shopify import failed", lastErrorAt: new Date() } });
    reportError("integration.shopify.backfill_failed", error, { integrationId, provider: "shopify" });
    throw error;
  } finally { await prisma.$disconnect(); }
}
