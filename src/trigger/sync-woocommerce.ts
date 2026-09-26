import { schedules } from "@trigger.dev/sdk";
import { runSyncWooCommerce } from "@/features/integrations/woocommerce/sync";

export const syncWooCommerceTask = schedules.task({
  id: "sync-woocommerce",
  cron: { pattern: "*/30 * * * *", timezone: "UTC" },
  run: async () => {
    const result = await runSyncWooCommerce();
    console.log(
      `[trigger/sync-woocommerce] synced: ${result.synced}, errors: ${result.errors}`
    );
    return result;
  },
});
