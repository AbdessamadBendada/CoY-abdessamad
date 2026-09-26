import { getAppUrl } from "@/shared/utils/get-app-url";

const APP_URL = getAppUrl();

const WEBHOOK_TOPICS = ["orders/create", "orders/updated", "customers/update", "app/scopes_update"] as const;

interface ShopifyWebhookResponse {
  webhook?: { id: number; topic: string };
  errors?: Record<string, string[]>;
}

export async function registerShopifyWebhooks(
  shopDomain: string,
  accessToken: string,
  integrationId: string
): Promise<void> {
  const webhookUrl = `${APP_URL}/api/webhooks/shopify?integrationId=${integrationId}`;

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const res = await fetch(
        `https://${shopDomain}/admin/api/2026-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: webhookUrl,
              format: "json",
            },
          }),
        }
      );

      if (!res.ok) {
        const body = (await res.json()) as ShopifyWebhookResponse;
        // 422 = webhook déjà enregistré — acceptable, on continue
        if (res.status !== 422) {
          console.error(`[Shopify Webhooks] Erreur pour ${topic}:`, body.errors);
        }
      }
    } catch (err) {
      console.error(`[Shopify Webhooks] Échec réseau pour ${topic}:`, err);
    }
  }
}
