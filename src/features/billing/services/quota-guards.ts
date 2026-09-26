import type { PrismaClient } from "@prisma/client";
import type { TenantQuotas } from "@/types/database";

export type QuotaBlockReason = "SMS_NOT_IN_PLAN" | "SMS_QUOTA_BLOCKED" | "EMAILS_QUOTA_BLOCKED";

// Union discriminée — `reason` est garanti présent par le typage quand blocked=true.
export type QuotaCheckResult =
  | { blocked: false }
  | { blocked: true; error: string; status: number; reason: QuotaBlockReason };

// Vérification pure (aucun accès DB) — appelée avec le canal EFFECTIF, jamais un littéral,
// sauf sur les sites qui n'ont réellement qu'un seul canal possible dans leur portée
// (ex: send/route.ts, à l'intérieur de son propre `if (channel === "SMS")`).
export function checkChannelQuota(
  channel: "EMAIL" | "SMS",
  quotas: TenantQuotas,
  usage: { currentSms: number; currentEmails: number }
): QuotaCheckResult {
  if (channel === "SMS" && quotas.sms_limit === 0) {
    // Wording neutre : sms_limit===0 concerne aussi bien un tenant TRIAL que le plan hérité
    // déprécié "essentiel" (database.ts:26) — "après la période d'essai" serait faux pour ce dernier.
    return { blocked: true, error: "SMS non disponible sur votre plan actuel.", status: 422, reason: "SMS_NOT_IN_PLAN" };
  }
  if (channel === "SMS" && quotas.sms_limit !== -1 && usage.currentSms >= quotas.sms_limit) {
    return { blocked: true, error: "Quota de SMS mensuel atteint.", status: 429, reason: "SMS_QUOTA_BLOCKED" };
  }
  if (channel === "EMAIL" && quotas.emails_limit !== -1 && usage.currentEmails >= quotas.emails_limit) {
    return { blocked: true, error: "Quota d'emails mensuel atteint.", status: 429, reason: "EMAILS_QUOTA_BLOCKED" };
  }
  return { blocked: false };
}

// Réservation atomique — UPDATE conditionnel en une requête. Le WHERE est ré-évalué par
// Postgres sur la ligne verrouillée (EvalPlanQual), donc deux requêtes concurrentes à
// smsCount=349/limit=350 donnent bien 1 succès + 1 échec, sous les deux clients Prisma du
// projet (singleton PgBouncer 6543, createJobsClient 5432). `$executeRaw` est une tag
// function : les valeurs interpolées sont des paramètres liés, jamais concaténées — pas de
// risque d'injection. Ne jamais remplacer par $executeRawUnsafe.
export async function reserveSmsCount(
  prisma: PrismaClient,
  tenantId: string,
  period: string,
  limit: number
): Promise<boolean> {
  if (limit === -1) return true;
  // .catch : tolère une violation d'unicité si deux requêtes créent la ligne en concurrence
  // sur le tout premier SMS du mois — l'UPDATE conditionnel qui suit refusera proprement
  // (0 ligne affectée) si la ligne n'existe toujours pas, direction fail-closed sûre.
  await prisma.quotaUsage
    .upsert({
      where: { tenantId_period: { tenantId, period } },
      create: { tenantId, period, actionsCount: 0, emailsCount: 0, smsCount: 0 },
      update: {},
    })
    .catch(() => {});
  const rows = await prisma.$executeRaw`
    UPDATE "quota_usages" SET "smsCount" = "smsCount" + 1
    WHERE "tenantId" = ${tenantId} AND "period" = ${period} AND "smsCount" < ${limit}`;
  return rows === 1;
}

// Compense une réservation dont l'envoi n'a finalement jamais eu lieu (ex: échec après
// réservation, avant tentative d'envoi réelle). Fire-and-forget volontaire, même pattern
// que les decrements existants (send/route.ts:265-271, 404-409, 462-468).
export async function releaseSmsCount(prisma: PrismaClient, tenantId: string, period: string): Promise<void> {
  await prisma.quotaUsage
    .update({ where: { tenantId_period: { tenantId, period } }, data: { smsCount: { decrement: 1 } } })
    .catch(() => {});
}
