// ─── Template email — Guide configuration webhooks Shopify ────────────────────
// Envoyé automatiquement après connexion OAuth Shopify réussie.
// Variables injectées côté serveur avant envoi via Brevo.

import { escapeHtml } from "@/lib/utils/escape-html";
import { SECTOR_MODE, SECTOR_SPORT, SECTOR_DECORATION, SECTOR_AUTRE } from "@/config/sectors";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ShopifySetupEmailVars = {
  prenom: string;
  boutique: string;             // ex: winback-test-store.myshopify.com
  plan: string;                 // ex: Starter
  integrations_plan: string;    // ex: "2 intégrations incluses (Shopify + Gorgias)"
  secteur: string;              // ex: Mode
  ca_potentiel: string;         // ex: "jusqu'à 1 500€/mois"
  jours_trial: number | null;   // null si déjà payant
  guide_url: string;            // URL directe vers /integrations dans le dashboard
};

// ─── Données secteur → CA potentiel ───────────────────────────────────────────
// Mode/Décoration : moyenne tous secteurs (pas de multiple sourcé — ADR-018) plutôt
// qu'un chiffre pair secteur/montant qui impliquerait une promesse sectorielle.

const CA_POTENTIEL: Record<string, string> = {
  [SECTOR_SPORT]: "jusqu'à 1 800€/mois",
  [SECTOR_MODE]: "jusqu'à 1 000€/mois (moyenne tous secteurs)",
  [SECTOR_DECORATION]: "jusqu'à 1 000€/mois (moyenne tous secteurs)",
  [SECTOR_AUTRE]: "jusqu'à 1 000€/mois",
};

export function getCaPotentiel(sector: string | null): string {
  if (!sector) return "jusqu'à 1 000€/mois";
  return Object.hasOwn(CA_POTENTIEL, sector) ? CA_POTENTIEL[sector] : "jusqu'à 1 000€/mois";
}

// ─── Données plan → intégrations incluses ─────────────────────────────────────

const INTEGRATIONS_PLAN: Record<string, string> = {
  COY:        "intégrations illimitées",
  ESSENTIEL:  "1 intégration incluse (Shopify, Gorgias ou PrestaShop)", // @deprecated — supprimé de la grille commerciale le 09/06/2026
  STARTER:    "2 intégrations incluses (ex : Shopify + Gorgias)", // @deprecated 2026-09-05 — palier unique CoY
  CROISSANCE: "jusqu'à 4 intégrations incluses", // @deprecated 2026-09-05 — idem
  EXPERT:     "intégrations illimitées", // @deprecated 2026-09-05 — idem
};

export function getIntegrationsPlan(plan: string): string {
  return INTEGRATIONS_PLAN[plan.toUpperCase()] ?? "intégrations incluses selon votre plan";
}

// ─── Générateur HTML ───────────────────────────────────────────────────────────

export function buildShopifySetupEmail(vars: ShopifySetupEmailVars): {
  subject: string;
  html: string;
} {
  const subject = `${vars.prenom}, activez WinBack sur ${vars.boutique} en 5 min`;

  const trialBanner = vars.jours_trial !== null && vars.jours_trial > 0
    ? `
      <tr>
        <td style="padding: 0 32px 20px;">
          <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 8px; padding: 12px 16px;">
            <p style="margin: 0; font-size: 13px; color: #b45309; font-weight: 600;">
              ⏳ Il vous reste <strong>${vars.jours_trial} jour${vars.jours_trial > 1 ? "s" : ""}</strong> sur votre essai gratuit
            </p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #92400e;">
              Configurez maintenant pour profiter de WinBack dès les premières commandes.
            </p>
          </div>
        </td>
      </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #F3F4F6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: #2B2523; padding: 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      WinBack <span style="color: #20B2AA;">Agent</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 20px;">
                      Plan ${vars.plan}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accroche -->
          <tr>
            <td style="padding: 32px 32px 20px;">
              <p style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #2B2523; line-height: 1.3;">
                Bonjour ${escapeHtml(vars.prenom)} 👋
              </p>
              <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;">
                Votre boutique <strong>${escapeHtml(vars.boutique)}</strong> est connectée à CoY · Winback Agent.
                Il reste <strong>une dernière étape</strong> pour que l'analyse démarre automatiquement.
              </p>
            </td>
          </tr>

          <!-- Bannière trial (conditionnelle) -->
          ${trialBanner}

          <!-- Bloc ROI -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background: linear-gradient(135deg, rgba(32,178,170,0.06) 0%, rgba(43,37,35,0.03) 100%); border: 1px solid rgba(32,178,170,0.2); border-radius: 10px; padding: 20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right: 12px; vertical-align: top;">
                      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #20B2AA; text-transform: uppercase; letter-spacing: 0.5px;">Votre secteur</p>
                      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #2B2523;">${escapeHtml(vars.secteur)}</p>
                    </td>
                    <td style="border-left: 1px solid rgba(32,178,170,0.2); padding-left: 12px; vertical-align: top;">
                      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #20B2AA; text-transform: uppercase; letter-spacing: 0.5px;">Potentiel de récupération</p>
                      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #2B2523;">${vars.ca_potentiel}</p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 12px; border-top: 1px solid rgba(32,178,170,0.15); margin-top: 12px;">
                      <p style="margin: 8px 0 0; font-size: 12px; color: #6B7280;">
                        📦 ${vars.integrations_plan}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Ce qu'il reste à faire -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #2B2523;">
                Ce qu'il reste à faire (5 minutes) :
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ["1", "Ouvrez votre admin Shopify → Paramètres → Notifications → Webhooks"],
                  ["2", "Créez 3 webhooks pointant vers votre URL WinBack personnalisée"],
                  ["3", "Revenez sur CoY · Winback Agent — vos premières commandes s'affichent automatiquement"],
                ].map(([num, text]) => `
                <tr>
                  <td style="padding: 6px 0; vertical-align: top;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px;">
                          <span style="display: inline-block; width: 22px; height: 22px; background: #20B2AA; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; font-weight: 700; color: #fff;">${num}</span>
                        </td>
                        <td style="vertical-align: middle; font-size: 13px; color: #374151; line-height: 1.5;">${text}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px;" align="center">
              <a
                href="${vars.guide_url}"
                style="display: inline-block; background: #20B2AA; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 8px; letter-spacing: -0.2px;"
              >
                Accéder au guide de configuration →
              </a>
              <p style="margin: 12px 0 0; font-size: 11px; color: #9CA3AF;">
                Le guide s'ouvre directement sur votre page Intégrations — aucune recherche nécessaire.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #374151;">
                À très vite,
              </p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #2B2523;">L'équipe CoY</p>
              <p style="margin: 2px 0 0; font-size: 12px; color: #6B7280;">CoYia / CoY · Winback Agent</p>
              <p style="margin: 2px 0 0; font-size: 12px; color: #9CA3AF;">
                Une question ? Répondez directement à cet email — nous répondons en moins de 24h.
              </p>
            </td>
          </tr>

          <!-- Footer légal -->
          <tr>
            <td style="padding: 16px 32px; background: #F9FAFB; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0; font-size: 10px; color: #9CA3AF; line-height: 1.6; text-align: center;">
                CoYia SAS<br />
                Vous recevez cet email car vous avez créé un compte CoY · Winback Agent.<br />
                <a href="${vars.guide_url.split("/integrations")[0]}/confidentialite" style="color: #9CA3AF;">Politique de confidentialité</a>
                &nbsp;·&nbsp;
                <a href="${vars.guide_url.split("/integrations")[0]}/cgv" style="color: #9CA3AF;">CGV</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
