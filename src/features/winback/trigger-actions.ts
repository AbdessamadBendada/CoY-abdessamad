import { createJobsClient } from "@/shared/db/prisma";
import { CHURN_SCORE_DEFAULT_THRESHOLD, COOLDOWN_DAYS_DEFAULT } from "@/config/constants";
import { getAppUrl } from "@/shared/utils/get-app-url";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_ACTIONS_PER_TENANT = 5;  // 0,25 €/tenant max par run (≈ 0,05 €/action Mistral)

// ─── runTriggerWinbackActions ─────────────────────────────────────────────────
//
// Déclenche les actions de récupération pour les clients à risque élevé dont
// aucune action récente n'a été envoyée. Appelle /api/v1/actions/generate pour
// réutiliser toute la chaîne : Timing Agent → Generate → Moderation → Brevo.
//
// Prérequis Trigger.dev env : SCORING_API_KEY + NEXT_PUBLIC_APP_URL
// Appelé par le Trigger.dev scheduled task (quotidien 5h UTC) ET /api/cron/trigger-winback-actions.

export async function runTriggerWinbackActions(): Promise<{
  triggered: number;
  skipped: number;
  errors: number;
}> {
  const prisma = createJobsClient();
  const now = new Date();
  const apiKey = process.env.SCORING_API_KEY;
  const appUrl = getAppUrl();

  if (!apiKey) {
    console.error("[job/trigger-winback-actions] SCORING_API_KEY manquant");
    return { triggered: 0, skipped: 0, errors: 1 };
  }

  let triggered = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true, plan: true, settings: true },
    });

    for (const tenant of tenants) {
      const settings = (tenant.settings ?? {}) as {
        churn_threshold?: number;
        cooldown_days?: number;
      };
      const threshold = settings.churn_threshold ?? CHURN_SCORE_DEFAULT_THRESHOLD;
      const cooldownDays = settings.cooldown_days ?? COOLDOWN_DAYS_DEFAULT;
      const recentActionCutoff = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000);

      const candidates = await prisma.customer.findMany({
        where: {
          tenantId: tenant.id,
          churnScore: { gte: threshold },
          optedOutAt: null,
          OR: [
            { cooldownUntil: null },
            { cooldownUntil: { lte: now } },
          ],
          actions: {
            none: {
              status: { in: ["SENT", "PENDING", "SCHEDULED"] },
              createdAt: { gte: recentActionCutoff },
            },
          },
        },
        select: { id: true, churnScore: true },
        take: MAX_ACTIONS_PER_TENANT,
        orderBy: { churnScore: "desc" },
      });

      for (const customer of candidates) {
        try {
          const response = await fetch(`${appUrl}/api/v1/actions/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              tenantId: tenant.id,
              customerId: customer.id,
              channel: "EMAIL",
              triggers: [],
            }),
            cache: "no-store",
          });

          if (response.ok || response.status === 202) {
            triggered++;
          } else {
            const body = await response.json().catch(() => ({}));
            console.warn(
              `[job/trigger-winback-actions] ${response.status} — client ${customer.id} (score ${customer.churnScore}):`,
              body
            );
            skipped++;
          }
        } catch (err) {
          console.error(`[job/trigger-winback-actions] Erreur client ${customer.id}:`, err);
          errors++;
        }
      }
    }

    console.log(
      `[job/trigger-winback-actions] triggered: ${triggered}, skipped: ${skipped}, errors: ${errors}`
    );
    return { triggered, skipped, errors };
  } finally {
    await prisma.$disconnect();
  }
}
