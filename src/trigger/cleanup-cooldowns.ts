import { schedules } from "@trigger.dev/sdk";
import { runCleanupCooldowns } from "@/features/winback/cleanup-cooldowns";

export const cleanupCooldownsTask = schedules.task({
  id: "cleanup-cooldowns",
  cron: { pattern: "0 3 * * *", timezone: "UTC" },
  run: async () => {
    const result = await runCleanupCooldowns();
    console.log(`[trigger/cleanup-cooldowns] ${result.cleaned} cooldown(s) nettoyé(s)`);
    return result;
  },
});
