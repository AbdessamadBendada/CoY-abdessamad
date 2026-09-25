import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Créer votre compte — Centre d'aide CoY",
};

export default function CreerVotreComptePage() {
  return (
    <HelpArticleLayout
      category="Démarrage"
      title="Créer votre compte et démarrer l'essai gratuit"
      duration="3 min"
    >
      <p style={pStyle}>
        CoY propose un essai gratuit de 21 jours. Un moyen de paiement est
        demandé dès l&apos;inscription mais n&apos;est prélevé qu&apos;à la
        fin de l&apos;essai, sauf annulation de votre part. En quelques
        minutes, votre compte est créé et vous pouvez commencer à détecter
        les clients à risque dans votre boutique.
      </p>

      <h2 style={h2Style}>Étape 1 — Créer votre compte</h2>
      <p style={pStyle}>
        Rendez-vous sur <strong>winbackagent.fr/register</strong> et renseignez :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Votre nom et prénom",
          "L'adresse email professionnelle de votre boutique",
          "Un mot de passe sécurisé (minimum 8 caractères)",
          "Le nom de votre boutique e-commerce",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>
      <p style={pStyle}>
        Un email de confirmation vous sera envoyé immédiatement. Cliquez sur le
        lien pour activer votre compte.
      </p>

      <h2 style={h2Style}>Étape 2 — Votre secteur d&apos;activité</h2>
      <p style={pStyle}>
        Dès l&apos;inscription, CoY vous demande de sélectionner votre secteur
        d&apos;activité : Mode, Sport & Outdoor, Décoration, ou Autre. Ce choix
        permet à notre moteur IA de calibrer le scoring churn avec les
        benchmarks spécifiques à votre industrie.
      </p>

      <h2 style={h2Style}>Étape 3 — Signer le DPA RGPD</h2>
      <p style={pStyle}>
        Avant de connecter votre boutique, vous devez signer notre Accord de
        Traitement des Données (DPA). Cet accord est obligatoire en vertu du
        RGPD : il définit comment CoY traite les données de vos clients en
        votre nom. La signature électronique prend moins de 2 minutes.
      </p>

      <div style={calloutStyle}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "#B8882B",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "0.35rem",
          }}
        >
          Bon à savoir
        </p>
        <p
          style={{
            fontFamily: "var(--font-body)",
            color: "rgba(43,37,35,0.65)",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Pendant la période d&apos;essai, vous avez accès au dashboard, au
          scoring et à la détection sans restriction. La signature du DPA est
          nécessaire uniquement pour activer l&apos;envoi des emails et SMS de
          récupération.
        </p>
      </div>

      <h2 style={h2Style}>Étape 4 — Connecter votre première intégration</h2>
      <p style={pStyle}>
        Une fois votre compte créé, connectez votre boutique Shopify ou
        PrestaShop depuis la page <strong>Intégrations</strong> du dashboard.
        Le guide détaillé est disponible dans l&apos;article{" "}
        <a href="/help/connecter-votre-boutique" style={{ color: "#D97757" }}>
          Connecter votre boutique
        </a>
        .
      </p>

      <h2 style={h2Style}>Questions fréquentes</h2>
      <p style={pStyle}>
        <strong>Mon essai est-il automatiquement converti en abonnement payant ?</strong>
        <br />
        Oui, sauf annulation de votre part. À l&apos;issue des 21 jours,
        l&apos;abonnement démarre automatiquement avec le moyen de paiement
        renseigné à l&apos;inscription. Vous pouvez annuler à tout moment
        avant la fin de l&apos;essai depuis votre espace Client — dans ce
        cas, aucun prélèvement n&apos;est effectué.
      </p>
    </HelpArticleLayout>
  );
}
