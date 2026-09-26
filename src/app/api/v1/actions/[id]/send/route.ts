import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/security/log-event";
import { moderateAction } from "@/lib/ai/agents";
import { sanitizeEmailHtml } from "@/lib/utils/sanitize-email-html";
import { sendBrevoEmail } from "@/lib/brevo/send-email";
import { sendBrevoSms } from "@/lib/brevo/send-sms";
import { COOLDOWN_DAYS_DEFAULT } from "@/config/constants";
import { PLAN_QUOTAS, RESTRICTIVE_QUOTAS, toTenantPlan } from "@/types/database";
import { checkChannelQuota } from "@/lib/billing/quota-guards";
import { getAppUrl } from "@/lib/utils/get-app-url";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Type union strict — garantit que seuls des codes internes sont stockés en DB
// (jamais sendResult.error brut qui peut contenir le numéro de téléphone — PII)
type BrevoErrorCode =
  | "CONFIG_ERROR"
  | "NETWORK_ERROR"
  | "BREVO_429"
  | "BREVO_4XX"
  | "BREVO_5XX"
  | "SEND_ERROR"
  | "UNKNOWN_ERROR";

function classifyBrevoError(error?: string): BrevoErrorCode {
  if (!error) return "UNKNOWN_ERROR";
  if (error.includes("BREVO_API_KEY") || error.includes("non configuré")) return "CONFIG_ERROR";
  if (error.startsWith("Erreur réseau")) return "NETWORK_ERROR";
  if (/Brevo (email|SMS) 429:/.test(error)) return "BREVO_429";
  if (/Brevo (email|SMS) 4\d\d:/.test(error)) return "BREVO_4XX";
  if (/Brevo (email|SMS) 5\d\d:/.test(error)) return "BREVO_5XX";
  return "SEND_ERROR";
}

// Rate limit : 30 envois/heure/tenant
// period = "send:YYYY-MM-DDTHH" — distinct de "preview:YYYY-MM-DDTHH" et des périodes business "YYYY-MM"
const SEND_RATE_LIMIT = 30;

async function incrementSendRateLimit(tenantId: string, hour: string): Promise<number> {
  try {
    const updated = await prisma.quotaUsage.upsert({
      where: { tenantId_period: { tenantId, period: `send:${hour}` } },
      create: { tenantId, period: `send:${hour}`, actionsCount: 1 },
      update: { actionsCount: { increment: 1 } },
    });
    return updated.actionsCount;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const updated = await prisma.quotaUsage.update({
        where: { tenantId_period: { tenantId, period: `send:${hour}` } },
        data: { actionsCount: { increment: 1 } },
      });
      return updated.actionsCount;
    }
    throw err;
  }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const BodySchema = z.object({
  subject: z.string().min(1).trim().max(200).optional(),
  content: z.string().min(1).trim().max(10_000).optional(),
  // content = texte brut uniquement
});

