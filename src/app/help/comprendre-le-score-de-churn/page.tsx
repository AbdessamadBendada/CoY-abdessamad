import { HelpArticleLayout, h2Style, pStyle, liStyle, calloutStyle } from "@/components/help/article-layout";

export const metadata = {
  title: "Comprendre le score de churn — Centre d'aide CoY",
};

export default function ComprendreLeScoreDeChurnPage() {
  return (
    <HelpArticleLayout
      category="Récupération clients"
      title="Comprendre le score de risque churn (0–100)"
      duration="4 min"
    >
      <p style={pStyle}>
        CoY attribue à chaque client un score de risque churn entre 0
        et 100. Plus le score est élevé, plus le client est susceptible de ne
        plus commander chez vous. Ce score guide les actions de récupération
        automatiques.
      </p>

      <h2 style={h2Style}>Comment est calculé le score ?</h2>
      <p style={pStyle}>
        Le score combine trois dimensions pondérées :
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
        {[
          "Score RFM (40%) — Récence, Fréquence et Montant des achats. Un client qui n'a pas commandé depuis 90 jours avec une fréquence habituelle de 30 jours obtient un score RFM élevé.",
          "Score support (30%) — Nombre et gravité des tickets de service client. Un ticket non résolu ou une conversation négative augmente significativement ce score.",
          "Score sectoriel (30%) — Benchmarks propres à votre secteur. Un client mode avec un panier inférieur à sa moyenne habituelle est plus à risque qu'un client sport avec le même écart.",
        ].map((item) => (
          <li key={item} style={{ ...liStyle, marginBottom: "0.75rem" }}>{item}</li>
        ))}
      </ul>

      <h2 style={h2Style}>Niveaux de risque</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {[
          { range: "0–30", label: "Faible", color: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", desc: "Client actif et satisfait. Pas d'action nécessaire." },
          { range: "31–60", label: "Modéré", color: "#E8B84B", bg: "rgba(232,184,75,0.06)", border: "rgba(232,184,75,0.25)", desc: "Signes d'essoufflement. CoY surveille en passif." },
          { range: "61–80", label: "Élevé", color: "#D97757", bg: "rgba(217,119,87,0.06)", border: "rgba(217,119,87,0.2)", desc: "Client à risque. Action de récupération déclenchée automatiquement si configuré." },
          { range: "81–100", label: "Critique", color: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", desc: "Risque de départ imminent. Alerte prioritaire + action urgente." },
        ].map((level) => (
          <div
            key={level.range}
            style={{
              background: level.bg,
              border: `1px solid ${level.border}`,
              borderRadius: "0.5rem",
              padding: "0.85rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
            }}
          >
            <div style={{ minWidth: 80 }}>
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: level.color, fontSize: "0.85rem" }}>
                {level.range}
              </span>
              <br />
              <span style={{ fontFamily: "var(--font-body)", color: level.color, fontSize: "0.72rem" }}>
                {level.label}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-body)", color: "rgba(43,37,35,0.65)", fontSize: "0.85rem", lineHeight: 1.55, margin: 0 }}>
              {level.desc}
            </p>
          </div>
        ))}
      </div>

      <h2 style={h2Style}>Configurer les seuils d&apos;alerte</h2>
      <p style={pStyle}>
        Par défaut, CoY déclenche une action automatique à partir d&apos;un
        score de 65. Vous pouvez ajuster ce seuil dans les paramètres de votre
        compte (page Paramètres → Scoring) selon votre tolérance au risque et
        votre budget d&apos;actions de récupération.
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
          Transparence IA (AI Act)
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
          Conformément à l&apos;AI Act européen, chaque score est accompagné
          d&apos;une explication des facteurs ayant contribué à son calcul.
          Vos clients peuvent exercer leur droit d&apos;opposition au scoring
          automatisé via la page de désinscription.
        </p>
      </div>
    </HelpArticleLayout>
  );
}
