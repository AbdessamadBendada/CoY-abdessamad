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

// ─── Constantes ───────────────────────────────────────────────────────────────

// Worst-case: 30 × 8s = 240s = 4min < seuil reconcile-sending (5min) — évite race SENDING→FAILED
const MAX_ACTIONS_PER_RUN = 30;
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

export async function runSendScheduled(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const prisma = createJobsClient();
  const now = new Date();

  try {
  const scheduledActions = await prisma.winbackAction.findMany({
    where: {
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
    take: MAX_ACTIONS_PER_RUN,
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
      where: { id: action.id, status: "SCHEDULED" },
      data: { status: "SENDING" },
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
    } else if (customer.phone) {
      const result = await sendBrevoSms({ toPhone: customer.phone, content: safeFinalContent });
      sendSuccess = result.success;
      sendError = result.error;
    } else {
      sendError = "Numéro de téléphone manquant";
    }

    // ── Mettre à jour l'action ────────────────────────────────────────────
    const settings = (tenant.settings ?? {}) as { cooldown_days?: number };
    const cooldownDays = settings.cooldown_days ?? COOLDOWN_DAYS_DEFAULT;
    const cooldownUntil = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000);

    await prisma.winbackAction.update({
      where: { id: action.id },
      data: {
        status: sendSuccess ? "SENT" : "FAILED",
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
        failedAt: sendSuccess ? undefined : now,
        failureReason: sendError,
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
    await prisma.quotaUsage.upsert({
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
    } else {
      results.failed++;
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
