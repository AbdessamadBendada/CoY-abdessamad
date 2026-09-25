-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "guaranteeExtendedUntil" TIMESTAMP(3),
ADD COLUMN     "guaranteeExtensionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastBillingEventAt" TIMESTAMP(3),
ADD COLUMN     "setupFeeWaived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);
