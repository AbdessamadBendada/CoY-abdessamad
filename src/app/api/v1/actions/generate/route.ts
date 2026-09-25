import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security/log-event";
import { generateAction, moderateAction, decideActionTiming } from "@/lib/ai/agents";
import { sendBrevoEmail } from "@/lib/brevo/send-email";
import { sendBrevoSms } from "@/lib/brevo/send-sms";
import type { BrevoSendResult } from "@/lib/brevo/send-email";
import { COOLDOWN_DAYS_DEFAULT } from "@/config/constants";
import { PLAN_QUOTAS, RESTRICTIVE_QUOTAS, toTenantPlan } from "@/types/database";
import { checkChannelQuota, reserveSmsCount, releaseSmsCount } from "@/lib/billing/quota-guards";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { sanitizeEmailHtml } from "@/lib/utils/sanitize-email-html";
import { toValidTone, toValidCompensationType } from "@/types/scenarios";
import { PLAN_PSYCH_TRIGGERS } from "@/config/psych-triggers";
import { getAppUrl } from "@/lib/utils/get-app-url";

// ─── Authentification par API key ─────────────────────────────────────────────

function authenticate(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const apiKey = process.env.SCORING_API_KEY;
  if (!apiKey) {
    console.error("[actions/generate] SCORING_API_KEY non défini");
    return false;
  }
  const expected = `Bearer ${apiKey}`;
  // timingSafeEqual obligatoire — évite les timing attacks sur la clé API
  if (!auth || auth.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Rate limiting par tenant ──────────────────────────────────────────────────
// Max 10 appels par minute par tenant — protection contre abus de clé API
// (chaque appel déclenche Claude ~0.05€/req → risque financier direct)

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

async function checkRateLimit(tenantId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.winbackAction.count({
    where: {
      tenantId,
      createdAt: { gte: since },
    },
  });
  return recentCount < RATE_LIMIT_MAX_REQUESTS;
}

// ─── Schéma de la requête ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  triggers: z.array(z.string()).default([]),
});

