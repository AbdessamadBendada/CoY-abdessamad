import { createJobsClient } from "@/shared/db/prisma";
import { sendBrevoEmail } from "@/features/messaging/brevo/send-email";
import { SETUP_FEES, SETUP_LABELS } from "@/features/billing/services/setup-fee";
import type { Prisma, Plan } from "@prisma/client";
import { getAppUrl } from "@/shared/utils/get-app-url";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrialEmailType =
  | "E1_ACTIVATION"
  | "E2_FIRST_RESULTS"
  | "E3_VALUE_PROOF"
  | "E4_URGENCY"
  | "E5_LAST_CHANCE"
  | "E6_J2_CONVERSION";

interface TrialStats {
  customersAtRisk: number;
  actionsTriggered: number;
  revenueSaved: number;
  hasIntegration: boolean;
  avgAtRiskLtv: number; // LTV moyenne réelle des clients à risque (ou 0 si aucune donnée)
}

// ─── Mapping jour → type d'email ─────────────────────────────────────────────

const EMAIL_SCHEDULE: Record<number, TrialEmailType> = {
  1: "E1_ACTIVATION",
  3: "E2_FIRST_RESULTS",
  7: "E3_VALUE_PROOF",
  13: "E4_URGENCY",
  19: "E6_J2_CONVERSION", // J-2 avant la conversion automatique (essai 21 jours)
  20: "E5_LAST_CHANCE",
};

// ─── Stats réelles du compte trial ───────────────────────────────────────────

async function getTrialStats(
  tenantId: string,
  prisma: ReturnType<typeof createJobsClient>
): Promise<TrialStats> {
  const [customersAtRisk, actionsTriggered, revenueAgg, integrationCount, ltvAgg] =
    await Promise.all([
      prisma.customer.count({
        where: { tenantId, churnRisk: { in: ["HIGH", "CRITICAL"] } },
      }),
      prisma.winbackAction.count({ where: { tenantId } }),
      prisma.winbackAction.aggregate({
        where: { tenantId, status: "CONVERTED" },
        _sum: { convertedValue: true },
      }),
      prisma.integration.count({
        where: { tenantId, status: "ACTIVE" },
      }),
      prisma.customer.aggregate({
        where: { tenantId, churnRisk: { in: ["HIGH", "CRITICAL"] } },
        _avg: { ltv: true },
      }),
    ]);

  return {
    customersAtRisk,
    actionsTriggered,
    revenueSaved: parseFloat(
      (revenueAgg._sum.convertedValue ?? 0).toString()
    ),
    hasIntegration: integrationCount > 0,
    avgAtRiskLtv: parseFloat((ltvAgg._avg.ltv ?? 0).toString()),
  };
}

// ─── Templates HTML ───────────────────────────────────────────────────────────

const APP_URL = getAppUrl();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailFooter(): string {
  return `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
      <p>CoY · Winback Agent — L'IA qui sauve vos clients avant qu'ils ne partent.</p>
      <p>Vous recevez cet email car vous avez créé un compte CoY · Winback Agent.</p>
    </div>`;
}

