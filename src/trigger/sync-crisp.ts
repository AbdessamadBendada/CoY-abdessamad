import { schedules } from "@trigger.dev/sdk";
import { runSyncCrisp } from "@/features/integrations/crisp/sync";

export const syncCrispTask = schedules.task({
  id: "sync-crisp",
  cron: { pattern: "*/30 * * * *", timezone: "UTC" },
  run: async () => {
    const result = await runSyncCrisp();
    console.log(
      `[trigger/sync-crisp] synced: ${result.synced}, errors: ${result.errors}`
    );
    return result;
  },
});
