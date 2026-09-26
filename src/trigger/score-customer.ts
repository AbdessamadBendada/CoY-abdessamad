import { queue, task } from "@trigger.dev/sdk";
import { createJobsClient } from "@/lib/prisma";
import { processScoringCustomer } from "@/lib/jobs/score-customers";
import { backgroundProcessing } from "@/lib/config/background-processing";

export const scoringQueue = queue({
  name: "coy-scoring",
  concurrencyLimit: backgroundProcessing.scoringConcurrency,
});

// One run per customer keeps AI work short, retryable and independently visible.
export const scoreCustomerTask = task({
  id: "score-customer",
  queue: scoringQueue,
  retry: { maxAttempts: 1 }, // Database retry metadata is authoritative.
  run: async (payload: { customerId: string; tenantId: string }) => {
    const prisma = createJobsClient();
    try {
      return { result: await processScoringCustomer(prisma, payload) };
    } finally {
      await prisma.$disconnect();
    }
  },
});
