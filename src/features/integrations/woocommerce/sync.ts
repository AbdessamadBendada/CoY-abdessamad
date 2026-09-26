import { createJobsClient } from "@/shared/db/prisma";
import { decrypt } from "@/shared/security/crypto";
import {
  processWooCommerceOrder,
  type WooCommerceOrderPayload,
} from "@/features/integrations/woocommerce/process-order";
import { log, reportError } from "@/shared/observability/logger";
import { validateOutboundHttpsUrl } from "@/shared/security/outbound-url";
import { backgroundProcessing } from "@/shared/config/background-processing";

// ─── Validation URL boutique ─────────────────────────────────────────────────

// ─── runSyncWooCommerce ──────────────────────────────────────────────────────
//
// Polling cron (30 min) — récupère les commandes modifiées depuis lastSyncAt.
// Pagination sur per_page=100 jusqu'à page vide.
// Utilise DIRECT_URL (port 5432) via createJobsClient (évite PgBouncer 42P05).

export async function runSyncWooCommerce(): Promise<{ synced: number; errors: number }> {
  const prisma = createJobsClient();
  const now = new Date();
  let totalSynced = 0;
  let totalErrors = 0;

  try {
    const integrations = await prisma.integration.findMany({
      where: { type: "WOOCOMMERCE", status: "ACTIVE" },
      include: { tenant: { select: { sector: true } } },
    });

    for (const integration of integrations) {
      const config = (integration.config ?? {}) as Record<string, string>;
      if (!config.site_url || !config.consumer_key || !config.consumer_secret) continue;

      let siteUrl: string;
      try {
        siteUrl = (await validateOutboundHttpsUrl(config.site_url)).toString().replace(/\/$/, "");
      } catch {
        log("warn", "integration.woocommerce.invalid_url", { integrationId: integration.id, tenantId: integration.tenantId });
        continue;
      }

      const consumerKey = decrypt(config.consumer_key);
      const consumerSecret = decrypt(config.consumer_secret);
      const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const headers = { Authorization: `Basic ${basicAuth}` };

      // First sync is an explicit bounded historical backfill, not a 30-minute
      // lookback. Subsequent runs are incremental and remain paginated.
      const initialBackfill = integration.backfillStatus !== "COMPLETED";
      const since = initialBackfill
        ? new Date(now.getTime() - backgroundProcessing.integrationBackfillDays * 86_400_000)
        : integration.lastSyncAt ?? new Date(now.getTime() - 30 * 60 * 1000);
      const sinceIso = since.toISOString();

      // Pagination : fetch jusqu'à page vide
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        let orders: WooCommerceOrderPayload[] = [];
        try {
          const url = `${siteUrl}/wp-json/wc/v3/orders?modified_after=${encodeURIComponent(sinceIso)}&per_page=100&page=${page}`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
          log("error", "integration.woocommerce.fetch_failed", { integrationId: integration.id, tenantId: integration.tenantId, status: res.status });
            break;
          }
          orders = (await res.json()) as WooCommerceOrderPayload[];
        } catch (err) {
          reportError("integration.woocommerce.fetch_error", err, { integrationId: integration.id, tenantId: integration.tenantId });
          break;
        }

        if (orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            if (!order.billing?.email) {
              console.warn(`[sync-woocommerce] Email absent pour commande #${order.id}, ignorée`);
              continue;
            }
            await processWooCommerceOrder(
              integration.tenantId,
              integration.id,
              integration.tenant.sector ?? "",
              order
            );
            totalSynced++;
          } catch (err) {
            console.error(`[sync-woocommerce] Erreur traitement commande ${order.id}:`, err);
            totalErrors++;
          }
        }

        // Si moins de 100 résultats, on est sur la dernière page
        if (orders.length < 100) hasMore = false;
        else page++;
      }

      // Mettre à jour lastSyncAt
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: now, backfillStatus: initialBackfill ? "COMPLETED" : undefined,
          backfillPhase: initialBackfill ? null : undefined, backfillCompletedAt: initialBackfill ? now : undefined,
          backfillOrdersImported: initialBackfill ? { increment: totalSynced } : undefined },
      });
    }

    console.log(`[sync-woocommerce] ${totalSynced} commande(s) synchronisée(s), ${totalErrors} erreur(s)`);
    return { synced: totalSynced, errors: totalErrors };
  } finally {
    await prisma.$disconnect();
  }
}
