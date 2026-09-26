import { createJobsClient } from "@/lib/prisma";
import { backgroundProcessing } from "@/lib/config/background-processing";

// ─── runReconcileSending ──────────────────────────────────────────────────────
//
// Détecte les WinbackAction bloquées en SENDING > 5 min (crash serverless Vercel
// entre le claim TOCTOU-safe et la mise à jour DB finale) et les passe en FAILED.
// Appelé par le Trigger.dev scheduled task ET par /api/cron/reconcile-sending.
// Utilise DIRECT_URL (port 5432) pour éviter les conflits PgBouncer 42P05.

export async function runReconcileSending(): Promise<{ reconciled: number }> {
  const prisma = createJobsClient();
  try {
    const threshold = new Date(Date.now() - backgroundProcessing.claimLeaseMinutes * 60 * 1000);
    const result = await prisma.winbackAction.updateMany({
      where: {
        status: "SENDING",
        sendingClaimedAt: { lte: threshold },
        sentAt: null, // guard défensif : sentAt et status:SENT sont atomiques en DB
      },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: "DELIVERY_OUTCOME_UNKNOWN",
        lastSendError: "DELIVERY_OUTCOME_UNKNOWN",
        sendingClaimedAt: null,
      },
    });
    console.log(`[job/reconcile-sending] ${result.count} action(s) gelée(s) → FAILED`);
    return { reconciled: result.count };
  } finally {
    await prisma.$disconnect();
  }
}