export function buildEmailContent(
  type: TrialEmailType,
  tenantName: string,
  ownerFirstName: string,
  stats: TrialStats,
  daysLeft: number,
  plan: Plan,
  setupFeeWaived: boolean = false
): { subject: string; htmlContent: string } {
  const firstName = (ownerFirstName || "vous").replace(/[\r\n]/g, "");
  const safeFirstName = escapeHtml(firstName);
  const safeTenantName = escapeHtml(tenantName);
  const setupAmount = SETUP_FEES[plan] / 100;
  const setupLabel = SETUP_LABELS[plan];
  const integrationCta = `<a href="${APP_URL}/integrations" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Connecter ma première intégration →</a>`;
  const dashboardCta = `<a href="${APP_URL}/overview" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Voir mon tableau de bord →</a>`;
  const billingCta = `<a href="${APP_URL}/billing" style="display:inline-block;background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">Gérer mon abonnement →</a>`;

  switch (type) {
    case "E1_ACTIVATION":
      return {
        subject: `${firstName}, votre CoY · Winback Agent attend sa première connexion`,
        htmlContent: `
          <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
            <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Bienvenue chez CoY · Winback Agent 👋</h1>
            <p>Bonjour ${safeFirstName},</p>
            <p>Votre compte <strong>${safeTenantName}</strong> est prêt. Vous avez <strong>21 jours</strong> pour tester CoY · Winback Agent gratuitement. Le moyen de paiement renseigné à l'inscription ne sera prélevé qu'à la fin de l'essai, sauf annulation de votre part.</p>
            <p>Pour démarrer, connectez votre helpdesk ou votre boutique en 3 minutes :</p>
            <ul style="color:#374151;padding-left:20px;">
              <li><strong>Gorgias</strong> — analyse automatique des tickets clients</li>
              <li><strong>Shopify</strong> ou <strong>PrestaShop</strong> — données comportementales réelles</li>
            </ul>
            <p>Une fois connecté, CoY · Winback Agent commence à scorer vos clients à risque automatiquement.</p>
            <p style="color:#6b7280;font-size:14px;margin-top:12px;">📅 Votre abonnement inclut une <strong>${setupLabel}</strong> personnalisée pour démarrer (valeur ${setupAmount}€ HT)${setupFeeWaived ? ", offerte sur votre compte" : ", facturée à la conversion de l'essai"}.</p>
            ${integrationCta}
            <p style="color:#6b7280;font-size:14px;">Besoin d'aide ? Répondez directement à cet email.</p>
            ${emailFooter()}
          </div>`,
      };

    case "E2_FIRST_RESULTS":
      return {
        subject: `Vos premiers résultats WinBack sont prêts`,
        htmlContent: `
          <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
            <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Vos premiers résultats</h1>
            <p>Bonjour ${safeFirstName},</p>
            ${
              stats.customersAtRisk > 0
                ? `<p>CoY · Winback Agent a analysé vos données. Voici ce qu'il a trouvé pour <strong>${safeTenantName}</strong> :</p>
                   <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
                     <p style="margin:0;font-size:18px;font-weight:700;color:#dc2626;">⚠️ ${stats.customersAtRisk} client${stats.customersAtRisk > 1 ? "s" : ""} à risque élevé détecté${stats.customersAtRisk > 1 ? "s" : ""}</p>
                     <p style="margin:8px 0 0;color:#7f1d1d;font-size:14px;">Ces clients risquent de ne plus jamais acheter chez vous.</p>
                   </div>
                   ${stats.avgAtRiskLtv > 0 ? `<p>Ces clients représentent en moyenne <strong>${Math.round(stats.avgAtRiskLtv)}€ de CA chacun</strong>. Sans action, ce CA est perdu.</p>` : `<p>Agissez maintenant avant qu'ils ne passent chez un concurrent.</p>`}`
                : `<p>CoY · Winback Agent commence à analyser vos données. <strong>Connectez une intégration</strong> pour voir vos premiers clients à risque.</p>`
            }
            ${stats.customersAtRisk > 0 ? dashboardCta : integrationCta}
            ${emailFooter()}
          </div>`,
      };

    case "E3_VALUE_PROOF": {
      // Calcul basé sur la LTV réelle si disponible, sinon aucun montant affiché
      const avgLtv = stats.avgAtRiskLtv > 0 ? stats.avgAtRiskLtv : 0;
      const potentialRevenue =
        stats.customersAtRisk > 0 && avgLtv > 0
          ? Math.round(stats.customersAtRisk * avgLtv * 0.08)
          : 0;
      return {
        subject:
          potentialRevenue > 0
            ? `WinBack a identifié ${potentialRevenue}€ de CA récupérable ce mois`
            : `Vos clients à risque — ce qu'il faut savoir`,
        htmlContent: `
          <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
            <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">La valeur que vous risquez de perdre</h1>
            <p>Bonjour ${safeFirstName},</p>
            ${
              potentialRevenue > 0
                ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
                     <p style="margin:0;font-size:20px;font-weight:700;color:#15803d;">💶 ${potentialRevenue}€ de CA récupérable ce mois</p>
                     <p style="margin:8px 0 0;color:#14532d;font-size:14px;">Basé sur ${stats.customersAtRisk} client${stats.customersAtRisk > 1 ? "s" : ""} à risque × LTV moyenne réelle × taux de récupération estimé 8%</p>
                   </div>
                   ${stats.revenueSaved > 0 ? `<p><strong>🎉 WinBack a déjà sauvé ${stats.revenueSaved.toFixed(0)}€ de CA</strong> depuis votre inscription !</p>` : ""}
                   <p>96% des PME e-commerce qui utilisent WinBack récupèrent au moins l'équivalent de leur abonnement mensuel dans les 30 premiers jours.</p>`
                : `<p>Connectez Gorgias ou votre boutique pour que WinBack calcule votre CA récupérable en temps réel.</p>`
            }
            ${dashboardCta}
            ${emailFooter()}
          </div>`,
      };
    }

    case "E4_URGENCY":
      return {
        subject: `Il vous reste ${daysLeft} jours — et ${stats.customersAtRisk} clients à risque non traités`,
        htmlContent: `
          <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
            <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">⏳ ${daysLeft} jours restants sur votre trial</h1>
            <p>Bonjour ${safeFirstName},</p>
            <p>Votre période d'essai se termine dans <strong>${daysLeft} jours</strong>. Sauf annulation de votre part, votre abonnement CoY (<strong>899€ HT/mois</strong>, résiliable à tout moment) démarrera automatiquement avec le moyen de paiement renseigné à l'inscription.</p>
            ${
              stats.customersAtRisk > 0
                ? `<p>En ce moment, <strong>${stats.customersAtRisk} client${stats.customersAtRisk > 1 ? "s" : ""} à risque</strong> chez ${safeTenantName} ${stats.customersAtRisk > 1 ? "n'ont" : "n'a"} pas encore été contacté${stats.customersAtRisk > 1 ? "s" : ""}.</p>`
                : ""
            }
            <div style="background:${setupFeeWaived ? "#f0fdf4;border:1px solid #bbf7d0" : "#fffbeb;border:1px solid #fde68a"};border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0;font-weight:700;color:${setupFeeWaived ? "#15803d" : "#92400e"};">${setupFeeWaived ? `Votre ${setupLabel} est offerte — aucun forfait d'entrée ne sera facturé.` : `À la conversion, un ${setupLabel} de ${setupAmount}€ HT sera également facturé (audit et session de lancement personnalisés).`}</p>
            </div>
            <p style="color:#6b7280;font-size:13px;">Vous pouvez annuler à tout moment avant la fin de l'essai depuis votre espace Client — aucun prélèvement n'aura alors lieu.</p>
            ${billingCta}
            <p style="color:#6b7280;font-size:14px;">Des questions sur votre abonnement ? Répondez à cet email, nous vous répondons sous 24h.</p>
            ${emailFooter()}
          </div>`,
      };

    case "E6_J2_CONVERSION":
      return setupFeeWaived
        ? {
            subject: `${firstName}, votre abonnement CoY démarre dans 2 jours`,
            htmlContent: `
              <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
                <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Plus que 2 jours d'essai</h1>
                <p>Bonjour ${safeFirstName},</p>
                <p>Votre période d'essai de <strong>${safeTenantName}</strong> se termine dans 2 jours. Sauf annulation de votre part, votre abonnement CoY (<strong>899€ HT/mois</strong>) démarrera automatiquement — le moyen de paiement renseigné à l'inscription sera prélevé.</p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0;font-weight:700;color:#15803d;">Votre ${setupLabel} est offerte — aucun forfait d'entrée ne sera facturé.</p>
                </div>
                ${stats.customersAtRisk > 0 ? `<p>En ce moment, <strong>${stats.customersAtRisk} client${stats.customersAtRisk > 1 ? "s" : ""} à risque</strong> chez ${safeTenantName} n'${stats.customersAtRisk > 1 ? "ont" : "a"} pas encore été traité${stats.customersAtRisk > 1 ? "s" : ""}.</p>` : ""}
                <p>Vous pouvez annuler à tout moment avant la fin de l'essai depuis votre espace Client — dans ce cas, aucun prélèvement n'aura lieu.</p>
                ${dashboardCta}
                <p style="color:#6b7280;font-size:14px;">Des questions ? Répondez directement à cet email.</p>
                ${emailFooter()}
              </div>`,
          }
        : {
            subject: `${firstName}, votre abonnement CoY démarre dans 2 jours`,
            htmlContent: `
              <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
                <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Plus que 2 jours d'essai</h1>
                <p>Bonjour ${safeFirstName},</p>
                <p>Votre période d'essai de <strong>${safeTenantName}</strong> se termine dans 2 jours. Sauf annulation de votre part, votre abonnement CoY (<strong>899€ HT/mois</strong>) démarrera automatiquement — le moyen de paiement renseigné à l'inscription sera prélevé.</p>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0;font-weight:700;color:#92400e;">À la conversion, un ${setupLabel} de ${setupAmount}€ HT sera également facturé (audit et session de lancement personnalisés).</p>
                </div>
                ${stats.customersAtRisk > 0 ? `<p>En ce moment, <strong>${stats.customersAtRisk} client${stats.customersAtRisk > 1 ? "s" : ""} à risque</strong> chez ${safeTenantName} n'${stats.customersAtRisk > 1 ? "ont" : "a"} pas encore été traité${stats.customersAtRisk > 1 ? "s" : ""}.</p>` : ""}
                <p>Vous pouvez annuler à tout moment avant la fin de l'essai depuis votre espace Client — dans ce cas, aucun prélèvement n'aura lieu.</p>
                ${dashboardCta}
                <p style="color:#6b7280;font-size:14px;">Des questions ? Répondez directement à cet email.</p>
                ${emailFooter()}
              </div>`,
          };

    case "E5_LAST_CHANCE":
      return {
        subject: `Dernier jour — votre abonnement CoY démarre demain`,
        htmlContent: `
          <div style="font-family:'Avenir Next',Avenir,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111827;">
            <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">⏳ Dernier jour d'essai</h1>
            <p>Bonjour ${safeFirstName},</p>
            <p>Votre essai se termine demain. Sauf annulation de votre part, votre abonnement CoY (<strong>899€ HT/mois</strong>, résiliable à tout moment) démarrera automatiquement avec le moyen de paiement renseigné à l'inscription.</p>
            ${
              stats.revenueSaved > 0
                ? `<p>Pendant votre essai, WinBack a déjà sauvé <strong>${stats.revenueSaved.toFixed(0)}€ de CA</strong>. Continuez sur cette lancée.</p>`
                : `<p>Les PME qui utilisent WinBack récupèrent en moyenne 300€ à 8 352€ de CA par mois — automatiquement.</p>`
            }
            <div style="background:${setupFeeWaived ? "#f0fdf4;border:1px solid #bbf7d0" : "#fffbeb;border:1px solid #fde68a"};border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0;font-weight:700;color:${setupFeeWaived ? "#15803d" : "#92400e"};">${setupFeeWaived ? `Votre ${setupLabel} est offerte — aucun forfait d'entrée ne sera facturé.` : `À la conversion, un ${setupLabel} de ${setupAmount}€ HT sera également facturé (audit et session de lancement personnalisés).`}</p>
            </div>
            ${billingCta}
            <p style="color:#6b7280;font-size:13px;">Si vous ne souhaitez pas continuer, vous pouvez annuler jusqu'à ce soir depuis votre espace Client — aucun prélèvement ne sera alors effectué.</p>
            ${emailFooter()}
          </div>`,
      };
  }
}

// ─── Vérification email déjà envoyé (via AuditLog) ────────────────────────────

async function isEmailAlreadySent(
  tenantId: string,
  emailType: TrialEmailType,
  prisma: ReturnType<typeof createJobsClient>
): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      tenantId,
      action: "TRIAL_EMAIL_SENT",
      details: { path: ["emailType"], equals: emailType },
    },
    select: { id: true },
  });
  return existing !== null;
}

// ─── Envoi d'un email trial ───────────────────────────────────────────────────

async function sendTrialEmail(
  tenantId: string,
  tenantName: string,
  ownerEmail: string,
  ownerFirstName: string,
  emailType: TrialEmailType,
  stats: TrialStats,
  daysLeft: number,
  plan: Plan,
  setupFeeWaived: boolean,
  prisma: ReturnType<typeof createJobsClient>
): Promise<void> {
  const { subject, htmlContent } = buildEmailContent(
    emailType,
    tenantName,
    ownerFirstName,
    stats,
    daysLeft,
    plan,
    setupFeeWaived
  );

  const result = await sendBrevoEmail({
    toEmail: ownerEmail,
    toName: ownerFirstName || tenantName,
    subject,
    htmlContent,
  });

  if (!result.success) {
    console.error(
      `[trial-sequence] Erreur envoi ${emailType} pour tenant ${tenantId}: ${result.error}`
    );
    return;
  }

  const maskedEmail = ownerEmail.replace(/(^.).+(@.+$)/, "$1***$2");

  // Log pour éviter les doublons + traçabilité
  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "TRIAL_EMAIL_SENT",
      entityType: "Tenant",
      entityId: tenantId,
      details: {
        emailType,
        subject,
        sentTo: maskedEmail,
      } as Prisma.InputJsonValue,
    },
  });

  console.log(`[trial-sequence] ${emailType} envoyé (tenant: ${tenantId}, to: ${maskedEmail})`);
}

// ─── Entrée principale ────────────────────────────────────────────────────────

export async function runTrialEmailSequence(): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const prisma = createJobsClient();
  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Récupérer tous les tenants en trial avec une date de démarrage
    const trialTenants = await prisma.tenant.findMany({
      where: {
        status: "TRIAL",
        trialStartedAt: { not: null },
      },
      include: {
        users: {
          where: { role: "OWNER" },
          select: { email: true, firstName: true },
          take: 1,
        },
      },
    });

    for (const tenant of trialTenants) {
      try {
        const owner = tenant.users[0];
        if (!owner) {
          console.warn(`[trial-sequence] Tenant ${tenant.id} sans OWNER, ignoré`);
          skipped++;
          continue;
        }

        const trialStartedAt = tenant.trialStartedAt!;
        const daysSinceStart = Math.floor(
          (now.getTime() - trialStartedAt.getTime()) / 86400000
        );
        const trialEndsAt = tenant.trialEndsAt ?? new Date(trialStartedAt.getTime() + 21 * 86400000);
        const daysLeft = Math.max(
          0,
          Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000)
        );

        const emailType = EMAIL_SCHEDULE[daysSinceStart];
        if (!emailType) {
          // Pas d'email prévu ce jour-là
          skipped++;
          continue;
        }

        // Vérifier que cet email n'a pas déjà été envoyé
        const alreadySent = await isEmailAlreadySent(tenant.id, emailType, prisma);
        if (alreadySent) {
          skipped++;
          continue;
        }

        const stats = await getTrialStats(tenant.id, prisma);

        await sendTrialEmail(
          tenant.id,
          tenant.name,
          owner.email,
          owner.firstName ?? "",
          emailType,
          stats,
          daysLeft,
          tenant.plan,
          tenant.setupFeeWaived,
          prisma
        );

        sent++;
      } catch (err) {
        console.error(`[trial-sequence] Erreur tenant ${tenant.id}:`, err);
        errors++;
      }
    }

    console.log(`[trial-sequence] Terminé — ${sent} envoyé(s), ${skipped} ignoré(s), ${errors} erreur(s)`);
    return { sent, skipped, errors };
  } finally {
    await prisma.$disconnect();
  }
}
