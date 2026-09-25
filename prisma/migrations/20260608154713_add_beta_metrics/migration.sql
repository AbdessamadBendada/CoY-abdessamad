-- CreateTable
CREATE TABLE "beta_metrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "baselineDate" TIMESTAMP(3) NOT NULL,
    "baselineTotalCustomers" INTEGER NOT NULL DEFAULT 0,
    "baselineChurnRate" DOUBLE PRECISION,
    "baselineLtvAvg" DOUBLE PRECISION,
    "baselineAov" DOUBLE PRECISION,
    "baselineRepeatRate" DOUBLE PRECISION,
    "customersFlaggedAtRisk" INTEGER NOT NULL DEFAULT 0,
    "actionsSent" INTEGER NOT NULL DEFAULT 0,
    "actionsOpened" INTEGER NOT NULL DEFAULT 0,
    "actionsClicked" INTEGER NOT NULL DEFAULT 0,
    "customersRecovered" INTEGER NOT NULL DEFAULT 0,
    "revenueRecovered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vertical" TEXT,
    "brandName" TEXT,
    "consentCaseStudy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_metrics_tenantId_key" ON "beta_metrics"("tenantId");

-- AddForeignKey
ALTER TABLE "beta_metrics" ADD CONSTRAINT "beta_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
