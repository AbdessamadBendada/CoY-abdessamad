import { schedules } from "@trigger.dev/sdk";
import { runSyncPrestaShop } from "@/features/integrations/prestashop/sync";

export const syncPrestaShopTask = schedules.task({
  id: "sync-prestashop",
  cron: { pattern: "*/30 * * * *", timezone: "UTC" },
  run: async () => {
    const result = await runSyncPrestaShop();
    console.log(
      `[trigger/sync-prestashop] synced: ${result.synced}, errors: ${result.errors}`
    );
    return result;
  },
});
