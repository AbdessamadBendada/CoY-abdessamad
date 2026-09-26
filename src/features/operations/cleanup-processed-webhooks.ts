import { createJobsClient } from "@/shared/db/prisma";
import { log, reportError } from "@/shared/observability/logger";

const BATCH_SIZE = 500;
const RETENTION_DAYS = 90;

/** Removes only old, successfully processed Stripe event IDs used for deduplication.
 * It never deletes invoices, customers, actions, or unprocessed webhook records. */
export async function cleanupProcessedWebhookEvents() {
  const prisma = createJobsClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  try {
    const records = await prisma.stripeWebhookEvent.findMany({
      where: { processedAt: { not: null, lt: cutoff } },
      select: { id: true }, orderBy: { processedAt: "asc" }, take: BATCH_SIZE,
    });
    if (records.length === 0) return { deleted: 0, hasMore: false };
    const result = await prisma.stripeWebhookEvent.deleteMany({ where: { id: { in: records.map(({ id }) => id) } } });
    log("info", "operations.processed_webhooks_cleaned", { deleted: result.count, cutoff: cutoff.toISOString() });
    return { deleted: result.count, hasMore: records.length === BATCH_SIZE };
  } catch (error) {
    reportError("operations.processed_webhook_cleanup_failed", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
