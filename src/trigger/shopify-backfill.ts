import { schedules } from "@trigger.dev/sdk";
import { createJobsClient } from "@/shared/db/prisma";
import { runShopifyBackfill } from "@/features/integrations/shopify/backfill";

export const shopifyBackfillTask = schedules.task({
  id: "shopify-backfill",
  cron: { pattern: "*/5 * * * *", timezone: "UTC" },
  run: async () => {
    const prisma = createJobsClient();
    try {
      const integrations = await prisma.integration.findMany({ where: { type: "SHOPIFY", backfillStatus: "RUNNING", status: "ACTIVE" }, select: { id: true }, take: 20 });
      return Promise.all(integrations.map(({ id }) => runShopifyBackfill(id)));
    } finally { await prisma.$disconnect(); }
  },
});
