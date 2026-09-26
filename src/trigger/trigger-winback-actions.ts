import { schedules } from "@trigger.dev/sdk";
import { runTriggerWinbackActions } from "@/features/winback/trigger-actions";

export const triggerWinbackActionsTask = schedules.task({
  id: "trigger-winback-actions",
  cron: { pattern: "0 * * * *", timezone: "UTC" },
  run: async () => {
    const result = await runTriggerWinbackActions();
    console.log(
      `[trigger/trigger-winback-actions] triggered: ${result.triggered}, skipped: ${result.skipped}, errors: ${result.errors}`
    );
    return result;
  },
});