// ─── POST /api/v1/actions/[id]/send ──────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15+/16 : params est une Promise — await obligatoire avant tout accès
  const { id: actionId } = await params;

  // ── Étape 1 : Auth + rôle ──────────────────────────────────────────────────
  // requireAuthApi() retourne null (jamais throw) — vérifier null AVANT tout accès .role
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Rôle insuffisant." }, { status: 403 });
  }
  const tenantId = user.tenant.id; // jamais params ni body

  // ── Étape 2 : Validation Zod ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // ── Étape 3 : Guard tenant.status ─────────────────────────────────────────
  if (!["ACTIVE", "TRIAL", "PAST_DUE"].includes(user.tenant.status)) {
    return NextResponse.json({ error: "Compte suspendu ou annulé." }, { status: 403 });
  }

  // ── Étape 4 : IDOR + opt-out précoce + mémoriser initialStatus ────────────
  const action = await prisma.winbackAction.findFirst({
    where: { id: actionId, tenantId },
    include: {
      customer: {
        select: {
          optedOutAt: true,
          optOutToken: true,
          email: true,
          firstName: true,
          phone: true,
        },
      },
    },
  });
  if (!action) {
    return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  }
  if (action.customer.optedOutAt) {
    await prisma.winbackAction.update({
      where: { id: action.id },
      data: { status: "CANCELLED", failureReason: "CUSTOMER_OPTED_OUT", failedAt: new Date() },
    });
    return NextResponse.json({ error: "Ce client s'est désinscrit." }, { status: 409 });
  }
  const channel = action.channel as "EMAIL" | "SMS";
  const initialStatus = action.status; // "PENDING" | "NEEDS_REVIEW" — pour rollbacks

  // ── Étape 5 : Guard DPA ────────────────────────────────────────────────────
  if (!user.tenant.dpaSignedAt) {
    return NextResponse.json({ error: "DPA non signé." }, { status: 403 });
  }

  // ── Étape 5bis : Guard quota SMS — route authentifiée, actionnée par le
  // marchand, jusqu'ici sans aucun plafond (découverte majeure Plan A).
  if (channel === "SMS") {
    let quotas;
    try {
      quotas = PLAN_QUOTAS[toTenantPlan(user.tenant.plan, user.tenant.status)];
    } catch {
      quotas = RESTRICTIVE_QUOTAS;
    }
    let currentSms = 0;
    if (quotas.sms_limit !== -1) {
      const period = new Date().toISOString().slice(0, 7);
      const quotaUsage = await prisma.quotaUsage.findFirst({ where: { tenantId, period }, select: { smsCount: true } });
      currentSms = quotaUsage?.smsCount ?? 0;
    }
    const q = checkChannelQuota(channel, quotas, { currentSms, currentEmails: 0 });
    if (q.blocked) {
      return NextResponse.json({ error: q.error }, { status: q.status });
    }
  }

  // ── Étape 6 : Guard email/phone null (AVANT claim) ────────────────────────
  if (channel === "EMAIL" && !action.customer.email) {
    return NextResponse.json(
      { error: "Adresse email manquante pour ce client." },
      { status: 422 }
    );
  }
  if (channel === "SMS" && !action.customer.phone) {
    return NextResponse.json(
      { error: "Numéro de téléphone manquant pour ce client." },
      { status: 422 }
    );
  }

  // ── Étape 7 : Claim atomique TOCTOU-safe (AVANT rate-limit) ───────────────
  // Ordre 7→8 : éviter de consommer du quota si l'action n'est pas prenable
  const claimed = await prisma.winbackAction.updateMany({
    where: { id: action.id, tenantId, status: { in: ["PENDING", "NEEDS_REVIEW"] } },
    data: { status: "SENDING" },
  });
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "Action déjà en cours d'envoi ou envoyée." },
      { status: 409 }
    );
  }

  // ── Étape 8 : Rate limit (APRÈS claim — rollback si dépassé) ──────────────
  const hour = new Date().toISOString().slice(0, 13);
  let usageCount: number;
  try {
    usageCount = await incrementSendRateLimit(tenantId, hour);
  } catch {
    await prisma.winbackAction
      .update({ where: { id: action.id }, data: { status: initialStatus } })
      .catch(() => {});
    return NextResponse.json({ error: "Erreur interne. Réessayez." }, { status: 500 });
  }
  if (usageCount > SEND_RATE_LIMIT) {
    await prisma.winbackAction.update({
      where: { id: action.id },
      data: { status: initialStatus },
    });
    await logSecurityEvent({
      event: "RATE_LIMIT_EXCEEDED",
      severity: "MEDIUM",
      tenantId,
      request,
      details: { route: "actions/send", limit: SEND_RATE_LIMIT, usageCount },
    });
    return NextResponse.json({ error: "Limite atteinte (30/heure)." }, { status: 429 });
  }

  // ── Étapes 9-15 : Bloc try/catch global ───────────────────────────────────
  try {
    // ── Étape 9 : Préparer le contenu ─────────────────────────────────────────
    const wasContentEdited = !!parsed.data.content;
    const needsRemoderation = wasContentEdited || action.status === "NEEDS_REVIEW";

    const rawSubject = (parsed.data.subject ?? action.subject ?? "").trim();
    const rawSubjectFinal =
      channel === "EMAIL" && !rawSubject ? "(sans objet)" : rawSubject;
    const safeSubject = rawSubjectFinal.replace(/[\r\n<>"]/g, "").slice(0, 200);

    let contentToModerate: string;
    if (wasContentEdited) {
      const rawText = (parsed.data.content ?? "").trim();
      contentToModerate =
        channel === "SMS" ? rawText.replace(/\n+/g, " ").slice(0, 1600) : rawText;
    } else {
      contentToModerate = action.content;
    }

    // ── Étape 10 : Modération conditionnelle ────────────────────────────────────
    let finalContent: string;
    let finalSubject: string;
    let resolvedOptOutToken: string | null = action.customer.optOutToken;
    // Résolu une seule fois — réutilisé en étapes 10 et 11
    const appUrl = getAppUrl();

    if (needsRemoderation) {
      const moderation = await moderateAction({
        channel,
        subject: safeSubject,
        content: contentToModerate,
        tenantName: user.tenant.name,
      });

      if (moderation.degraded) {
        await prisma.winbackAction.update({
          where: { id: action.id },
          data: { status: initialStatus },
        });
        await prisma.quotaUsage
          .update({
            where: { tenantId_period: { tenantId, period: `send:${hour}` } },
            data: { actionsCount: { decrement: 1 } },
          })
          .catch(() => {});
        return NextResponse.json(
          {
            error:
              "Le moteur de re-validation IA est temporairement indisponible. Réessayez dans quelques minutes.",
          },
          { status: 503 }
        );
      }

      finalContent =
        channel === "EMAIL"
          ? sanitizeEmailHtml(moderation.finalContent)
          : moderation.finalContent.replace(/<[^>]*>/g, "").slice(0, 1600);
      finalSubject = (moderation.finalSubject ?? safeSubject)
        .replace(/[\r\n<>"]/g, "")
        .slice(0, 200);

      let optOutToken = action.customer.optOutToken;
      if (!optOutToken) {
        const { randomBytes } = await import("crypto");
        optOutToken = randomBytes(32).toString("hex");
        await prisma.customer.update({
          where: { id: action.customerId },
          data: { optOutToken },
        });
      }
      resolvedOptOutToken = optOutToken;
      finalContent = finalContent.replace(
        /\{\{OPT_OUT_URL\}\}/g,
        `${appUrl}/optout/${optOutToken}`
      );
    } else {
      finalContent = action.content;
      finalSubject = safeSubject;
      if (finalContent.includes("{{OPT_OUT_URL}}")) {
        let optOutToken = action.customer.optOutToken;
        if (!optOutToken) {
          const { randomBytes } = await import("crypto");
          optOutToken = randomBytes(32).toString("hex");
          await prisma.customer.update({
            where: { id: action.customerId },
            data: { optOutToken },
          });
        }
        resolvedOptOutToken = optOutToken;
        finalContent = finalContent.replace(
          /\{\{OPT_OUT_URL\}\}/g,
          `${appUrl}/optout/${optOutToken}`
        );
      }
    }

    // Clamp SMS universel AVANT le filet (tous chemins)
    if (channel === "SMS") finalContent = finalContent.slice(0, 1600);

    // ── Étape 11 : Filet déterministe non-LLM (légal absolu) ──────────────────
    // Résoudre tout {{OPT_OUT_URL}} résiduel AVANT le test hasOptOutLink
    if (finalContent.includes("{{OPT_OUT_URL}}") && resolvedOptOutToken) {
      finalContent = finalContent.replace(
        /\{\{OPT_OUT_URL\}\}/g,
        `${appUrl}/optout/${resolvedOptOutToken}`
      );
    }

    const hasOptOutLink = finalContent.includes("/optout/");
    // Regex mention IA : EMAIL et SMS ont des formulations distinctes (moderation.ts:33 vs :67)
    // Apostrophe droite (') OU typographique (’) — sans wildcard .
    const hasAIMention =
      channel === "EMAIL"
        ? /l[''']assistance de notre IA/i.test(finalContent)
        : /\bIA assist[eé]e\b/i.test(finalContent);
    // STOP : case-SENSITIVE sans flag /i — send-sms.ts:39 exige "STOP" majuscule littéral
    const hasStop = /\bSTOP\b/.test(finalContent);

    const emailNeedsFooter = channel === "EMAIL" && (!hasOptOutLink || !hasAIMention);
    const smsNeedsFooter = channel === "SMS" && (!hasStop || !hasAIMention);

    if (emailNeedsFooter || smsNeedsFooter) {
      let tokenForFooter = resolvedOptOutToken;
      if (!tokenForFooter) {
        const { randomBytes } = await import("crypto");
        tokenForFooter = randomBytes(32).toString("hex");
        await prisma.customer.update({
          where: { id: action.customerId },
          data: { optOutToken: tokenForFooter },
        });
        resolvedOptOutToken = tokenForFooter;
      }
      // Échapper les caractères dangereux dans l'URL env — défense en profondeur
      const safeAppUrl = appUrl.replace(/[<>"'\\]/g, "");

      if (channel === "EMAIL") {
        // Footer HTML — balises whitelistées uniquement : <p>, <a href="https://...">
        // PAS de style= inline (sanitizeEmailHtml pourrait le stripper silencieusement)
        finalContent += `\n<p>Message personnalisé avec l'assistance de notre IA. <a href="${safeAppUrl}/optout/${tokenForFooter}">Se désinscrire</a></p>`;
        finalContent = sanitizeEmailHtml(finalContent);
      } else {
        // Tronquer BODY d'abord PUIS appender footer — jamais l'inverse (évite de tronquer le footer)
        const smsFooter = "\nIA assistée. STOP pour se désinscrire.";
        finalContent = finalContent.slice(0, 1600 - smsFooter.length) + smsFooter;
      }

      await logSecurityEvent({
        event: "COMPLIANCE_FOOTER_INJECTED",
        severity: "HIGH",
        tenantId,
        request,
        details: {
          actionId: action.id,
          channel,
          wasContentEdited,
          needsRemoderation,
          missingOptOut: channel === "EMAIL" ? !hasOptOutLink : null,
          missingAI: !hasAIMention,
          missingStop: channel === "SMS" ? !hasStop : null,
        },
      });
    }

    // ── Étape 12 : Re-vérification opt-out juste avant envoi ──────────────────
    // Race condition : webhook opt-out concurrent entre étape 4 et ici.
    // L'appel Brevo (étape 13) est un I/O réseau externe — ne peut pas être inclus dans une
    // transaction Prisma. La fenêtre résiduelle (~50ms) est documentée en AuditLog (étape 15).
    const freshCustomer = await prisma.customer.findFirst({
      where: { id: action.customerId, tenantId },
      select: { optedOutAt: true },
    });
    if (freshCustomer?.optedOutAt) {
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CANCELLED", failureReason: "CUSTOMER_OPTED_OUT", failedAt: new Date() },
      });
      await prisma.quotaUsage
        .update({
          where: { tenantId_period: { tenantId, period: `send:${hour}` } },
          data: { actionsCount: { decrement: 1 } },
        })
        .catch(() => {});
      return NextResponse.json(
        { error: "Client désinscrit entre la revue et l'envoi." },
        { status: 409 }
      );
    }

    // ── Étape 13 : Envoi Brevo ─────────────────────────────────────────────────
    // NE PAS réincrémenter QuotaUsage (fait à la génération — generate/route.ts).
    // Cette route ne touche jamais les compteurs de la période business "YYYY-MM" —
    // elle upserte QuotaUsage uniquement pour le rate-limit sur la période distincte
    // "send:YYYY-MM-DDTHH" (voir incrementSendRateLimit plus haut). Dérive connue :
    // une action générée fin de mois puis envoyée le mois suivant n'est jamais
    // recomptée ici — comptabilisée une seule fois, à la génération.
    // Cooldown posé ci-dessous (étape 14bis) sur succès — delegation depuis generate/route.ts
    // en mode manuel (shouldAutoSend=false), qui ne pose plus le cooldown lui-même
    // safeToName anti-CRLH — injection d'en-tête email si firstName corrompu
    const safeToName = (action.customer.firstName ?? "")
      .replace(/[\r\n<>"]/g, "")
      .slice(0, 100);

    // email! / phone! : non-null garantis par la garde étape 6 (422 retourné AVANT claim si null)
    const sendResult =
      channel === "EMAIL"
        ? await sendBrevoEmail({
            toEmail: action.customer.email!,
            toName: safeToName,
            subject: finalSubject,
            htmlContent: finalContent,
          })
        : await sendBrevoSms({
            toPhone: action.customer.phone!, // BrevoSmsPayload.toPhone (send-sms.ts:21-24)
            content: finalContent,
          });

    // ── Étape 14 : Update DB ───────────────────────────────────────────────────
    // failureReason = code interne classifyBrevoError — jamais string brute Brevo (PII potentiel)
    // Transitoires (retriable) : BREVO_5XX, NETWORK_ERROR, BREVO_429
    // Permanents (FAILED)      : CONFIG_ERROR, BREVO_4XX, SEND_ERROR, UNKNOWN_ERROR
    const errorCode = sendResult.success ? null : classifyBrevoError(sendResult.error);
    const isTransient =
      errorCode === "BREVO_5XX" ||
      errorCode === "NETWORK_ERROR" ||
      errorCode === "BREVO_429";
    const finalStatus = sendResult.success ? "SENT" : isTransient ? initialStatus : "FAILED";

    await prisma.winbackAction.update({
      where: { id: action.id },
      data: {
        status: finalStatus,
        sentAt: sendResult.success ? new Date() : undefined,
        failedAt: !sendResult.success && !isTransient ? new Date() : undefined,
        failureReason: sendResult.success ? null : isTransient ? null : errorCode,
        brevoMessageId: sendResult.success ? sendResult.messageId : undefined,
        subject: channel === "EMAIL" ? finalSubject : null,
        content: finalContent,
      },
    });

    if (isTransient) {
      await prisma.quotaUsage
        .update({
          where: { tenantId_period: { tenantId, period: `send:${hour}` } },
          data: { actionsCount: { decrement: 1 } },
        })
        .catch(() => {});
    }

    // ── Étape 14bis : Cooldown + lastActionAt sur succès (mode manuel) ─────────
    // generate/route.ts ne pose plus le cooldown en mode manuel (shouldAutoSend=false) —
    // délégation ici, sur le seul chemin qui envoie réellement l'email/SMS.
    if (sendResult.success) {
      const settings = (user.tenant.settings ?? {}) as { cooldown_days?: number };
      const cooldownDays = settings.cooldown_days ?? COOLDOWN_DAYS_DEFAULT;
      const cooldownUntil = new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000);
      await prisma.customer.update({
        where: { id: action.customerId },
        data: { cooldownUntil, lastActionAt: new Date() },
      });
    }

    // ── Étape 15 : AuditLog ────────────────────────────────────────────────────
    // Pas de PII dans details (pas de contenu ni d'adresse client)
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "MANUAL_ACTION_SENT",
        entityType: "WinbackAction",
        entityId: action.id,
        details: {
          channel,
          wasContentEdited,
          needsRemoderation,
          sendSuccess: sendResult.success,
          errorCode,
          isTransient,
          optOutRaceWindowMs: "<50",
        } as Prisma.InputJsonValue,
      },
    });

    // 503 pour transitoire (action restaurée en PENDING pour retry), 500 pour permanent (FAILED)
    return NextResponse.json(
      {
        success: sendResult.success,
        sentAt: sendResult.success ? new Date().toISOString() : undefined,
      },
      { status: sendResult.success ? 200 : isTransient ? 503 : 500 }
    );
  } catch (err) {
    // Rollback SENDING → FAILED pour toute exception non gérée
    await prisma.winbackAction
      .update({
        where: { id: action.id },
        data: { status: "FAILED", failedAt: new Date(), failureReason: "INTERNAL_ERROR" },
      })
      .catch(() => {});
    console.error("[actions/send] Erreur interne:", err);
    return NextResponse.json({ error: "Erreur interne. Réessayez." }, { status: 500 });
  }
}
