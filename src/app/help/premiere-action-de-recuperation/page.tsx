import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Première action de récupération — Centre d'aide CoY",
};

export default function PremiereActionDeRecuperationPage() {
  return (
    <HelpArticleLayout
      category="Récupération clients"
      title="Déclencher votre première action de récupération"
      duration="5 min"
    >
      <p style={pStyle}>
        Une fois votre boutique connectée et le DPA signé, CoY peut
        automatiquement déclencher des actions de récupération pour vos clients
        à risque. Voici comment configurer et lancer votre première campagne.
      </p>

      <h2 style={h2Style}>Prérequis avant de démarrer</h2>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Boutique Shopify ou PrestaShop connectée ✓",
          "DPA RGPD signé ✓",
          "Au moins un client avec un score de risque ≥ 65 dans votre dashboard",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>

      <h2 style={h2Style}>Étape 1 — Identifier vos premiers clients à risque</h2>
      <p style={pStyle}>
        Rendez-vous sur la page <strong>Clients</strong> de votre dashboard.
        Filtrez par « Score de risque : Élevé ou Critique » pour visualiser les
        clients qui ont le plus besoin d&apos;une action. Cliquez sur un client
        pour voir le détail de son score et les facteurs qui l&apos;ont influencé.
      </p>

      <h2 style={h2Style}>Étape 2 — Choisir le type d&apos;action</h2>
      <p style={pStyle}>
        CoY propose plusieurs types d&apos;actions selon votre plan :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Email de récupération personnalisé (tous les plans)",
          "SMS de récupération (350 SMS/mois inclus, activés à la conversion de l'essai)",
          "Compensation commerciale : code promo, remise, livraison offerte",
          "Escalade humaine : notification interne à votre équipe support",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>

      <h2 style={h2Style}>Étape 3 — Configurer l&apos;envoi automatique</h2>
      <p style={pStyle}>
        Dans <strong>Paramètres → Actions de récupération</strong>, activez
        l&apos;envoi automatique pour les clients dont le score dépasse votre
        seuil configuré. Choisissez le délai entre la détection et
        l&apos;envoi : immédiat, 2h, ou 24h selon votre stratégie.
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
          Conseil de démarrage
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
          Pour votre première semaine, nous recommandons de démarrer avec
          l&apos;envoi manuel : sélectionnez 5 à 10 clients à risque, prévisualisez
          les messages générés par CoY, ajustez si nécessaire, puis envoyez.
          Cela vous permet de valider la qualité des messages avant de passer
          en mode automatique.
        </p>
      </div>

      <h2 style={h2Style}>Étape 4 — Suivre les résultats</h2>
      <p style={pStyle}>
        Chaque action envoyée est trackée dans la page <strong>Actions</strong>.
        Vous verrez en temps réel : taux d&apos;ouverture, taux de clic, et
        surtout le statut <em>Converti</em> quand le client passe une nouvelle
        commande dans les 30 jours suivant l&apos;action.
      </p>
      <p style={pStyle}>
        Le CA récupéré est automatiquement reporté dans votre dashboard ROI,
        permettant de mesurer précisément la rentabilité de chaque action.
      </p>
    </HelpArticleLayout>
  );
}
