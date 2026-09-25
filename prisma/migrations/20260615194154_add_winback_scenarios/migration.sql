-- AlterTable
ALTER TABLE "winback_actions" ADD COLUMN     "scenarioId" TEXT;

-- CreateTable
CREATE TABLE "winback_scenarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scoreMin" INTEGER NOT NULL DEFAULT 65,
    "scoreMax" INTEGER NOT NULL DEFAULT 100,
    "channel" "ActionChannel",
    "tone" TEXT NOT NULL DEFAULT 'empathique',
    "vouvoiement" BOOLEAN NOT NULL DEFAULT true,
    "autoSendMode" TEXT NOT NULL DEFAULT 'manual',
    "compensationType" TEXT,
    "compensationValue" DECIMAL(10,2),
    "compensationMaxEur" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "triggersConfig" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "winback_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "winback_scenarios_tenantId_idx" ON "winback_scenarios"("tenantId");

-- CreateIndex
CREATE INDEX "winback_scenarios_tenantId_isActive_idx" ON "winback_scenarios"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "winback_scenarios_tenantId_priority_idx" ON "winback_scenarios"("tenantId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "winback_scenarios_tenantId_name_key" ON "winback_scenarios"("tenantId", "name");

-- CreateIndex
CREATE INDEX "winback_actions_scenarioId_idx" ON "winback_actions"("scenarioId");

-- AddForeignKey
ALTER TABLE "winback_actions" ADD CONSTRAINT "winback_actions_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "winback_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winback_scenarios" ADD CONSTRAINT "winback_scenarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
