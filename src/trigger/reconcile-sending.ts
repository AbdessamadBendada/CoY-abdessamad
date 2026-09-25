import { schedules } from "@trigger.dev/sdk";
import { runReconcileSending } from "@/lib/jobs/reconcile-sending";

export const reconcileSendingTask = schedules.task({
  id: "reconcile-sending",
  cron: { pattern: "*/5 * * * *", timezone: "UTC" },
  run: async () => {
    const result = await runReconcileSending();
    console.log(`[trigger/reconcile-sending] ${result.reconciled} action(s) réconciliée(s)`);
    return result;
  },
});
