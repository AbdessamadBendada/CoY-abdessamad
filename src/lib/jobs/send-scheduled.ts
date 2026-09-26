import { createJobsClient } from "@/lib/prisma";
import { generateAction, moderateAction } from "@/lib/ai/agents";
import { sendBrevoEmail } from "@/lib/brevo/send-email";
import { sendBrevoSms } from "@/lib/brevo/send-sms";
import { sanitizeEmailHtml } from "@/lib/utils/sanitize-email-html";
import type { Prisma } from "@prisma/client";
import { PLAN_QUOTAS, toTenantPlan } from "@/types/database";
import type { TenantPlan } from "@/types/database";
import { checkChannelQuota, reserveSmsCount } from "@/lib/billing/quota-guards";
import { toValidTone, toValidCompensationType } from "@/types/scenarios";
import { PLAN_PSYCH_TRIGGERS } from "@/config/psych-triggers";
import { COOLDOWN_DAYS_DEFAULT } from "@/config/constants";
import { getAppUrl } from "@/lib/utils/get-app-url";
import { backgroundProcessing, retryAt } from "@/lib/config/background-processing";
import { rotateAfter, roundRobin } from "@/lib/jobs/fair-dispatch";

// ─── Constantes ───────────────────────────────────────────────────────────────

const HARD_CAP_PERCENT = 50;    // aligné Zod ScenarioInputSchema (remise % max 50%)
const HARD_CAP_FIXED_EUR = 500; // aligné Zod ScenarioInputSchema (compensationMaxEur max 500€)

export function capScheduledPromoValue(
  value: number | null,
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING" | null,
  scenarioMaxEur?: number,
): number | null {
  if (value == null) return value;
  if (type === "PERCENTAGE") return Math.min(value, HARD_CAP_PERCENT);
  if (type === "FIXED") {
    return Math.min(value, scenarioMaxEur ?? HARD_CAP_FIXED_EUR, HARD_CAP_FIXED_EUR);
  }
  return value;
}

// ─── runSendScheduled ─────────────────────────────────────────────────────────
//
// Exécute les WinbackAction planifiées dont scheduledAt <= now.
// Appelé par le Trigger.dev scheduled task (horaire) ET par /api/cron/send-scheduled.

export type MessageDispatchResult = {
  actions: Array<{ id: string; tenantId: string; sendAttempts: number }>;
  tenantCount: number;
  oldestScheduledAt: Date | null;
};

/** Rotating tenant window + round-robin action selection. */
export async function dispatchScheduledActions(
  prisma: ReturnType<typeof createJobsClient>,
  now = new Date(),
): Promise<MessageDispatchResult> {
  const [cursor, tenants] = await Promise.all([
    prisma.backgroundCursor.findUnique({ where: { key: "messages" } }),
    prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] } },
      select: { id: true }, orderBy: { id: "asc" },
    }),
  ]);
  const window = rotateAfter(tenants, cursor?.value ?? null, backgroundProcessing.tenantWindow);
  if (window.length === 0) return { actions: [], tenantCount: 0, oldestScheduledAt: null };
  await prisma.backgroundCursor.upsert({
    where: { key: "messages" },
    create: { key: "messages", value: window.at(-1)?.id },
    update: { value: window.at(-1)?.id },
  });
  const perTenant = await Promise.all(window.map(async ({ id: tenantId }) => ({
    tenantId,
    items: await prisma.winbackAction.findMany({
      where: { tenantId, status: "SCHEDULED", scheduledAt: { lte: now },
        nextSendAttemptAt: { lte: now }, customer: { optedOutAt: null } },
      select: { id: true, tenantId: true, scheduledAt: true, sendAttempts: true }, orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      take: backgroundProcessing.messageBatchPerTenant,
    }),
  })));
  // `null` nextSendAttemptAt is normal for the first attempt; Prisma's AND/OR
  // keeps that visible without allowing a future retry to run early.
  for (const entry of perTenant) {
    if (entry.items.length < backgroundProcessing.messageBatchPerTenant) {
      const existing = new Set(entry.items.map((item) => item.id));
      const initial = await prisma.winbackAction.findMany({
        where: { tenantId: entry.tenantId, status: "SCHEDULED", scheduledAt: { lte: now },
          nextSendAttemptAt: null, customer: { optedOutAt: null } },
        select: { id: true, tenantId: true, scheduledAt: true, sendAttempts: true }, orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
        take: backgroundProcessing.messageBatchPerTenant - entry.items.length,
      });
      entry.items.push(...initial.filter((item) => !existing.has(item.id)));
    }
  }
  const selected = roundRobin(perTenant, backgroundProcessing.messageDispatchLimit);
  const oldestScheduledAt = selected.reduce<Date | null>((oldest, item) =>
    item.scheduledAt && (!oldest || item.scheduledAt < oldest) ? item.scheduledAt : oldest, null);
  console.info("[jobs/message-dispatch]", { tenantsVisited: window.length, queued: selected.length,
    oldestScheduledAt: oldestScheduledAt?.toISOString() ?? null });
  await logMessageBacklog(prisma, now);
  return { actions: selected.map(({ id, tenantId, sendAttempts }) => ({ id, tenantId, sendAttempts })), tenantCount: window.length, oldestScheduledAt };
}

