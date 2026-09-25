import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getAppUrl } from "@/lib/utils/get-app-url";

const APP_URL = getAppUrl();

const WEBHOOK_TOPICS = ["ticket-created", "ticket-updated"] as const;

interface GorgiasWebhookResponse {
  data?: {
    id:     number;
    secret: string;
  };
  errors?: unknown;
}

export async function registerGorgiasWebhooks(
  subdomain:     string,
  accessToken:   string,
  integrationId: string
): Promise<void> {
  const webhookUrl = `${APP_URL}/api/webhooks/gorgias?integrationId=${integrationId}`;

  let webhookSecret: string | null = null;

  for (const topic of WEBHOOK_TOPICS) {
    try {
      const res = await fetch(
        `https://${subdomain}.gorgias.com/api/webhooks`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            events: [{ name: topic }],
            url:    webhookUrl,
          }),
        }
      );

      if (!res.ok) {
        const body = (await res.json()) as GorgiasWebhookResponse;
        console.error(`[Gorgias Webhooks] Erreur pour ${topic}:`, body.errors);
        continue;
      }

      const body = (await res.json()) as GorgiasWebhookResponse;

      // Stocker le secret retourné par le premier webhook créé
      if (body.data?.secret && !webhookSecret) {
        webhookSecret = body.data.secret;
      }
    } catch (err) {
      console.error(`[Gorgias Webhooks] Échec réseau pour ${topic}:`, err);
    }
  }

  // Mettre à jour le webhook_secret dans la config de l'intégration si obtenu
  if (webhookSecret) {
    try {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        select: { config: true },
      });
      const existingConfig = (integration?.config ?? {}) as Record<string, string>;
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          config: {
            ...existingConfig,
            webhook_secret: encrypt(webhookSecret),
          },
        },
      });
    } catch (err) {
      console.error("[Gorgias Webhooks] Échec mise à jour webhook_secret:", err);
    }
  }
}
