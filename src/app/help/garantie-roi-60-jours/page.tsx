import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Garantie ROI 60 jours — Centre d'aide CoY",
};

export default function GarantieRoi60JoursPage() {
  return (
    <HelpArticleLayout
      category="Compte & Facturation"
      title="Comprendre et activer la garantie ROI 60 jours"
      duration="3 min"
    >
      <p style={pStyle}>
        CoY offre une garantie ROI de 60 jours : si votre compte remplit les
        conditions ci-dessous mais que le CA récupéré n&apos;atteint pas le
        coût de votre abonnement, vous bénéficiez d&apos;une extension gratuite
        de votre abonnement — pas d&apos;un remboursement.
      </p>

      <h2 style={h2Style}>Conditions de la garantie</h2>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Une intégration helpdesk (Gorgias ou Crisp) et une intégration e-commerce (Shopify, PrestaShop ou WooCommerce) actives.",
          "Au moins 10 actions de récupération envoyées sur une fenêtre glissante de 30 jours.",
          "Votre compte est en statut abonné actif (hors période d'essai).",
          "Vous n'avez pas déjà atteint le plafond de 2 extensions accordées.",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>

      <h2 style={h2Style}>Comment est mesuré le ROI ?</h2>
      <p style={pStyle}>
        Le CA récupéré est calculé comme la somme des commandes effectuées par
        des clients dans les 30 jours suivant une action de récupération marquée
        « Convertie » dans votre dashboard, comparé aux 899€ HT/mois de
        l&apos;abonnement. Ce calcul est transparent et visible à tout moment
        dans votre page Facturation, section « Garantie ROI ».
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
          Ce que couvre la garantie
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
          Si le CA sauvé sur 30 jours glissants reste sous 899€ HT alors que
          les conditions ci-dessus sont remplies, vous pouvez demander une
          extension gratuite d&apos;un mois d&apos;abonnement, renouvelable une
          fois — soit 2 mois offerts maximum, une valeur de 1 798€. Au-delà,
          la garantie ne s&apos;applique plus sur ce compte.
        </p>
      </div>

      <h2 style={h2Style}>Demander l&apos;extension</h2>
      <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Vérifiez votre éligibilité dans Facturation → Plan actuel → Garantie ROI.",
          "Envoyez une demande motivée à contact@coyia.fr dans les 15 jours suivant l'expiration du délai de 60 jours.",
          "Notre équipe vérifie les conditions sur votre compte et vous répond sous 5 jours ouvrés.",
          "Si la demande est validée, l'extension est appliquée manuellement sur votre prochaine échéance de facturation.",
        ].map((item, i) => (
          <li key={i} style={liStyle}>{item}</li>
        ))}
      </ol>

      <p style={pStyle}>
        La garantie ne s&apos;applique pas pendant la période d&apos;essai, en
        cas de force majeure, ni en cas de résiliation pour non-respect des
        CGV. Elle est octroyée manuellement sur demande, pas automatiquement
        — voir l&apos;
        <a href="/cgv" style={{ color: "#D97757" }}>Article 10 des CGV</a>{" "}
        pour le détail complet.
      </p>
    </HelpArticleLayout>
  );
}
