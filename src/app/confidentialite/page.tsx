import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — CoY",
};

export default function ConfidentialitePage() {
  return (
    <div style={{ background: "var(--landing-bg)", minHeight: "100vh", padding: "6rem 0" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 1.5rem" }}>
        <Link
          href="/help"
          style={{ color: "#D97757", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "2rem" }}
        >
          ← Retour à l&apos;accueil
        </Link>

        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--landing-text)", marginBottom: "0.5rem" }}>
          Politique de confidentialité
        </h1>
        <p style={{ color: "var(--landing-muted)", fontSize: "0.85rem", marginBottom: "3rem" }}>
          CoYia SAS — Version 3.0 — Applicable à compter du 8 septembre 2026 — Conforme RGPD (UE) 2016/679, AI Act (UE) 2024/1689
        </p>

        {[
          {
            title: "1. Responsable du traitement",
            content: [
              "CoYia SAS, immatriculée au RCS de [Ville] sous le numéro SIREN [SIREN] (SIRET [SIRET]).",
              "Siège social : [Adresse du siège social].",
              "Présidente : [Nom du dirigeant] — Contact : contact@coyia.fr — Réponse garantie sous 30 jours calendaires.",
              "Délégué à la protection des données (DPO) : CoYia SAS n'a pas encore désigné de DPO (seuil légal non atteint au jour de publication). Toute demande relative à la protection des données est traitée par contact@coyia.fr.",
            ],
          },
          {
            title: "2. Catégories de personnes concernées",
            content: [
              "2a. Clients abonnés (Responsable du traitement) : les e-commerçants abonnés à CoY. Pour leurs données de compte et de facturation, CoYia SAS traite ces données en qualité de Responsable du traitement.",
              "2b. Clients finaux des e-commerçants (Sous-traitant) : les consommateurs dont les données (conversations SAV, commandes, profils de churn) sont traitées par CoY pour le compte des Clients. Dans ce cadre, CoYia SAS agit en qualité de Sous-traitant au sens de l'article 28 du RGPD.",
            ],
          },
          {
            title: "3. Données collectées",
            content: [
              "3a. Données de compte Client : nom, prénom, adresse email professionnelle, nom et secteur de l'entreprise, numéro de SIRET (facultatif).",
              "3b. Données de facturation : coordonnées de paiement traitées exclusivement par Stripe Payments Europe Limited (Irlande, UE) — CoYia SAS n'accède jamais aux numéros de carte bancaire ni aux données bancaires brutes.",
              "3c. Données d'utilisation : logs de connexion, actions effectuées sur la plateforme, préférences de configuration, interactions avec le tableau de bord.",
              "Données clients finaux (en sous-traitance) : conversations SAV importées via Gorgias, commandes importées via Shopify / PrestaShop, score de churn calculé (0–100), actions de récupération générées, statut d'attribution (CONVERTED / NOT_CONVERTED).",
              "Données de communication : numéros de téléphone mobile des clients finaux (pour envoi SMS via Brevo), uniquement si le Client a activé le canal SMS et recueilli le consentement de ses propres clients.",
            ],
          },
          {
            title: "4. Finalités et bases légales",
            content: [
              "Exécution du contrat (Art. 6.1.b RGPD) : fourniture du service CoY, gestion de l'abonnement, émission des factures.",
              "Intérêt légitime (Art. 6.1.f RGPD) : sécurité de la plateforme, détection des fraudes, amélioration des modèles IA (données anonymisées uniquement), analyse agrégée des performances.",
              "Obligation légale (Art. 6.1.c RGPD) : conservation des factures pendant 10 ans (art. L123-22 Code de commerce), journalisation des accès pour conformité RGPD.",
              "Consentement (Art. 6.1.a RGPD) : envoi de communications marketing (newsletter, nouveautés produit) — révocable à tout moment.",
            ],
          },
          {
            title: "5. Durée de conservation",
            content: [
              "Données de compte Client actif : durée de la relation contractuelle.",
              "Données de compte après résiliation : 3 ans à compter de la date de résiliation (délai de prescription commerciale).",
              "Données de facturation : 10 ans (obligation comptable — art. L123-22 Code de commerce).",
              "Données IA traitées (conversations SAV, scores churn) : 12 mois glissants, puis suppression automatique.",
              "Données clients finaux après résiliation du Client : 30 jours exportables, puis suppression définitive et irrécupérable.",
              "Logs de sécurité (SecurityEvents) : 12 mois.",
            ],
          },
          {
            title: "6. Sous-traitants ultérieurs",
            content: [
              "Supabase Inc. — Base de données PostgreSQL — Datacenter EU, Francfort, Allemagne — Données : toutes les données de la plateforme — DPA signé, CCT applicable.",
              "Stripe Payments Europe Limited — Paiement en ligne — Dublin, Irlande (UE) — Données : coordonnées de paiement, historique facturation — DPA signé.",
              "Mistral AI SAS — Modèles IA (mistral-large-latest, mistral-small-latest) — France (UE) — Données : contenus des conversations SAV anonymisés, prompts de génération — DPA signé (12/03/2026).",
              "Brevo SAS — Emails et SMS transactionnels — France (UE) — Données : adresses email et numéros de téléphone des clients finaux — DPA signé.",
              "Langfuse GmbH — Observabilité IA — Allemagne (UE) — Données : logs de performance des appels IA, métriques anonymisées — DPA signé.",
              "OVHcloud SAS — Infrastructure VPS (n8n self-hosted) — France (UE) — Données : logs applicatifs, orchestration workflows — DPA signé.",
              "Vercel Inc. — Hébergement frontend CDN — États-Unis — Données : requêtes HTTP, logs réseau (sans données personnelles identifiantes) — DPA signé, CCT applicable.",
              "Plausible Analytics OÜ — Analytics site public uniquement — Estonie (UE) — Données : pages vues agrégées, sans cookies, sans IP complète — Exempt CNIL (délibération 28 janvier 2021).",
              "Yousign SAS — Signature électronique DPA — France (UE) — Données : email et nom du signataire — DPA signé.",
            ],
          },
          {
            title: "7. Transferts hors Union européenne",
            content: [
              "Un seul sous-traitant est établi hors de l'Union européenne : Vercel Inc. (États-Unis). Ce transfert est encadré par des Clauses Contractuelles Types (CCT) adoptées par la Commission européenne (décision 2021/914).",
              "Mistral AI SAS et Stripe Payments Europe Limited sont établis au sein de l'UE (France et Irlande respectivement) — aucun transfert hors UE applicable pour ces sous-traitants.",
              "Le registre détaillé des sous-traitants et des garanties associées est disponible sur demande à contact@coyia.fr.",
            ],
          },
          {
            title: "8. Vos droits (RGPD)",
            content: [
              "Vous disposez des droits suivants concernant vos données personnelles : droit d'accès (art. 15), droit de rectification (art. 16), droit à l'effacement (art. 17), droit à la portabilité (art. 20), droit d'opposition (art. 21), droit à la limitation du traitement (art. 18).",
              "Pour exercer vos droits : contact@coyia.fr — réponse garantie sous 30 jours calendaires. Une pièce d'identité peut être demandée pour vérifier votre identité.",
              "Droit de réclamation : vous pouvez introduire une réclamation auprès de la CNIL — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr.",
            ],
          },
          {
            title: "9. Profilage et décision automatisée (Art. 22 RGPD)",
            content: [
              "CoY effectue un scoring automatisé du risque de churn (0–100) pour les clients finaux des e-commerçants. Ce scoring constitue un profilage au sens de l'article 4.4 du RGPD.",
              "Ce traitement ne constitue pas une décision automatisée produisant des effets juridiques significatifs (art. 22 RGPD), dans la mesure où : (i) l'envoi des communications peut toujours être supervisé et annulé par le Client e-commerçant, (ii) un droit d'opposition est disponible via le lien de désinscription, (iii) le Client peut exclure manuellement un client final du scoring, et (iv) aucune décision défavorable au sens juridique n'est prise sur la seule base du score.",
              "Tout client final peut exercer son droit d'opposition au profilage via le lien de désinscription inclus dans chaque communication, ou en contactant directement l'e-commerçant.",
            ],
          },
          {
            title: "10. Intelligence artificielle (AI Act)",
            content: [
              "Le système d'IA de CoY (scoring churn + génération d'actions) est classifié à risque limité au sens du Règlement (UE) 2024/1689 (AI Act).",
              "Conformément à l'article 50 de l'AI Act, toute communication générée avec l'assistance de l'IA est identifiée comme telle : les emails et SMS incluent la mention « Ce message a été personnalisé avec l'assistance d'un outil d'intelligence artificielle dans le cadre de notre démarche de qualité de service. »",
              "Les modèles Mistral AI (mistral-large-latest, mistral-small-latest) sont des systèmes IA généralistes (GPAI) au sens de l'AI Act, fournis par un opérateur établi en France. CoYia SAS utilise ces modèles via API dans le cadre d'un usage à risque limité, soumis aux obligations de transparence de l'article 50.",
              "CoYia SAS maintient une documentation technique du système IA (finalités, fournisseur, mesures d'atténuation des risques), disponible sur demande motivée à contact@coyia.fr.",
            ],
          },
          {
            title: "11. Communications SMS (L34-5 CPCE)",
            content: [
              "L'envoi de SMS commerciaux aux clients finaux des e-commerçants est soumis aux dispositions de l'article L34-5 du Code des postes et des communications électroniques (CPCE).",
              "Le Client e-commerçant est responsable d'obtenir le consentement préalable et exprès de ses propres clients avant tout envoi de SMS via CoY.",
              "Chaque SMS envoyé via CoY inclut obligatoirement : l'identification de l'expéditeur (nom de l'e-commerçant) et un mécanisme de désinscription (réponse STOP).",
            ],
          },
          {
            title: "12. Cookies et analytics",
            content: [
              "Le site public winback-agent.fr utilise Plausible Analytics (Plausible Analytics OÜ, Estonie, UE). Plausible est une solution d'analyse d'audience RGPD natif : aucun cookie de tracking n'est déposé, aucune adresse IP complète n'est collectée, aucun identifiant persistant n'est utilisé. Service exempt de consentement selon la délibération CNIL du 28 janvier 2021.",
              "La plateforme CoY (dashboard) utilise uniquement des cookies de session nécessaires à l'authentification (cookies httpOnly Supabase). Aucun cookie publicitaire ou de suivi cross-site n'est déposé.",
            ],
          },
          {
            title: "13. Modifications de la présente politique",
            content: [
              "CoYia SAS se réserve le droit de modifier la présente politique de confidentialité à tout moment pour refléter des évolutions légales, réglementaires ou techniques.",
              "En cas de modification substantielle, les Clients seront notifiés par email avec un préavis de 30 jours.",
              "La version en vigueur est toujours accessible sur winback-agent.fr/confidentialite avec sa date de mise à jour.",
            ],
          },
        ].map((section) => (
          <section key={section.title} style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--landing-text)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(32,178,170,0.15)" }}>
              {section.title}
            </h2>
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {section.content.map((line, i) => (
                <li key={i} style={{ color: "var(--landing-muted)", fontSize: "0.92rem", lineHeight: 1.7 }}>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p style={{ color: "var(--landing-muted)", fontSize: "0.8rem", marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(32,178,170,0.15)" }}>
          CoYia SAS — SIREN [SIREN] — SIRET [SIRET] — RCS [Ville] — TVA [TVA intracommunautaire] — [Adresse du siège social] — contact@coyia.fr
        </p>
      </div>
    </div>
  );
}
