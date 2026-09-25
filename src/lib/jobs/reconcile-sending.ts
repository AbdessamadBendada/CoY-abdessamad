import { createJobsClient } from "@/lib/prisma";

// ─── runReconcileSending ──────────────────────────────────────────────────────
//
// Détecte les WinbackAction bloquées en SENDING > 5 min (crash serverless Vercel
// entre le claim TOCTOU-safe et la mise à jour DB finale) et les passe en FAILED.
// Appelé par le Trigger.dev scheduled task ET par /api/cron/reconcile-sending.
// Utilise DIRECT_URL (port 5432) pour éviter les conflits PgBouncer 42P05.

export async function runReconcileSending(): Promise<{ reconciled: number }> {
  const prisma = createJobsClient();
  try {
    const threshold = new Date(Date.now() - 5 * 60 * 1000); // Vercel Pro timeout max = 5 min
    const result = await prisma.winbackAction.updateMany({
      where: {
        status: "SENDING",
        updatedAt: { lte: threshold },
        sentAt: null, // guard défensif : sentAt et status:SENT sont atomiques en DB
      },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: "SENDING_TIMEOUT",
      },
    });
    console.log(`[job/reconcile-sending] ${result.count} action(s) gelée(s) → FAILED`);
    return { reconciled: result.count };
  } finally {
    await prisma.$disconnect();
  }
}
