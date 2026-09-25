import { schedules } from "@trigger.dev/sdk";
import { runSendScheduled } from "@/lib/jobs/send-scheduled";

export const sendScheduledTask = schedules.task({
  id: "send-scheduled",
  cron: { pattern: "0 * * * *", timezone: "UTC" },
  run: async () => {
    const result = await runSendScheduled();
    console.log(
      `[trigger/send-scheduled] processed: ${result.processed}, sent: ${result.sent}, failed: ${result.failed}, skipped: ${result.skipped}`
    );
    return result;
  },
});