export function retryableDeliveryError(error?: string): boolean {
  return Boolean(error && /\b(429|5\d\d)\b|rate.?limit/i.test(error));
}

async function logMessageBacklog(prisma: ReturnType<typeof createJobsClient>, now: Date) {
  const byTenant = await prisma.winbackAction.groupBy({
    by: ["tenantId"],
    where: { status: "SCHEDULED", scheduledAt: { lte: now }, customer: { optedOutAt: null },
      OR: [{ nextSendAttemptAt: null }, { nextSendAttemptAt: { lte: now } }] },
    _count: { _all: true }, _min: { scheduledAt: true },
  });
  const waiting = byTenant.reduce((total, row) => total + row._count._all, 0);
  const oldestScheduledAt = byTenant.reduce<Date | null>((oldest, row) =>
    row._min.scheduledAt && (!oldest || row._min.scheduledAt < oldest) ? row._min.scheduledAt : oldest, null);
  console.info("[jobs/message-backlog]", { waiting, oldestScheduledAt: oldestScheduledAt?.toISOString() ?? null,
    tenantBacklog: byTenant.sort((a, b) => b._count._all - a._count._all).slice(0, 10)
      .map((row) => ({ tenantId: row.tenantId, waiting: row._count._all })) });
}

export async function runSendScheduled(options?: { actionIds?: string[] }): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const prisma = createJobsClient();
  const now = new Date();

  try {
  const dispatch = options?.actionIds ? null : await dispatchScheduledActions(prisma, now);
  const actionIds = options?.actionIds ?? dispatch?.actions.map(({ id }) => id) ?? [];
  const scheduledActions = actionIds.length === 0 ? [] : await prisma.winbackAction.findMany({
    where: {
      id: { in: actionIds },
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      customer: { optedOutAt: null },
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          ltv: true,
          totalOrders: true,
          churnScore: true,
          churnRisk: true,
          cooldownUntil: true,
          optOutToken: true,
          optedOutAt: true,
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          plan: true,
          status: true,
          settings: true,
          sector: true,
          dpaSignedAt: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (scheduledActions.length === 0) {
    console.log("[job/send-scheduled] Aucune action planifiée.");
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  console.info(`[job/send-scheduled] ${scheduledActions.length} action(s) à traiter`);

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const action of scheduledActions) {
    // Claim atomique — prévient double-envoi si deux runs cron se chevauchent.
    // Doit être la PREMIÈRE opération, avant DPA/cooldown, pour que leurs
    // transitions (→CANCELLED) soient aussi protégées contre la concurrence.
    const claim = await prisma.winbackAction.updateMany({
      where: {
        id: action.id,
        status: "SCHEDULED",
        scheduledAt: { lte: now },
        OR: [{ nextSendAttemptAt: null }, { nextSendAttemptAt: { lte: now } }],
      },
      data: { status: "SENDING", sendingClaimedAt: now, sendAttempts: { increment: 1 } },
    });
    if (claim.count === 0) {
      console.log(`[send-scheduled] Action ${action.id} déjà claimée par un autre run, skip`);
      continue;
    }

    const { customer, tenant } = action;

    // ── Tenant actif — un tenant CANCELLED/SUSPENDED ne doit jamais consommer
    // les quotas de son ancien palier payant via ce cron.
    if (!["ACTIVE", "TRIAL", "PAST_DUE"].includes(tenant.status)) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: "TENANT_SUSPENDED_OR_CANCELLED" },
      });
      results.skipped++;
      continue;
    }

    // ── DPA obligatoire avant tout envoi (RGPD) ──────────────────────────
    if (!tenant.dpaSignedAt) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: "DPA_REQUIRED" },
      });
      results.skipped++;
      continue;
    }

    // ── Vérifier que le client n'est plus en cooldown ─────────────────────
    if (customer.cooldownUntil && customer.cooldownUntil > now) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: "Client en cooldown au moment de l'exécution" },
      });
      results.skipped++;
      continue;
    }

    const channel = action.channel;

    // ── Résoudre le plan effectif — AVANT tout envoi, jamais après ────────
    // Ex-bug : planKey/quotas n'étaient calculés qu'après l'envoi Brevo (plus
    // bas), donc le plafond SMS n'était jamais appliqué ici — seulement compté
    // a posteriori. `toTenantPlan` lève sur plan inconnu ; dans cette boucle
    // sans catch englobant, une exception non rattrapée abandonnerait TOUTES
    // les actions restantes du lot (try sans catch, cf. runSendScheduled) —
    // donc on rattrape par action : FAILED + continue, jamais de propagation.
    let planKey: TenantPlan;
    try {
      planKey = toTenantPlan(tenant.plan, tenant.status);
    } catch (err) {
      console.error(`[job/send-scheduled] plan invalide pour tenant ${tenant.id}, action ${action.id}:`, err);
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: {
          status: "FAILED",
          failedAt: now,
          failureReason: "Plan tenant invalide",
        },
      });
      results.failed++;
      continue;
    }
    const quotas = PLAN_QUOTAS[planKey];
    const period = now.toISOString().slice(0, 7);

    // ── Garde quota — un tenant en essai (trial) ou hors quota ne doit jamais
    // recevoir de SMS via ce job. Découverte majeure Plan A : ce garde-fou
    // n'existait pas ici (seul generate/route.ts en avait un, contournable).
    // Étendu aux quotas actions/emails (F2) — read-then-write accepté comme
    // non-atomique ici (coût négligeable) ; seul le SMS a besoin d'atomicité
    // (réservation plus bas, juste avant l'envoi Brevo).
    const quotaUsage = await prisma.quotaUsage.findFirst({
      where: { tenantId: tenant.id, period },
      select: { actionsCount: true, emailsCount: true, smsCount: true },
    });
    const currentActionsCount = quotaUsage?.actionsCount ?? 0;
    const currentEmailsCount = quotaUsage?.emailsCount ?? 0;
    const currentSmsCount = quotaUsage?.smsCount ?? 0;

    if (quotas.actions_limit !== -1 && currentActionsCount >= quotas.actions_limit) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: "ACTIONS_QUOTA_BLOCKED" },
      });
      results.skipped++;
      continue;
    }
    const channelQuotaCheck = checkChannelQuota(channel, quotas, {
      currentSms: currentSmsCount,
      currentEmails: currentEmailsCount,
    });
    if (channelQuotaCheck.blocked) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: channelQuotaCheck.reason },
      });
      results.skipped++;
      continue;
    }

    const decisionLog = action.aiDecisionLog as Record<string, unknown> | null;
    const triggers = Array.isArray(action.triggers) ? (action.triggers as string[]) : [];
    const customerName =
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client";

    // ── Charger le scénario persisté sur l'action ────────────────────────
    const scenario = action.scenarioId
      ? await prisma.winbackScenario.findFirst({
          where: { id: action.scenarioId, tenantId: tenant.id },
        })
      : null;

    // ── Filtrer les triggers psychologiques par plan + scenario.triggersConfig
    const planTriggers = PLAN_PSYCH_TRIGGERS[tenant.plan] ?? PLAN_PSYCH_TRIGGERS["COY"];

    const scenarioEnabledTriggers = scenario?.triggersConfig
      ? (scenario.triggersConfig as { triggers: { id: string; enabled: boolean }[] }).triggers
          .filter((t) => t.enabled)
          .map((t) => t.id)
      : null;

    const filteredTriggers = scenarioEnabledTriggers
      ? planTriggers.filter((t) => scenarioEnabledTriggers.includes(t))
      : planTriggers;

    const availablePsychTriggers = filteredTriggers.length > 0 ? filteredTriggers : planTriggers;

    // ── Générer le message ────────────────────────────────────────────────
    let generated;
    try {
      generated = await generateAction({
        customerName,
        customerEmail: customer.email,
        ltv: parseFloat(customer.ltv.toString()),
        totalOrders: customer.totalOrders,
        churnScore: customer.churnScore ?? 50,
        churnRisk: customer.churnRisk ?? "MEDIUM",
        detectedTriggers: triggers,
        channel,
        availablePsychTriggers,
        tenantName: tenant.name,
        tenantSector: tenant.sector,
        tone: toValidTone(scenario?.tone),
        vouvoiement: scenario?.vouvoiement,
        compensationType: toValidCompensationType(scenario?.compensationType),
        compensationValue: scenario?.compensationValue
          ? parseFloat(scenario.compensationValue.toString())
          : undefined,
        templateHint:
          scenario?.subjectTemplate || scenario?.contentTemplate
            ? {
                subject: scenario.subjectTemplate,
                content: scenario.contentTemplate,
              }
            : undefined,
      });
    } catch (err) {
      console.error(`[job/send-scheduled] Erreur génération action ${action.id}:`, err);
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: {
          status: "FAILED",
          failedAt: now,
          failureReason: err instanceof Error
            ? `Erreur génération Mistral : ${err.message.slice(0, 300)}`
            : "Erreur génération Mistral (inconnue)",
        },
      });
      results.failed++;
      continue;
    }

    // ── Modérer le message ────────────────────────────────────────────────
    const moderation = await moderateAction({
      channel,
      subject: generated.subject,
      content: generated.content,
      tenantName: tenant.name,
    });

    const finalSubject = moderation.finalSubject ?? generated.subject;
    let finalContent = moderation.finalContent;

    // ── Substituer {{OPT_OUT_URL}} — fix bug pré-existant (W) ────────────
    let optOutToken = customer.optOutToken;
    if (!optOutToken) {
      const { randomBytes } = await import("crypto");
      optOutToken = randomBytes(32).toString("hex");
      await prisma.customer.update({ where: { id: customer.id }, data: { optOutToken } });
    }
    const appUrl = getAppUrl();
    finalContent = finalContent.replace(/\{\{OPT_OUT_URL\}\}/g, `${appUrl}/optout/${optOutToken}`);

    // ── Sanitiser le HTML final + sujet avant envoi ───────────────────────
    const safeFinalContent = channel === "EMAIL" ? sanitizeEmailHtml(finalContent) : finalContent;
    const safeSubject = (finalSubject ?? "Un message de votre boutique")
      .replace(/<[^>]*>/g, "")
      .slice(0, 200);
    const safeToName = customerName.replace(/[\r\n<>"]/g, "").slice(0, 100);

    // ── Clamper promoValue selon le type (même logique que generate/route.ts) ──
    const scenarioMaxEur = scenario?.compensationMaxEur
      ? Number(scenario.compensationMaxEur)
      : undefined;
    const cappedPromoValue = capScheduledPromoValue(
      generated.promoValue,
      generated.promoType,
      scenarioMaxEur,
    );

    // ── Re-lecture fraîche optedOutAt avant envoi ─────────────────────────
    // Le filtre WHERE de findMany n'est qu'un snapshot pris jusqu'à MAX_ACTIONS_PER_RUN × 8s
    // (~4min) avant cet envoi — un opt-out webhook concurrent dans cette fenêtre ne serait
    // pas reflété. Mirroring send/route.ts étape 12.
    const freshCustomer = await prisma.customer.findFirst({
      where: { id: customer.id, tenantId: tenant.id },
      select: { optedOutAt: true },
    });
    if (freshCustomer?.optedOutAt) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: "CUSTOMER_OPTED_OUT" },
      });
      results.skipped++;
      continue;
    }

    // ── Réservation atomique du quota SMS — juste avant l'envoi réel, après
    // toutes les gardes qui peuvent encore faire `continue` sans jamais
    // atteindre Brevo (génération, opt-out). Protégée par un try/catch local :
    // ce fichier documente (ci-dessus, 120-126) qu'aucune exception ne doit
    // s'échapper de cette boucle sans catch englobant.
    if (channel === "SMS") {
      let reserved = false;
      let reservationError = false;
      try {
        reserved = await reserveSmsCount(prisma, tenant.id, period, quotas.sms_limit);
      } catch (err) {
        console.error(`[job/send-scheduled] reserveSmsCount erreur pour action ${action.id}:`, err);
        reservationError = true; // erreur DB — distinct d'un quota réellement atteint
      }
      if (reservationError) {
        // FAILED (pas CANCELLED) : aligné sur le pattern existant "plan invalide" plus haut
        // qui traite déjà une erreur technique différemment d'un refus métier.
        await prisma.winbackAction.update({
          where: { id: action.id },
          data: { status: "FAILED", failedAt: now, failureReason: "SMS_RESERVATION_ERROR" },
        });
        results.failed++;
        continue;
      }
      if (!reserved) {
        await prisma.winbackAction.update({
          where: { id: action.id },
          data: { status: "CANCELLED", failureReason: "SMS_QUOTA_BLOCKED" },
        });
        results.skipped++;
        continue;
      }
    }

    // ── Envoyer via Brevo ─────────────────────────────────────────────────
    let sendSuccess = false;
    let sendError: string | undefined;
    let brevoMessageId: string | undefined;

    if (!process.env.BREVO_API_KEY) {
      console.warn(`[job/send-scheduled] BREVO_API_KEY absent — action ${action.id} ignorée`);
      sendError = "BREVO_API_KEY non configuré";
    } else if (channel === "EMAIL") {
      const result = await sendBrevoEmail({
        toEmail: customer.email,
        toName: safeToName,
        subject: safeSubject,
        htmlContent: safeFinalContent,
      });
      sendSuccess = result.success;
      sendError = result.error;
      brevoMessageId = result.messageId;
    } else if (customer.phone) {
      const result = await sendBrevoSms({ toPhone: customer.phone, content: safeFinalContent });
      sendSuccess = result.success;
      sendError = result.error;
      brevoMessageId = result.messageId;
    } else {
      sendError = "Numéro de téléphone manquant";
    }

    // ── Mettre à jour l'action ────────────────────────────────────────────
    const settings = (tenant.settings ?? {}) as { cooldown_days?: number };
    const cooldownDays = settings.cooldown_days ?? COOLDOWN_DAYS_DEFAULT;
    const cooldownUntil = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000);

    const attempt = action.sendAttempts + 1;
    const retrying = !sendSuccess && retryableDeliveryError(sendError)
      && attempt < backgroundProcessing.messageMaxAttempts;
    await prisma.winbackAction.update({
      where: { id: action.id },
      data: {
        status: sendSuccess ? "SENT" : retrying ? "SCHEDULED" : "FAILED",
        sendingClaimedAt: null,
        nextSendAttemptAt: retrying ? retryAt(attempt, now) : null,
        lastSendError: sendSuccess ? null : sendError,
        content: safeFinalContent,
        subject: safeSubject ?? undefined,
        promoValue: cappedPromoValue ?? undefined,
        promoType: generated.promoType ?? undefined,
        psychologicalTrigger: generated.psychologicalTrigger,
        persuasionScore: generated.persuasionScore,
        aiModelUsed: generated.aiModelUsed,
        aiDecisionLog: {
          ...((decisionLog ?? {}) as Record<string, unknown>),
          psychologicalTrigger: generated.psychologicalTrigger,
          persuasionScore: generated.persuasionScore,
          reasoning: generated.reasoning,
        } as Prisma.InputJsonValue,
        moderationLog: {
          wasModified: moderation.wasModified,
          corrections: moderation.corrections,
          complianceLog: moderation.complianceLog,
        } as Prisma.InputJsonValue,
        sentAt: sendSuccess ? now : undefined,
        failedAt: sendSuccess || retrying ? undefined : now,
        failureReason: sendSuccess || retrying ? undefined : sendError,
        brevoMessageId: sendSuccess ? brevoMessageId : undefined,
      },
    });

    // ── Cooldown + quota ──────────────────────────────────────────────────
    // cooldownUntil posé UNIQUEMENT si envoi réussi — un échec (ex: Brevo 401)
    // ne doit pas bloquer les prochaines tentatives de récupération du client.
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        lastActionAt: now,
        ...(sendSuccess ? { cooldownUntil } : {}),
      },
    });

    // Upsert inconditionnel — `period`/`planKey` sont déjà validés plus haut,
    // un `if (quotas)` ici serait le fail-open documenté par le Plan A :
    // clé absente ⇒ compteur jamais incrémenté ⇒ actions illimitées.
    // smsCount déjà réservé atomiquement ci-dessus — ne pas le réincrémenter ici.
    if (sendSuccess) await prisma.quotaUsage.upsert({
      where: { tenantId_period: { tenantId: tenant.id, period } },
      create: {
        tenantId: tenant.id,
        period,
        actionsCount: 1,
        emailsCount: channel === "EMAIL" ? 1 : 0,
        smsCount: 0,
      },
      update: {
        actionsCount: { increment: 1 },
        ...(channel === "EMAIL" ? { emailsCount: { increment: 1 } } : {}),
      },
    });

    if (sendSuccess) {
      results.sent++;
    } else if (!retrying) {
      results.failed++;
    } else {
      results.skipped++;
    }
  }

  console.info(
    `[job/send-scheduled] Terminé — envoyées: ${results.sent}, échouées: ${results.failed}, ignorées: ${results.skipped}`
  );

  return { processed: scheduledActions.length, ...results };
  } finally {
    await prisma.$disconnect();
  }
}
