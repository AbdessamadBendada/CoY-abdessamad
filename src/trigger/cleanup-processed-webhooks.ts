import { schedules } from "@trigger.dev/sdk";
import { cleanupProcessedWebhookEvents } from "@/features/operations/cleanup-processed-webhooks";

export const cleanupProcessedWebhooksTask = schedules.task({
  id: "cleanup-processed-webhooks",
  cron: { pattern: "15 3 * * *", timezone: "UTC" },
  run: cleanupProcessedWebhookEvents,
});
