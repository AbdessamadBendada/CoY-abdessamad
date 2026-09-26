CREATE TYPE "BackfillStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'COMPLETED', 'FAILED');

ALTER TABLE "integrations"
  ADD COLUMN "backfillStatus" "BackfillStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "backfillPhase" TEXT,
  ADD COLUMN "backfillCursor" TEXT,
  ADD COLUMN "backfillStartedAt" TIMESTAMP(3),
  ADD COLUMN "backfillCompletedAt" TIMESTAMP(3),
  ADD COLUMN "backfillCustomersImported" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "backfillOrdersImported" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "integrations_type_backfillStatus_idx" ON "integrations"("type", "backfillStatus");
