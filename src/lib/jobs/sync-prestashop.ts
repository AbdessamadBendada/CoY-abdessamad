import { createJobsClient } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  processPrestaShopOrder,
  type PrestaShopOrderPayload,
  type PrestaShopCustomer,
} from "@/lib/jobs/process-prestashop-order";
import { populateBetaMetricsBaseline } from "@/lib/beta-metrics";

// ─── Types API PrestaShop Webservice ─────────────────────────────────────────

interface PSOrder {
  id: number;
  id_customer: number;
  current_state: number;
  total_paid_tax_incl: string;
  date_add: string;
}

interface PSCustomer {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  phone_mobile?: string;
}

interface PSOrdersResponse {
  orders?: PSOrder[];
}

interface PSCustomerResponse {
  customer?: PSCustomer;
}

// ─── Validation URL boutique ─────────────────────────────────────────────────

function isValidShopUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.hash && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

// ─── runSyncPrestaShop ───────────────────────────────────────────────────────
//
// Polling cron (30 min) — synchro initiale + filet de sécurité pour les
// commandes non reçues via webhook. Utilise DIRECT_URL (port 5432) via
// createJobsClient pour éviter les conflits PgBouncer 42P05.

export async function runSyncPrestaShop(): Promise<{ synced: number; errors: number }> {
  const prisma = createJobsClient();
  const now = new Date();
  let totalSynced = 0;
  let totalErrors = 0;

  try {
    const integrations = await prisma.integration.findMany({
      where: { type: "PRESTASHOP", status: "ACTIVE" },
      include: { tenant: { select: { sector: true } } },
    });

    for (const integration of integrations) {
      const config = (integration.config ?? {}) as Record<string, string>;
      if (!config.api_key || !config.shop_domain) continue;

      const apiKey = decrypt(config.api_key);
      const shopDomain = config.shop_domain.replace(/\/$/, "");

      if (!isValidShopUrl(shopDomain)) {
        console.error(`[sync-prestashop] URL boutique invalide pour intégration ${integration.id}: ${shopDomain}`);
        continue;
      }

      // since = lastSyncAt ou maintenant - 30 minutes (premier run)
      const since = integration.lastSyncAt ?? new Date(now.getTime() - 30 * 60 * 1000);
      const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

      // Autorisation Basic : base64(apiKey:)
      const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
      const headers = { Authorization: `Basic ${basicAuth}` };

      // Récupérer les commandes depuis `since`
      let orders: PSOrder[] = [];
      try {
        const res = await fetch(
          `${shopDomain}/api/orders?output_format=JSON&display=full&filters[date_add][>]=${encodeURIComponent(sinceStr)}`,
          { headers }
        );
        if (!res.ok) {
          console.error(`[sync-prestashop] GET orders failed for tenant ${integration.tenantId}: ${res.status}`);
          continue;
        }
        const body = (await res.json()) as PSOrdersResponse;
        orders = body.orders ?? [];
      } catch (err) {
        console.error(`[sync-prestashop] Fetch orders error for tenant ${integration.tenantId}:`, err);
        continue;
      }

      // Cache Map pour éviter les appels /api/customers/{id} en double
      const customerCache = new Map<number, PSCustomer>();

      for (const order of orders) {
        try {
          // Récupérer le client si pas déjà en cache
          if (!customerCache.has(order.id_customer)) {
            const res = await fetch(
              `${shopDomain}/api/customers/${order.id_customer}?output_format=JSON`,
              { headers }
            );
            if (res.ok) {
              const body = (await res.json()) as PSCustomerResponse;
              if (body.customer) {
                customerCache.set(order.id_customer, body.customer);
              }
            }
          }

          const psCustomer = customerCache.get(order.id_customer);
          if (!psCustomer?.email) {
            console.warn(`[sync-prestashop] Email absent pour id_customer=${order.id_customer}, commande #${order.id} ignorée`);
            continue;
          }

          const customer: PrestaShopCustomer = {
            email: psCustomer.email,
            firstname: psCustomer.firstname ?? null,
            lastname: psCustomer.lastname ?? null,
            phone: psCustomer.phone ?? null,
            phone_mobile: psCustomer.phone_mobile ?? null,
          };

          const payload: PrestaShopOrderPayload = {
            id_order: order.id,
            id_customer: order.id_customer,
            current_state: order.current_state,
            total_paid: order.total_paid_tax_incl,
            date_add: order.date_add,
            customer,
          };

          await processPrestaShopOrder(
            integration.tenantId,
            integration.id,
            integration.tenant.sector ?? "",
            payload
          );

          totalSynced++;
        } catch (err) {
          console.error(`[sync-prestashop] Erreur traitement commande ${order.id}:`, err);
          totalErrors++;
        }
      }

      // Baseline BetaMetrics — fire-and-forget, idempotent (check interne si déjà existant)
      void populateBetaMetricsBaseline(integration.tenantId).catch((err) =>
        console.warn("[sync-prestashop] Erreur baseline BetaMetrics:", err)
      );

      // Mettre à jour lastSyncAt
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: now },
      });
    }

    console.log(`[sync-prestashop] ${totalSynced} commande(s) synchronisée(s), ${totalErrors} erreur(s)`);
    return { synced: totalSynced, errors: totalErrors };
  } finally {
    await prisma.$disconnect();
  }
}