// ─── POST /api/v1/actions/generate ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  if (!authenticate(request)) {
    await logSecurityEvent({
      event: "AUTH_FAILURE",
      severity: "CRITICAL",
      request,
      details: { route: "actions/generate" },
    });
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Parse body (nécessaire pour obtenir le tenantId avant le rate limit)

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { tenantId, customerId, channel, triggers } = parsed.data;

  // ── Rate limiting (avant tout appel Claude) ───────────────────────────────────
  const withinRateLimit = await checkRateLimit(tenantId);
  if (!withinRateLimit) {
    await logSecurityEvent({
      event: "RATE_LIMIT_EXCEEDED",
      severity: "MEDIUM",
      tenantId,
      request,
      details: { limit: RATE_LIMIT_MAX_REQUESTS, windowMs: RATE_LIMIT_WINDOW_MS },
    });
    return NextResponse.json(
      { error: "Trop de requêtes — réessayez dans une minute" },
      { status: 429 }
    );
  }

  // ── Fetch tenant ─────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, plan: true, status: true, settings: true, sector: true, dpaSignedAt: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }
  if (!["ACTIVE", "TRIAL", "PAST_DUE"].includes(tenant.status)) {
    return NextResponse.json({ error: "Compte suspendu ou annulé." }, { status: 403 });
  }

  // ── Fetch customer (avec historique des actions pour Timing Agent) ───────────
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
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
      actions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { sentAt: true, channel: true, openedAt: true, clickedAt: true },
      },
    },
  });
  if (!customer) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  // ── Vérifier le cooldown ──────────────────────────────────────────────────────
  const now = new Date();
  if (customer.cooldownUntil && customer.cooldownUntil > now) {
    return NextResponse.json(
      {
        error: "Ce client est en période de cooldown",
        isInCooldown: true,
        cooldownUntil: customer.cooldownUntil.toISOString(),
      },
      { status: 409 }
    );
  }

  // ── Vérifier les quotas — trial hérite du plan souscrit (ADR-015) ────────────
  // Fail-closed : un plan qui ne valide plus contre toTenantPlan (donnée corrompue)
  // retombe sur des quotas à 0, jamais sur un crash ni un accès illimité par défaut.
  const period = now.toISOString().slice(0, 7); // "YYYY-MM"
  let quotas;
  try {
    quotas = PLAN_QUOTAS[toTenantPlan(tenant.plan, tenant.status)];
  } catch (err) {
    console.error(`[actions/generate] plan invalide pour tenant ${tenantId}, repli fail-closed:`, err);
    quotas = RESTRICTIVE_QUOTAS;
  }

  const quotaUsage = await prisma.quotaUsage.findFirst({
    where: { tenantId, period },
    select: { actionsCount: true, emailsCount: true, smsCount: true },
  });

  const currentActions = quotaUsage?.actionsCount ?? 0;
  const currentEmails = quotaUsage?.emailsCount ?? 0;
  const currentSms = quotaUsage?.smsCount ?? 0;

  if (quotas.actions_limit !== -1 && currentActions >= quotas.actions_limit) {
    return NextResponse.json(
      { error: "Quota d'actions mensuel atteint. Attendez le mois prochain ou changez de plan." },
      { status: 429 }
    );
  }
  // ── Sélectionner le scénario correspondant au score churn ────────────────────
  const matchingScenario = await prisma.winbackScenario.findFirst({
    where: {
      tenantId,
      isActive: true,
      scoreMin: { lte: customer.churnScore ?? 0 },
      scoreMax: { gte: customer.churnScore ?? 0 },
    },
    orderBy: [{ priority: "desc" }, { usageCount: "asc" }],
  });

  // ── Timing Agent — décider quand et sur quel canal envoyer ───────────────────
  const timingDecision = await decideActionTiming({
    customerId,
    tenantId,
    requestedChannel: channel,
    previousActions: (customer.actions ?? []).map((a) => ({
      sentAt: a.sentAt ?? new Date(0),
      channel: a.channel,
      openedAt: a.openedAt,
      clickedAt: a.clickedAt,
    })),
    tenantOpenRateBySlot: {}, // Enrichi en V2 avec données réelles
  });

  // Si le Timing Agent recommande de différer, créer une action planifiée et retourner
  if (!timingDecision.sendNow && timingDecision.scheduledFor) {
    // Garde quota — revalider AVANT de planifier, pas seulement à l'envoi (sinon un tenant
    // hors quota voit une action planifiée qui s'annule silencieusement). Vérification
    // lecture-seule uniquement : la vraie consommation a lieu dans send-scheduled.ts.
    const scheduledQuotaCheck = checkChannelQuota(timingDecision.channel, quotas, { currentSms, currentEmails });
    if (scheduledQuotaCheck.blocked) {
      return NextResponse.json({ error: scheduledQuotaCheck.error }, { status: scheduledQuotaCheck.status });
    }

    const scheduledAction = await prisma.winbackAction.create({
      data: {
        tenantId,
        customerId: customer.id,
        type: "AUTOMATED",
        status: "SCHEDULED",
        channel: timingDecision.channel,
        subject: undefined,
        content: "", // Sera généré par le cron au moment de l'envoi
        scenarioId: matchingScenario?.id ?? undefined,
        triggers,
        churnScoreAtCreation: customer.churnScore ?? undefined,
        scheduledAt: timingDecision.scheduledFor,
        aiDecisionLog: {
          timingReason: timingDecision.reason,
          requestedChannel: channel,
          scheduledChannel: timingDecision.channel,
        } as Prisma.InputJsonValue,
      },
    });

    console.info(
      `[actions/generate] Action planifiée ${scheduledAction.id} pour ${timingDecision.scheduledFor.toISOString()} (${timingDecision.reason})`
    );

    return NextResponse.json({
      scheduled: true,
      actionId: scheduledAction.id,
      scheduledFor: timingDecision.scheduledFor.toISOString(),
      channel: timingDecision.channel,
      timingReason: timingDecision.reason,
    }, { status: 202 });
  }

  // Canal effectif (le Timing Agent peut avoir changé EMAIL ↔ SMS)
  const effectiveChannel = timingDecision.channel;

  // ── Garde quota — réévaluée sur le canal EFFECTIF, jamais sur le canal demandé.
  // Ex-bug (découverte majeure Plan A) : ce garde-fou testait `channel` (la
  // demande) avant la décision de timing — une demande EMAIL basculée en SMS
  // par le Timing Agent le franchissait sans jamais être vérifiée.
  const channelQuotaCheck = checkChannelQuota(effectiveChannel, quotas, { currentSms, currentEmails });
  if (channelQuotaCheck.blocked) {
    return NextResponse.json({ error: channelQuotaCheck.error }, { status: channelQuotaCheck.status });
  }
  // ── Garde téléphone — un EMAIL demandé peut être basculé en SMS par le
  // Timing Agent ; sans cette réévaluation sur le canal effectif, l'envoi
  // plus bas utilise `customer.phone!` (non-null assertion) et enverrait
  // `undefined` à Brevo au lieu d'échouer proprement en 422. Doit rester AVANT
  // toute réservation SMS, sinon ce 422 brûlerait un crédit sans remboursement.
  if (effectiveChannel === "SMS" && !customer.phone) {
    return NextResponse.json(
      { error: "Ce client n'a pas de numéro de téléphone enregistré." },
      { status: 422 }
    );
  }

  // ── Réservation atomique du quota SMS — après les deux gardes ci-dessus ──────
  let smsReserved = false;
  if (effectiveChannel === "SMS") {
    smsReserved = await reserveSmsCount(prisma, tenantId, period, quotas.sms_limit);
    if (!smsReserved) {
      return NextResponse.json({ error: "Quota de SMS mensuel atteint." }, { status: 429 });
    }
  }

  // ── Résoudre les triggers psychologiques disponibles ──────────────────────────
  const planTriggers = PLAN_PSYCH_TRIGGERS[tenant.plan] ?? PLAN_PSYCH_TRIGGERS["COY"];

  const scenarioEnabledTriggers = matchingScenario?.triggersConfig
    ? (matchingScenario.triggersConfig as { triggers: { id: string; enabled: boolean }[] }).triggers
        .filter((t) => t.enabled)
        .map((t) => t.id)
    : null;

  const filteredTriggers = scenarioEnabledTriggers
    ? planTriggers.filter((t) => scenarioEnabledTriggers.includes(t))
    : planTriggers;

  const availablePsychTriggers = filteredTriggers.length > 0 ? filteredTriggers : planTriggers;

  // ── Déclarations hoistées — utilisées après le try (upsert, envoi Brevo, réponse) ──
  const customerName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client";
  let result: Awaited<ReturnType<typeof generateAction>>;
  let safeFinalContent: string;
  let safeSubject: string;
  let cappedPromoValue: number | null; // result.promoValue est `number | null`
  let shouldAutoSend: boolean;
  let cooldownUntil: Date;
  let action: Awaited<ReturnType<typeof prisma.winbackAction.create>>;

  try {
    // Incrémenter usageCount du scénario sélectionné — vraiment non-bloquant, ne doit
    // jamais faire échouer/relâcher la réservation SMS.
    if (matchingScenario) {
      await prisma.winbackScenario
        .update({ where: { id: matchingScenario.id }, data: { usageCount: { increment: 1 } } })
        .catch(() => {});
    }

    // ── Appel Claude ────────────────────────────────────────────────────────────
    result = await generateAction({
      customerName,
      customerEmail: customer.email,
      ltv: parseFloat(customer.ltv.toString()),
      totalOrders: customer.totalOrders,
      churnScore: customer.churnScore ?? 50,
      churnRisk: customer.churnRisk ?? "MEDIUM",
      detectedTriggers: triggers,
      channel: effectiveChannel,
      availablePsychTriggers,
      tenantName: tenant.name,
      tenantSector: tenant.sector,
      tone: toValidTone(matchingScenario?.tone),
      vouvoiement: matchingScenario?.vouvoiement,
      compensationType: toValidCompensationType(matchingScenario?.compensationType),
      compensationValue: matchingScenario?.compensationValue
        ? parseFloat(matchingScenario.compensationValue.toString())
        : undefined,
      templateHint:
        matchingScenario?.subjectTemplate || matchingScenario?.contentTemplate
          ? {
              subject: matchingScenario.subjectTemplate ?? undefined,
              content: matchingScenario.contentTemplate ?? undefined,
            }
          : undefined,
    });

    // ── Modération Agent — vérification et correction RGPD/AI Act ──────────────
    const moderation = await moderateAction({
      channel: effectiveChannel,
      subject: result.subject,
      content: result.content,
      tenantName: tenant.name,
    });

    // Utiliser le contenu validé (original ou corrigé) pour l'envoi
    const finalSubject = moderation.finalSubject ?? result.subject;
    let finalContent = moderation.finalContent;

    if (moderation.wasModified) {
      console.info(
        `[actions/generate] Modération: ${moderation.corrections.length} correction(s) appliquée(s) pour tenant ${tenantId}`
      );
    }

    // ── Remplacer {{OPT_OUT_URL}} par le lien de désinscription réel ───────────
    let optOutToken = customer.optOutToken;
    if (!optOutToken) {
      const { randomBytes } = await import("crypto");
      optOutToken = randomBytes(32).toString("hex");
      await prisma.customer.update({
        where: { id: customer.id },
        data: { optOutToken },
      });
    }
    const appUrl = getAppUrl();
    finalContent = finalContent.replace(/\{\{OPT_OUT_URL\}\}/g, `${appUrl}/optout/${optOutToken}`);

    // ── Sanitiser le HTML final (whitelist) + sujet avant persistance et envoi ──
    safeFinalContent = effectiveChannel === "EMAIL" ? sanitizeEmailHtml(finalContent) : finalContent;
    safeSubject = (finalSubject ?? "Un message de votre boutique")
      .replace(/<[^>]*>/g, "")
      .slice(0, 200);

    // ── Clamper promoValue selon le type (caps durs plan V) ─────────────────────
    const HARD_CAP_PERCENT = 50;
    const HARD_CAP_FIXED_EUR = 500;
    const scenarioMaxEur = matchingScenario?.compensationMaxEur
      ? Number(matchingScenario.compensationMaxEur)
      : undefined;

    cappedPromoValue = result.promoValue;
    if (cappedPromoValue != null) {
      if (result.promoType === "PERCENTAGE") {
        // scenarioMaxEur is in euros — does not apply to percentages; only hard cap applies
        cappedPromoValue = Math.min(cappedPromoValue, HARD_CAP_PERCENT);
      } else if (result.promoType === "FIXED") {
        cappedPromoValue = Math.min(cappedPromoValue, scenarioMaxEur ?? HARD_CAP_FIXED_EUR, HARD_CAP_FIXED_EUR);
      }
    }
    if (cappedPromoValue !== result.promoValue) {
      console.info(`[actions/generate] promoValue cappé: ${result.promoValue} → ${cappedPromoValue} (type: ${result.promoType})`);
    }

    // ── Déterminer le mode d'envoi ──────────────────────────────────────────────
    shouldAutoSend =
      matchingScenario?.autoSendMode === "auto" &&
      Boolean(tenant.dpaSignedAt);

    // ── Calculer le cooldown ────────────────────────────────────────────────────
    const settings = (tenant.settings ?? {}) as { cooldown_days?: number };
    const cooldownDays = settings.cooldown_days ?? COOLDOWN_DAYS_DEFAULT;
    cooldownUntil = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000);

    // ── Créer WinbackAction (PENDING) ───────────────────────────────────────────
    action = await prisma.winbackAction.create({
      data: {
        tenantId,
        customerId: customer.id,
        type: "AUTOMATED",
        status: "PENDING",
        channel: effectiveChannel,
        subject: safeSubject ?? undefined,
        content: safeFinalContent,
        scenarioId: matchingScenario?.id ?? undefined,
        triggers,
        churnScoreAtCreation: customer.churnScore ?? undefined,
        promoValue: cappedPromoValue ?? undefined,
        promoType: result.promoType ?? undefined,
        psychologicalTrigger: result.psychologicalTrigger,
        persuasionScore: result.persuasionScore,
        aiModelUsed: result.aiModelUsed,
        aiDecisionLog: {
          psychologicalTrigger: result.psychologicalTrigger,
          persuasionScore: result.persuasionScore,
          reasoning: result.reasoning,
          promoRecommended: result.promoRecommended,
          scenarioId: matchingScenario?.id ?? null,
          autoSendMode: matchingScenario?.autoSendMode ?? "manual",
        } as Prisma.InputJsonValue,
        moderationLog: {
          wasModified: moderation.wasModified,
          corrections: moderation.corrections,
          complianceLog: moderation.complianceLog,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[actions/generate] Erreur génération/persistance action:", err);
    // reserveSmsCount retourne true SANS incrémenter quand sms_limit===-1 (illimité) — ne
    // décrémenter que si une réservation réelle a eu lieu, sinon smsCount devient négatif.
    if (smsReserved && quotas.sms_limit !== -1) await releaseSmsCount(prisma, tenantId, period);
    return NextResponse.json({ error: "Erreur lors de la génération de l'action" }, { status: 500 });
  }

  // ── Incrémenter QuotaUsage (consommé quelle que soit la réussite de l'envoi) ──
  // smsCount déjà réservé par reserveSmsCount ci-dessus — ne pas le réincrémenter ici.
  await prisma.quotaUsage.upsert({
    where: { tenantId_period: { tenantId, period } },
    create: {
      tenantId,
      period,
      actionsCount: 1,
      emailsCount: effectiveChannel === "EMAIL" ? 1 : 0,
      smsCount: 0,
    },
    update: {
      actionsCount: { increment: 1 },
      ...(effectiveChannel === "EMAIL" ? { emailsCount: { increment: 1 } } : {}),
    },
  });

  // ── Envoi via Brevo (mode auto uniquement, DPA requis) ───────────────────────
  let sendResult: BrevoSendResult | null = null;
  let sendStatus: "PENDING" | "SENT" | "FAILED" = "PENDING";

  if (shouldAutoSend) {
    const safeToName = customerName.replace(/[\r\n<>"]/g, "").slice(0, 100);
    if (!process.env.BREVO_API_KEY) {
      sendResult = { success: false, error: "BREVO_API_KEY non configuré (mode dev)" };
      console.warn("[actions/generate] BREVO_API_KEY absent — envoi ignoré");
    } else if (effectiveChannel === "EMAIL") {
      sendResult = await sendBrevoEmail({
        toEmail: customer.email,
        toName: safeToName,
        subject: safeSubject,
        htmlContent: safeFinalContent,
      });
    } else {
      sendResult = await sendBrevoSms({
        toPhone: customer.phone!,
        content: safeFinalContent,
      });
    }

    sendStatus = sendResult.success ? "SENT" : "FAILED";
    await prisma.winbackAction.update({
      where: { id: action.id },
      data: {
        status: sendStatus,
        sentAt: sendResult.success ? now : undefined,
        failedAt: sendResult.success ? undefined : now,
        failureReason: sendResult.error ?? undefined,
        brevoMessageId: sendResult.messageId ?? undefined,
      },
    });
  }

  // ── Mettre à jour Customer — cooldown posé UNIQUEMENT si envoi auto réussi ────
  // Mode manuel (shouldAutoSend=false) : cooldown posé dans send/route.ts étape 14bis
  if (shouldAutoSend && sendResult?.success) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { cooldownUntil, lastActionAt: now },
    });
  }

  // ── AuditLog ──────────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "WINBACK_ACTION_GENERATED",
      entityType: "WinbackAction",
      entityId: action.id,
      details: {
        customerId: customer.id,
        channel: effectiveChannel,
        sendStatus,
        psychologicalTrigger: result.psychologicalTrigger,
        persuasionScore: result.persuasionScore,
        churnScore: customer.churnScore,
        ...(sendResult?.error ? { sendError: sendResult.error } : {}),
      } as Prisma.InputJsonValue,
    },
  });

  // ── Quota restant (pour info) ─────────────────────────────────────────────────
  const quotaRemaining = {
    actions:
      quotas.actions_limit === -1
        ? null
        : quotas.actions_limit - currentActions - 1,
    emails:
      effectiveChannel === "EMAIL"
        ? quotas.emails_limit === -1
          ? null
          : quotas.emails_limit - currentEmails - 1
        : undefined,
    sms:
      effectiveChannel === "SMS"
        ? quotas.sms_limit === -1
          ? null
          : quotas.sms_limit - currentSms - 1
        : undefined,
  };

  // ── Réponse ───────────────────────────────────────────────────────────────────
  return NextResponse.json({
    actionId: action.id,
    sendStatus,
    channel: effectiveChannel,
    subject: safeSubject,
    content: safeFinalContent,
    psychologicalTrigger: result.psychologicalTrigger,
    persuasionScore: result.persuasionScore,
    promoRecommended: result.promoRecommended,
    promoValue: cappedPromoValue,
    promoType: result.promoType,
    triggers,
    reasoning: result.reasoning,
    cooldownUntil: cooldownUntil.toISOString(),
    quotaRemaining,
  });
}
