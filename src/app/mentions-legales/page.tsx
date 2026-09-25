import Link from "next/link";

export const metadata = {
  title: "Mentions légales — CoY",
};

export default function MentionsLegalesPage() {
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
          Mentions légales
        </h1>
        <p style={{ color: "var(--landing-muted)", fontSize: "0.85rem", marginBottom: "3rem" }}>
          Version 3.0 — Applicable à compter du 8 septembre 2026 — Conformément à la loi LCEN du 21 juin 2004 modifiée par la loi SREN du 21 mai 2024
        </p>

        {[
          {
            title: "1. Éditeur du site",
            content: [
              "Dénomination sociale : CoYia SAS",
              "Forme juridique : Société par Actions Simplifiée (SAS) à associé unique",
              "Capital social : 1 000 euros",
              "SIREN : [SIREN]",
              "SIRET : [SIRET]",
              "RCS : [Ville] — N° de gestion [numéro]",
              "Date d'immatriculation : 22 octobre 2025",
              "Adresse du siège social : [Adresse du siège social]",
              "Code APE : 82.11Z — Services administratifs combinés de bureau",
              "TVA intracommunautaire : [TVA intracommunautaire]",
              "Présidente : [Nom du dirigeant]",
              "Directrice de publication : [Nom du dirigeant]",
              "Email de contact : contact@coyia.fr",
              "Site web : https://winback-agent.fr",
            ],
          },
          {
            title: "2. Hébergement",
            content: [
              "2a. Hébergeur du site web et de l'application (frontend) : Vercel Inc. — 440 N Baxter Street, Los Angeles, CA 90012, États-Unis — https://vercel.com — Contact : privacy@vercel.com. L'application frontend est servie via le réseau CDN de Vercel. Vercel n'héberge aucune donnée personnelle métier des utilisateurs de CoY.",
              "2b. Hébergeur des données personnelles : Supabase Inc. — Datacenter Europe, Francfort, Allemagne — https://supabase.com — Toutes les données personnelles sont hébergées exclusivement au sein de l'Union Européenne.",
              "Infrastructure complémentaire : OVHcloud SAS — 2 rue Kellermann, 59100 Roubaix, France — SIREN : 424 761 419 — https://www.ovhcloud.com",
            ],
          },
          {
            title: "3. Propriété intellectuelle",
            content: [
              "L'ensemble des contenus présents sur le site winback-agent.fr et la plateforme CoY (textes, images, logos, graphismes, vidéos, code source, architecture logicielle, bases de données et documentation) sont protégés par le droit de la propriété intellectuelle et sont la propriété exclusive de CoYia SAS.",
              "Toute reproduction, représentation, modification, adaptation, traduction, distribution ou utilisation, même partielle, sans autorisation écrite préalable de CoYia SAS est strictement interdite et constituerait une contrefaçon sanctionnée par les articles L335-2 et suivants du Code de la propriété intellectuelle.",
              "Les dénominations CoYia et CoY sont des marques ou noms commerciaux de CoYia SAS. Leur utilisation sans autorisation écrite préalable est interdite.",
            ],
          },
          {
            title: "4. Intelligence artificielle et transparence (AI Act)",
            content: [
              "CoY intègre des modèles d'intelligence artificielle fournis par Mistral AI SAS (mistral-large-latest, mistral-small-latest, via API). Ce système est classifié à risque limité au sens du Règlement (UE) 2024/1689 relatif à l'intelligence artificielle (AI Act).",
              "Conformément à l'article 50 du Règlement (UE) 2024/1689, CoYia SAS s'engage à ce que toute communication générée avec l'assistance de l'IA soit identifiée comme telle auprès des destinataires finaux, via la mention : « Ce message a été personnalisé avec l'assistance d'un outil d'intelligence artificielle dans le cadre de notre démarche de qualité de service. »",
              "Le traitement automatisé des données (scoring de risque de churn) constitue un profilage au sens de l'article 4.4 du RGPD. Il est soumis aux dispositions des articles 21 et 22 du RGPD. Tout client final d'un e-commerçant utilisant CoY peut exercer son droit d'opposition via le lien de désinscription inclus dans chaque communication, ou en contactant directement l'e-commerçant concerné.",
              "CoYia SAS maintient une documentation technique du système IA (finalités, fournisseur, mesures d'atténuation des risques). Cette documentation est disponible sur demande motivée à contact@coyia.fr.",
            ],
          },
          {
            title: "5. Responsabilité",
            content: [
              "CoYia SAS s'efforce d'assurer l'exactitude et la mise à jour régulière des informations diffusées sur ce site. Toutefois, elle ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.",
              "CoYia SAS se réserve le droit de corriger, à tout moment et sans préavis, le contenu du site public. CoYia SAS décline toute responsabilité pour tout dommage résultant d'une intrusion frauduleuse d'un tiers ayant entraîné une modification des informations mises à disposition sur le site.",
              "CoYia SAS décline toute responsabilité pour le contenu des sites internet tiers vers lesquels des liens hypertextes présents sur ce site pourraient renvoyer.",
              "Les engagements relatifs au Service SaaS CoY (disponibilité, support, sécurité des données) sont définis dans les Conditions Générales de Vente et l'Annexe SLA.",
            ],
          },
          {
            title: "6. Médiation et recours",
            content: [
              "CoY étant un service destiné exclusivement aux professionnels (B2B), les dispositions du Code de la consommation relatives à la médiation de la consommation ne sont pas applicables.",
              "En cas de litige entre professionnels, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours avant tout recours judiciaire. Le Client professionnel peut recourir au Centre de Médiation et d'Arbitrage de Paris (CMAP) — 39 avenue Franklin D. Roosevelt, 75008 Paris — www.cmap.fr — ou contacter contact@coyia.fr pour obtenir les coordonnées d'un médiateur.",
              "À défaut de résolution amiable, tout litige sera soumis à la compétence exclusive du Tribunal de commerce de [Ville].",
            ],
          },
          {
            title: "7. Données personnelles",
            content: [
              "Le traitement des données personnelles des utilisateurs de CoY est décrit dans la Politique de confidentialité, accessible en permanence à l'adresse : winback-agent.fr/confidentialite",
              "CoYia SAS agit en qualité de Responsable du traitement pour les données des clients abonnés (compte, facturation, utilisation) et en qualité de Sous-traitant (art. 28 RGPD) pour les données des clients finaux des e-commerçants abonnés.",
              "Pour toute demande relative à vos données personnelles : contact@coyia.fr — réponse sous 30 jours calendaires.",
              "Autorité de contrôle compétente : Commission Nationale de l'Informatique et des Libertés (CNIL) — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr",
            ],
          },
          {
            title: "8. Cookies et traceurs",
            content: [
              "Site public (winback-agent.fr) : Plausible Analytics (Plausible Analytics OÜ, Estonie, UE) — solution d'analyse d'audience conforme au RGPD, sans cookies de tracking, sans collecte d'adresse IP complète, sans identifiant persistant. Conforme à la délibération CNIL du 28 janvier 2021 — exempt de consentement préalable.",
              "Plateforme CoY (dashboard) : uniquement des cookies de session nécessaires à l'authentification (cookies httpOnly, Supabase Auth). Ces cookies sont strictement nécessaires au fonctionnement du Service et sont exempts de consentement au titre de l'article 5.3 de la Directive ePrivacy (2002/58/CE).",
              "Aucun cookie publicitaire ni traceur cross-site n'est utilisé sur le site ou la plateforme.",
            ],
          },
          {
            title: "9. Contact",
            content: [
              "Pour toute question relative aux présentes mentions légales, au Service CoY ou aux pratiques de confidentialité de CoYia SAS : contact@coyia.fr",
              "CoYia SAS s'engage à répondre à toute demande dans un délai de 5 jours ouvrables.",
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
