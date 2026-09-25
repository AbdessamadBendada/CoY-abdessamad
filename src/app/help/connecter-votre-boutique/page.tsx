import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Connecter votre boutique — Centre d'aide CoY",
};

export default function ConnecterVotreBoutiquePage() {
  return (
    <HelpArticleLayout
      category="Démarrage"
      title="Connecter votre boutique Shopify ou PrestaShop"
      duration="5 min"
    >
      <p style={pStyle}>
        CoY s&apos;intègre directement à votre plateforme e-commerce
        pour analyser les commandes et conversations de vos clients. La
        connexion est sécurisée, non intrusive, et se configure en quelques
        clics.
      </p>

      <h2 style={h2Style}>Shopify — Connexion OAuth en 3 étapes</h2>
      <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Dans votre dashboard CoY, rendez-vous sur la page Intégrations et cliquez sur « Connecter Shopify ».",
          "Saisissez l'URL de votre boutique Shopify (ex : ma-boutique.myshopify.com), puis cliquez sur « Connecter ».",
          "Vous êtes redirigé vers Shopify pour autoriser l'accès. Acceptez les permissions demandées — CoY ne demande que les accès en lecture sur les commandes et les clients.",
        ].map((item, i) => (
          <li key={i} style={liStyle}>{item}</li>
        ))}
      </ol>
      <p style={pStyle}>
        La synchronisation initiale démarre immédiatement. Les premières données
        de scoring apparaissent dans votre dashboard sous 15 à 30 minutes selon
        la taille de votre catalogue.
      </p>

      <h2 style={h2Style}>PrestaShop — Module CoY</h2>
      <p style={pStyle}>
        Pour PrestaShop, CoY fonctionne via un module natif à installer sur
        votre back-office PrestaShop.
      </p>
      <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Dans CoY → Intégrations → PrestaShop, téléchargez le module CoY (.zip).",
          "Connectez-vous à votre back-office PrestaShop → Modules → Module Manager → Importer un module.",
          "Uploadez le fichier .zip téléchargé à l'étape précédente et cliquez sur Installer.",
          "Une fois installé, ouvrez la configuration du module et copiez la clé API fournie dans votre dashboard CoY.",
          "Collez la clé dans le champ « Clé API CoY » du module PrestaShop, puis cliquez sur Enregistrer.",
        ].map((item, i) => (
          <li key={i} style={liStyle}>{item}</li>
        ))}
      </ol>

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
          Compatibilité PrestaShop
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
          Le module CoY est compatible avec PrestaShop 1.7.x et 8.x.
          Si vous utilisez une version antérieure, contactez-nous à
          contact@coyia.fr.
        </p>
      </div>

      <h2 style={h2Style}>Vérifier que la connexion fonctionne</h2>
      <p style={pStyle}>
        Une fois la connexion établie, la page Intégrations affiche un indicateur
        vert « Connecté » avec la date de dernière synchronisation. Si
        l&apos;indicateur reste orange après 30 minutes, vérifiez :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Que l'URL Shopify est correcte (sans https://, sans www.)",
          "Que les permissions ont bien été accordées côté Shopify",
          "Que le module PrestaShop est bien activé (pas seulement installé)",
        ].map((item) => (
          <li key={item} style={liStyle}>{item}</li>
        ))}
      </ul>
      <p style={pStyle}>
        En cas de problème persistant, notre support répond sous 24h ouvrées à
        contact@coyia.fr.
      </p>
    </HelpArticleLayout>
  );
}
