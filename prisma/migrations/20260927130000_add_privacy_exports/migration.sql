CREATE TABLE "privacy_exports" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "downloadedAt" TIMESTAMP(3),
  CONSTRAINT "privacy_exports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_exports_requestKey_key" ON "privacy_exports"("requestKey");
CREATE INDEX "privacy_exports_tenantId_customerId_idx" ON "privacy_exports"("tenantId", "customerId");
CREATE INDEX "privacy_exports_expiresAt_idx" ON "privacy_exports"("expiresAt");
ALTER TABLE "privacy_exports" ADD CONSTRAINT "privacy_exports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "privacy_exports" ADD CONSTRAINT "privacy_exports_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
