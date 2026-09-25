-- AlterTable: add optedOutAt and optOutToken to Customer
ALTER TABLE "customers" ADD COLUMN "optedOutAt" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN "optOutToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_optOutToken_key" ON "customers"("optOutToken");
