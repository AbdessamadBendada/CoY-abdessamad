import { schedules, tasks } from "@trigger.dev/sdk";
import { createJobsClient } from "@/lib/prisma";
import { dispatchScoreCustomers } from "@/lib/jobs/score-customers";
import { scoreCustomerTask } from "./score-customer";

export const scoreCustomersTask = schedules.task({
  id: "score-customers",
  cron: { pattern: "*/5 * * * *", timezone: "UTC" },
  run: async () => {
    const prisma = createJobsClient();
    try {
      const result = await dispatchScoreCustomers(prisma);
      if (result.candidates.length > 0) {
        await tasks.batchTrigger<typeof scoreCustomerTask>("score-customer", result.candidates.map((candidate) => ({
          payload: { customerId: candidate.id, tenantId: candidate.tenantId },
          options: {
            concurrencyKey: candidate.tenantId,
            idempotencyKey: `score:${candidate.id}:${candidate.lastScoredAt?.toISOString() ?? "never"}`,
            idempotencyKeyTTL: "10m",
            maxAttempts: 1,
          },
        })));
      }
      console.log(`[trigger/score-customers] ${result.candidates.length} worker(s) queued across ${result.tenantCount} tenant(s)`);
      return { queued: result.candidates.length, tenants: result.tenantCount, oldestEligibleAt: result.oldestEligibleAt };
    } finally {
      await prisma.$disconnect();
    }
  },
});
