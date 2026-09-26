import { queue, task } from "@trigger.dev/sdk";
import { runSendScheduled } from "@/lib/jobs/send-scheduled";
import { backgroundProcessing } from "@/lib/config/background-processing";

export const messageQueue = queue({
  name: "coy-message-delivery",
  concurrencyLimit: backgroundProcessing.messageConcurrency,
});

// The durable action claim, rather than a process-local lock, prevents a
// duplicate send when Trigger.dev redelivers this payload.
export const sendScheduledActionTask = task({
  id: "send-scheduled-action",
  queue: messageQueue,
  retry: { maxAttempts: 1 },
  run: async (payload: { actionId: string; tenantId: string }) => {
    const result = await runSendScheduled({ actionIds: [payload.actionId] });
    return { actionId: payload.actionId, tenantId: payload.tenantId, ...result };
  },
});
