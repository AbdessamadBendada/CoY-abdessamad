import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Personnaliser vos messages — Centre d'aide CoY",
};

export default function PersonnaliserVosMessagesPage() {
  return (
    <HelpArticleLayout
      category="Configuration & IA"
      title="Personnaliser les emails et SMS de récupération"
      duration="4 min"
    >
      <p style={pStyle}>
        CoY génère automatiquement des emails et SMS personnalisés pour chaque
        client en s&apos;appuyant sur son historique, son secteur, et les sciences
        comportementales. Vous pouvez ajuster le ton, ajouter votre signature, et
        définir des règles de compensation.
      </p>

      <h2 style={h2Style}>Personnaliser le ton et la signature</h2>
      <p style={pStyle}>
        Dans <strong>Paramètres → Messages</strong>, configurez :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Nom de l'expéditeur (ex : « L'équipe Maison Lumière » ou « Sophie de Maison Lumière »)",
          "Email d'expéditeur (votre domaine est recommandé pour la délivrabilité)",
          "Ton des messages : formel, chaleureux, ou spontané",
          "Signature personnalisée en bas de chaque email",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>

      <h2 style={h2Style}>Modifier un message généré</h2>
      <p style={pStyle}>
        Avant l&apos;envoi de chaque message (si vous n&apos;êtes pas en mode 100%
        automatique), CoY vous montre une prévisualisation. Vous pouvez
        modifier librement le texte en cliquant sur « Éditer ». Les modifications
        s&apos;appliquent uniquement à l&apos;envoi en cours — le template de base
        n&apos;est pas modifié.
      </p>

      <h2 style={h2Style}>Configurer les compensations</h2>
      <p style={pStyle}>
        CoY peut inclure automatiquement une offre de compensation dans les
        messages pour les clients avec un score critique (≥ 80) ou qui ont eu
        une expérience négative documentée. Dans <strong>Paramètres → Compensations</strong>, définissez :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Type de compensation : code promo, livraison offerte, remise fixe",
          "Valeur maximale selon le niveau de risque (ex : 10% pour score 65-80, 15% pour score 80+)",
          "Durée de validité du code promo (recommandé : 7 jours pour créer l'urgence)",
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
          Mention IA obligatoire (AI Act)
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
          Conformément à l&apos;AI Act européen, tous les messages générés par CoY
          incluent automatiquement la mention : « Message personnalisé avec
          l&apos;assistance de notre IA. » Cette mention est obligatoire et ne peut pas
          être supprimée.
        </p>
      </div>

      <h2 style={h2Style}>Les 7 leviers comportementaux</h2>
      <p style={pStyle}>
        Votre abonnement CoY inclut les 7 leviers comportementaux, sans restriction :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Loss Aversion (« Ne laissez pas partir vos économies ») et Réciprocité",
          "Urgence temporelle, Social Proof, Ancrage prix",
          "Rareté, Personnalisation avancée du ton selon le profil client",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>
    </HelpArticleLayout>
  );
}
