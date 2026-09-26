-- Durable claim/retry metadata lets independent Trigger.dev workers recover
-- after a crash without double-processing a customer or action.
ALTER TABLE "customers"
  ADD COLUMN "scoringClaimedAt" TIMESTAMP(3),
  ADD COLUMN "scoringAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scoringNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "scoringLastError" TEXT;

ALTER TABLE "winback_actions"
  ADD COLUMN "sendingClaimedAt" TIMESTAMP(3),
  ADD COLUMN "sendAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextSendAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastSendError" TEXT;

CREATE TABLE "background_cursors" (
  "key" TEXT NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "background_cursors_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "customers_tenantId_lastScoredAt_idx" ON "customers"("tenantId", "lastScoredAt");
CREATE INDEX "customers_scoringClaimedAt_idx" ON "customers"("scoringClaimedAt");
CREATE INDEX "customers_scoringNextAttemptAt_idx" ON "customers"("scoringNextAttemptAt");
CREATE INDEX "winback_actions_status_scheduledAt_idx" ON "winback_actions"("status", "scheduledAt");
CREATE INDEX "winback_actions_nextSendAttemptAt_idx" ON "winback_actions"("nextSendAttemptAt");
