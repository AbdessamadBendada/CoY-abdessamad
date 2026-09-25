import { createJobsClient } from "@/lib/prisma";

// ─── runCleanupCooldowns ──────────────────────────────────────────────────────
//
// Réinitialise cooldownUntil = null pour les clients dont le cooldown est expiré.
// Appelé par le Trigger.dev scheduled task ET par /api/cron/cleanup-cooldowns.
// Utilise DIRECT_URL (port 5432) pour éviter les conflits PgBouncer 42P05.

export async function runCleanupCooldowns(): Promise<{ cleaned: number }> {
  const prisma = createJobsClient();
  try {
    const result = await prisma.customer.updateMany({
      where: {
        cooldownUntil: { not: null, lte: new Date() },
      },
      data: { cooldownUntil: null },
    });

    console.log(`[job/cleanup-cooldowns] ${result.count} cooldown(s) réinitialisé(s)`);
    return { cleaned: result.count };
  } finally {
    await prisma.$disconnect();
  }
}
