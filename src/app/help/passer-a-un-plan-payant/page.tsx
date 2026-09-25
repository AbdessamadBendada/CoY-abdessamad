import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Votre abonnement CoY — Centre d'aide CoY",
};

export default function PasserAUnPlanPayantPage() {
  return (
    <HelpArticleLayout
      category="Compte & Facturation"
      title="Comment fonctionne votre abonnement CoY"
      duration="3 min"
    >
      <p style={pStyle}>
        Un moyen de paiement est renseigné dès l&apos;inscription. Votre essai
        gratuit dure 21 jours ; à l&apos;issue de ce délai, l&apos;abonnement
        CoY démarre automatiquement, sauf annulation préalable de votre part.
      </p>

      <h2 style={h2Style}>Le palier CoY</h2>
      <p style={pStyle}>
        CoY est un palier unique à 899€ HT/mois, facturé mensuellement.
        Il inclut 10 000 clients surveillés, 1 500 actions/mois, email + SMS
        (350/mois, activés à la conversion), 25 scénarios personnalisables,
        des intégrations illimitées et les 7 leviers comportementaux.
      </p>

      <h2 style={h2Style}>Le forfait d&apos;entrée</h2>
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
          490€ HT, une seule fois
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
          Un forfait d&apos;entrée de 490€ HT (audit et session de lancement)
          est facturé au moment de la conversion de l&apos;essai en
          abonnement payant — pas à l&apos;inscription. Certains comptes
          bénéficient d&apos;une dérogation accordée par CoYia SAS ; dans ce
          cas, le forfait n&apos;est pas facturé.
        </p>
      </div>

      <h2 style={h2Style}>Ce qui se passe à la fin de l&apos;essai</h2>
      <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Si vous ne faites rien, l'abonnement démarre automatiquement le 21e jour, avec le moyen de paiement renseigné à l'inscription.",
          "Vous pouvez annuler à tout moment avant la fin de l'essai depuis Facturation → Gérer mon abonnement — aucun prélèvement n'est alors effectué.",
          "Passé ce délai, le forfait d'entrée (sauf dérogation) et le premier mois d'abonnement sont facturés.",
        ].map((item, i) => (
          <li key={i} style={liStyle}>{item}</li>
        ))}
      </ol>

      <h2 style={h2Style}>Annuler votre abonnement</h2>
      <p style={pStyle}>
        Vous pouvez résilier à tout moment depuis <strong>Facturation → Gérer
        mon abonnement</strong>. La résiliation prend effet à la fin de la
        période mensuelle en cours — vous conservez l&apos;accès jusqu&apos;au
        dernier jour payé. Aucun remboursement au prorata du mois en cours
        n&apos;est effectué.
      </p>
    </HelpArticleLayout>
  );
}
