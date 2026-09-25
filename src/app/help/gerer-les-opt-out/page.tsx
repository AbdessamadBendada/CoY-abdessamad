import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Gérer les opt-out RGPD — Centre d'aide CoY",
};

export default function GererLesOptOutPage() {
  return (
    <HelpArticleLayout
      category="Configuration & IA"
      title="Gérer les opt-out et vos obligations RGPD"
      duration="3 min"
    >
      <p style={pStyle}>
        Chaque message envoyé par CoY inclut un lien de désinscription
        conforme au RGPD. Vos clients peuvent à tout moment refuser de recevoir
        des communications de récupération, et CoY gère automatiquement ces
        désinscriptions.
      </p>

      <h2 style={h2Style}>Comment fonctionne la désinscription</h2>
      <p style={pStyle}>
        Chaque email et SMS de récupération contient un lien unique de
        désinscription (opt-out). Lorsqu&apos;un client clique sur ce lien :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Il est redirigé vers une page de confirmation sécurisée sur votre domaine CoY.",
          "Son consentement est révoqué dans votre base de données en moins de 72h (conforme RGPD).",
          "CoY ne lui enverra plus aucune communication de récupération automatique.",
          "Son profil reste visible dans votre dashboard avec le statut « Opt-out ».",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>

      <h2 style={h2Style}>Exercice du droit d&apos;opposition au scoring</h2>
      <p style={pStyle}>
        Conformément à l&apos;AI Act et au RGPD, vos clients ont le droit de
        s&apos;opposer au scoring automatisé de leur risque churn. Ce droit est
        accessible depuis la page de désinscription. Si un client l&apos;exerce,
        CoY :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Supprime son score de churn et ses données de scoring.",
          "Arrête immédiatement tout traitement automatisé le concernant.",
          "Conserve uniquement les données de transaction (gérées par votre boutique e-commerce).",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>

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
          Délai de traitement RGPD
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
          Le RGPD impose un traitement des demandes d&apos;opt-out en moins d&apos;un
          mois. CoY traite ces demandes en moins de 72h et vous envoie une
          confirmation par email. Aucune action manuelle de votre part n&apos;est
          nécessaire.
        </p>
      </div>

      <h2 style={h2Style}>Gérer manuellement les opt-out</h2>
      <p style={pStyle}>
        Dans la page <strong>Clients → Filtres → Statut : Opt-out</strong>, vous
        pouvez visualiser tous les clients désinscris. Si un client vous contacte
        directement pour demander sa suppression, utilisez le bouton « Supprimer
        les données » sur sa fiche pour traiter sa demande d&apos;effacement (droit
        à l&apos;oubli RGPD).
      </p>
    </HelpArticleLayout>
  );
}
