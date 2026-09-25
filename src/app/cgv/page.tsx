import Link from "next/link";

export const metadata = {
  title: "Conditions Générales de Vente — CoY",
};

export default function CgvPage() {
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
          Conditions Générales de Vente
        </h1>
        <p style={{ color: "var(--landing-muted)", fontSize: "0.85rem", marginBottom: "3rem" }}>
          CoYia SAS — Version 3.0 — Applicable à compter du 8 septembre 2026
        </p>

        {[
          {
            title: "Article 1 — Objet et champ d'application",
            content: [
              "Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les relations contractuelles entre CoYia SAS, société par actions simplifiée au capital de 1 000 euros, immatriculée au RCS de [Ville] sous le numéro [SIREN] (SIRET [SIRET]), dont le siège social est situé [Adresse du siège social] (ci-après « le Prestataire »), et tout client professionnel (ci-après « le Client ») souscrivant au service CoY.",
              "CoY est un service SaaS d'analyse de satisfaction client et de récupération automatisée de clients à risque de churn, destiné exclusivement aux professionnels agissant dans le cadre de leur activité commerciale, industrielle, artisanale, libérale ou agricole (B2B).",
              "Les présentes CGV s'appliquent à l'exclusion de toute autre condition. La version en vigueur est celle publiée sur winback-agent.fr au moment de la souscription. Ces CGV sont complétées par l'Annexe 1 — Niveaux de service (SLA) et le DPA (Accord de Traitement des Données), qui en font partie intégrante.",
            ],
          },
          {
            title: "Article 2 — Définitions",
            content: [
              "« Service » : la plateforme SaaS CoY, comprenant l'analyse de sentiment, le scoring churn 0–100, la génération d'actions de récupération et le tableau de bord ROI.",
              "« Client » : toute personne morale ou physique agissant dans le cadre de son activité professionnelle ayant souscrit un abonnement au Service.",
              "« Client final » : toute personne physique dont les données sont traitées par le Service pour le compte du Client (consommateur du Client).",
              "« Données Client » : l'ensemble des données (conversations SAV, commandes, clients finaux) importées ou générées via les intégrations activées par le Client.",
              "« DPA » : Accord de Traitement des Données (Data Processing Agreement) conclu entre le Prestataire et le Client conformément à l'article 28 du RGPD.",
              "« Annexe SLA » : Annexe 1 aux présentes CGV définissant les niveaux de service applicables.",
              "« Période d'abonnement » : la durée mensuelle souscrite par le Client.",
            ],
          },
          {
            title: "Article 3 — Acceptation des CGV",
            content: [
              "En créant un compte sur CoY, le Client accepte sans réserve les présentes CGV, l'Annexe SLA et la Politique de confidentialité dans leur intégralité.",
              "Si le Client agit au nom d'une personne morale, il déclare disposer des pouvoirs nécessaires pour engager cette entité.",
              "Le Prestataire se réserve le droit de modifier les présentes CGV à tout moment. En cas de modification substantielle, le Client en sera informé par email avec un préavis de 30 jours calendaires. La poursuite de l'utilisation du Service après l'expiration du délai de préavis vaut acceptation des CGV modifiées.",
            ],
          },
          {
            title: "Article 4 — Description du service",
            content: [
              "CoY comprend : (i) la détection automatique des signaux d'insatisfaction dans les conversations SAV importées via Gorgias, Shopify et PrestaShop, (ii) le scoring churn 0–100 par client final, calculé automatiquement et ajusté par intelligence artificielle, (iii) la génération d'actions de récupération (emails, SMS) personnalisées par IA, et (iv) un tableau de bord ROI mesurant le chiffre d'affaires récupéré.",
              "Le Service est accessible via un navigateur web moderne (Chrome, Firefox, Edge, Safari — versions N-2 minimum). Aucune application mobile native n'est incluse.",
              "Les engagements de disponibilité, de support technique et de performance métier sont définis dans l'Annexe 1 — Niveaux de service (SLA), qui fait partie intégrante des présentes CGV.",
              "En cas d'atteinte de 90 % d'un quota mensuel, le Client est notifié par email. Au-delà de 100 %, aucune surfacturation automatique n'est appliquée : le Service est progressivement ralenti jusqu'à la prochaine Période d'abonnement.",
            ],
          },
          {
            title: "Article 5 — Plan, tarification et quotas",
            content: [
              "CoY : 899 EUR HT/mois (facturation mensuelle uniquement) + 490 EUR HT de forfait d'entrée (audit et session de lancement), rattaché à la conversion de l'essai en abonnement payant — 10 000 clients surveillés, 1 500 actions/mois, email + SMS (350/mois), 25 scénarios personnalisables, intégrations illimitées, les 7 leviers comportementaux, données conservées 12 mois glissants.",
              "Les prix sont exprimés en euros hors taxes. La TVA française (20 %) s'applique pour les clients établis en France métropolitaine. TVA intracommunautaire CoYia SAS : [TVA intracommunautaire].",
              "CoY est un palier unique, sans cycle annuel ni options de montée en gamme. Les prix peuvent être révisés une fois par an avec un préavis de 60 jours.",
            ],
          },
          {
            title: "Article 6 — Facturation et modalités de paiement",
            content: [
              "La facturation est mensuelle, par prélèvement automatique via Stripe Payments Europe Limited (Dublin, Irlande). CoYia SAS ne conserve et n'accède à aucune donnée de carte bancaire.",
              "Les factures sont générées au format PDF par Stripe Invoicing et sont accessibles depuis l'espace Client (section Facturation) en téléchargement libre.",
              "Conformément à l'ordonnance n°2021-1190 et au décret n°2022-1299, CoYia SAS s'engage à mettre en conformité sa facturation avec le format Factur-X (PDF/A-3 avec XML structuré, norme EN 16931) : capacité de réception au 1er septembre 2026, émission au 1er septembre 2027.",
              "En cas d'échec de paiement, le Prestataire adresse une relance par email. Après 7 jours calendaires sans régularisation, l'accès au Service peut être suspendu. Tout retard de paiement entraîne de plein droit des pénalités au taux BCE majoré de 10 points (art. L441-10 Code de commerce) et une indemnité forfaitaire de 40 EUR (art. D441-5 Code de commerce).",
            ],
          },
          {
            title: "Article 7 — Essai gratuit",
            content: [
              "Tout nouveau compte bénéficie d'un essai gratuit de 21 jours. Un moyen de paiement est requis dès l'inscription : le prélèvement de l'abonnement (899 EUR HT/mois) et du forfait d'entrée (490 EUR HT, sauf dérogation accordée par CoYia SAS) n'intervient qu'à l'issue de la période d'essai, sauf annulation préalable par le Client.",
              "Pendant la période d'essai, le Client accède aux fonctionnalités complètes du palier CoY, à l'exception du canal SMS, activé uniquement à la conversion en abonnement payant.",
              "Le Client peut annuler à tout moment avant la fin de la période d'essai depuis son espace Client — dans ce cas, aucun prélèvement n'est effectué. Passé ce délai, l'abonnement démarre automatiquement. Les données d'un compte annulé sont conservées 30 jours puis supprimées définitivement.",
            ],
          },
          {
            title: "Article 8 — Renouvellement automatique",
            content: [
              "Les abonnements sont renouvelés automatiquement à chaque échéance mensuelle.",
              "Le Client peut désactiver le renouvellement automatique depuis son espace Client à tout moment avant la date de renouvellement.",
            ],
          },
          {
            title: "Article 9 — Résiliation",
            content: [
              "L'abonnement CoY, facturé mensuellement, est résiliable à tout moment depuis l'espace Client, avec effet à la fin de la Période d'abonnement mensuelle en cours. Aucun remboursement au prorata du mois en cours n'est effectué.",
              "En cas de manquement grave du Client (non-paiement persistant après mise en demeure restée sans effet pendant 15 jours, violation des droits de propriété intellectuelle, spam), le Prestataire peut résilier avec un préavis de 15 jours notifié par email.",
              "À la date de résiliation : les Données Client sont exportables pendant 30 jours (CSV/JSON), puis supprimées définitivement. Les factures sont conservées 10 ans (art. L102 B Livre des procédures fiscales).",
            ],
          },
          {
            title: "Article 10 — Garantie ROI 60 jours",
            content: [
              "Le Prestataire garantit que CoY génère un chiffre d'affaires récupéré mesurable dans les 60 premiers jours suivant la conversion en abonnement payant, sous réserve que : (i) au moins une intégration helpdesk et une intégration e-commerce sont actives, (ii) au moins 10 actions de récupération ont été envoyées sur une fenêtre glissante de 30 jours, et (iii) le Client est en statut abonné actif (hors période d'essai).",
              "Si ces conditions sont réunies et qu'aucun CA récupéré n'est attribué à CoY, le Client bénéficie d'une extension gratuite d'un mois de son abonnement, renouvelable une fois (extension maximale de 2 mois, soit 1 798 EUR de valeur). Cette garantie est un mécanisme d'extension, non un remboursement : elle est octroyée sur demande motivée adressée à contact@coyia.fr dans les 15 jours suivant l'expiration du délai de 60 jours, après vérification des conditions par le Prestataire.",
              "La garantie ROI ne s'applique pas à la période d'essai gratuit, en cas de force majeure, en cas de résiliation pour non-respect des CGV, ni au-delà de deux extensions déjà accordées. Les résultats étant mesurés sur une fenêtre calendaire, une saisonnalité défavorable du secteur du Client peut affecter l'atteinte du seuil sans refléter une performance insuffisante du Service.",
            ],
          },
          {
            title: "Article 11 — Obligations du Prestataire",
            content: [
              "Le Prestataire s'engage à : (i) fournir le Service conforme à la description de l'article 4 et aux niveaux de service de l'Annexe SLA, (ii) assurer la sécurité et la confidentialité des Données Client conformément au DPA, (iii) notifier le Client dans les 72 heures suivant la découverte d'une violation de données à caractère personnel (art. 33 RGPD), (iv) ne traiter les Données Client qu'aux fins d'exécution du Service, (v) maintenir à jour la liste des sous-traitants ultérieurs et notifier le Client de tout changement avec un préavis de 30 jours (art. 28.2 RGPD).",
            ],
          },
          {
            title: "Article 12 — Obligations du Client",
            content: [
              "Le Client s'engage à : (i) fournir des informations exactes lors de l'inscription, (ii) utiliser le Service conformément à sa destination et aux présentes CGV, (iii) ne pas tenter de contourner les mesures de sécurité, (iv) ne pas envoyer de communications non sollicitées (spam), (v) maintenir la confidentialité de ses identifiants.",
              "Le Client est seul responsable des actions de récupération envoyées à ses clients finaux via CoY. En activant le canal SMS, le Client certifie que ses clients finaux ont consenti à recevoir des communications commerciales par ce canal, conformément à l'article L34-5 du CPCE.",
              "Le Client garantit disposer des bases légales nécessaires pour le traitement des données de ses propres clients finaux, conformément au RGPD.",
            ],
          },
          {
            title: "Article 13 — Données personnelles — Qualité des parties",
            content: [
              "Le Client agit en qualité de Responsable du traitement au sens du RGPD pour les données personnelles de ses propres clients finaux importées dans le Service.",
              "CoYia SAS agit en qualité de Sous-traitant au sens de l'article 28 du RGPD pour ces mêmes données, conformément au DPA signé entre les parties.",
              "Pour les données du compte Client (identité, facturation, utilisation), CoYia SAS agit en qualité de Responsable du traitement.",
            ],
          },
          {
            title: "Article 14 — Accord de traitement des données (DPA)",
            content: [
              "Un Accord de Traitement des Données (DPA) conforme à l'article 28 du RGPD est conclu lors de l'activation du compte, par signature électronique via Yousign SAS (prestataire de signature électronique qualifié, de droit français).",
              "La signature du DPA est une condition préalable obligatoire à l'accès aux fonctionnalités de traitement des données des clients finaux. Sans DPA signé, les modules de scoring, de génération et d'envoi d'actions sont désactivés.",
            ],
          },
          {
            title: "Article 15 — Intelligence artificielle (AI Act)",
            content: [
              "CoY utilise des modèles d'intelligence artificielle fournis par Mistral AI SAS (modèles mistral-large-latest et mistral-small-latest, via API). Ce système est classifié à risque limité au sens du Règlement (UE) 2024/1689 (AI Act).",
              "Conformément à l'article 50 de l'AI Act, tout message généré par IA inclut la mention : « Ce message a été personnalisé avec l'assistance d'un outil d'intelligence artificielle dans le cadre de notre démarche de qualité de service. »",
              "Tout client final peut exercer son droit d'opposition au profilage automatisé (art. 21 et 22 du RGPD) via le lien de désinscription inclus dans chaque communication, ou en contactant directement le Client e-commerçant.",
            ],
          },
          {
            title: "Article 16 — Propriété intellectuelle",
            content: [
              "Le Service, y compris l'ensemble des logiciels, algorithmes, interfaces, textes, graphismes, bases de données et documentation, est la propriété exclusive de CoYia SAS et est protégé par le droit de la propriété intellectuelle.",
              "L'abonnement confère au Client un droit d'utilisation personnel, non exclusif, non cessible et non transférable, limité à la durée de l'abonnement et à l'usage professionnel défini aux présentes CGV.",
            ],
          },
          {
            title: "Article 17 — Limitation de responsabilité",
            content: [
              "La responsabilité totale du Prestataire, toutes causes confondues, est limitée aux sommes effectivement payées par le Client au cours des 12 mois précédant le fait générateur.",
              "Le Prestataire ne saurait être tenu responsable des dommages indirects (perte de CA, perte de données, préjudice d'image, manque à gagner), ni des interruptions imputables au Client, à ses prestataires ou à un cas de force majeure, ni du contenu des messages de récupération envoyés aux clients finaux.",
              "Ces limitations ne s'appliquent pas en cas de dol, de faute lourde, ou de violation caractérisée des obligations en matière de protection des données personnelles imputable au Prestataire.",
            ],
          },
          {
            title: "Article 18 — Force majeure",
            content: [
              "Aucune des parties ne pourra être tenue responsable d'un manquement à ses obligations contractuelles résultant d'un cas de force majeure au sens de l'article 1218 du Code civil (catastrophe naturelle, épidémie, guerre, grève générale, panne de réseau, indisponibilité prolongée d'un sous-traitant critique).",
              "Si la force majeure perdure plus de 60 jours consécutifs, chaque partie pourra résilier le contrat de plein droit, sans indemnité, par notification écrite. Le Client bénéficiera d'un remboursement au prorata de la Période d'abonnement non consommée.",
            ],
          },
          {
            title: "Article 19 — Confidentialité",
            content: [
              "Chaque partie s'engage à traiter comme confidentielles toutes les informations non publiques communiquées par l'autre partie dans le cadre du contrat, et à ne pas les divulguer à des tiers sans autorisation préalable écrite, pendant la durée du contrat et 2 ans après sa cessation.",
              "Cette obligation ne s'applique pas aux informations devenues publiques sans faute de la partie réceptrice, déjà connues de la partie réceptrice, ou devant être divulguées en vertu d'une obligation légale ou d'une décision judiciaire.",
            ],
          },
          {
            title: "Article 20 — Droit applicable, médiation et juridiction compétente",
            content: [
              "Les présentes CGV sont soumises au droit français.",
              "En cas de litige, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours à compter de la notification du différend par lettre recommandée avec accusé de réception ou par email avec accusé de lecture.",
              "En l'absence de résolution amiable, les parties peuvent saisir le Centre de Médiation et d'Arbitrage de Paris (CMAP) — 39 avenue Franklin D. Roosevelt, 75008 Paris — www.cmap.fr.",
              "À défaut d'accord amiable ou de médiation aboutie, tout litige sera soumis à la compétence exclusive du Tribunal de commerce de [Ville], nonobstant pluralité de défendeurs ou appel en garantie. Le Client est invité à prendre connaissance de la présente clause attributive de juridiction, qui déroge aux règles de compétence territoriale de droit commun.",
            ],
          },
          {
            title: "Article 21 — Dispositions diverses",
            content: [
              "Intégralité : les présentes CGV, l'Annexe SLA, le DPA et la Politique de confidentialité constituent l'intégralité de l'accord entre les parties et remplacent tout accord antérieur relatif au même objet.",
              "Nullité partielle : si une clause est déclarée nulle ou inapplicable, cette nullité n'affecte pas la validité des autres clauses.",
              "Tolérance : le fait pour le Prestataire de ne pas exercer un droit prévu par les présentes CGV ne saurait constituer une renonciation à ce droit.",
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
