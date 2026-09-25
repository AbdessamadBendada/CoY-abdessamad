-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('AUTH_FAILURE', 'HMAC_FAILURE', 'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ROLE', 'SUSPICIOUS_REQUEST');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "event" "SecurityEventType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'MEDIUM',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "path" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_event_idx" ON "security_events"("event");

-- CreateIndex
CREATE INDEX "security_events_tenantId_idx" ON "security_events"("tenantId");

-- CreateIndex
CREATE INDEX "security_events_severity_createdAt_idx" ON "security_events"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_createdAt_idx" ON "security_events"("createdAt");
