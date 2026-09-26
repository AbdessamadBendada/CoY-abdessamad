import { schedules, tasks } from "@trigger.dev/sdk";
import { createJobsClient } from "@/shared/db/prisma";
import { dispatchScheduledActions } from "@/features/messaging/dispatch";
import { sendScheduledActionTask } from "./send-scheduled-action";

export const sendScheduledTask = schedules.task({
  id: "send-scheduled",
  cron: { pattern: "*/5 * * * *", timezone: "UTC" },
  run: async () => {
    const prisma = createJobsClient();
    try {
      const result = await dispatchScheduledActions(prisma);
      if (result.actions.length > 0) {
        await tasks.batchTrigger<typeof sendScheduledActionTask>("send-scheduled-action", result.actions.map((action) => ({
          payload: { actionId: action.id, tenantId: action.tenantId },
          options: {
            concurrencyKey: action.tenantId,
            idempotencyKey: `send:${action.id}:${action.sendAttempts}`,
            idempotencyKeyTTL: "24h",
            maxAttempts: 1,
          },
        })));
      }
      console.log(`[trigger/send-scheduled] ${result.actions.length} worker(s) queued across ${result.tenantCount} tenant(s)`);
      return result;
    } finally {
      await prisma.$disconnect();
    }
  },
});
