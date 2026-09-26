import Link from "next/link";
import { AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

const INSIGHTS = [
  {
    icon: AlertTriangle,
    iconColor: "#C99A30",
    title: "Baisse de fréquence détectée",
    description: "Plusieurs clients n'ont pas commandé depuis +45 jours.",
    href: "/customers",
    cta: "Voir les profils →",
  },
  {
    icon: TrendingUp,
    iconColor: "#D97757",
    title: "Scénario recommandé",
    description: "Clients à risque élevé encore récupérables.",
    href: "/actions",
    cta: "Voir les actions →",
  },
  {
    icon: BarChart3,
    iconColor: "#D97757",
    title: "Taux de récupération en hausse",
    description: "Taux d'ouverture supérieur à la moyenne cette semaine.",
    href: "/actions",
    cta: "Voir le détail →",
  },
];

export function InsightsIA() {
  return (
    <div
      className="surface-card"
      style={{
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "#2B2523",
          padding: "0.5rem 0.875rem 0.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Insights IA
      </p>
      {INSIGHTS.map((insight, i) => {
        const Icon = insight.icon;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.5rem 0.875rem",
              borderTop: i > 0 ? "1px solid #F5F0E8" : undefined,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "0.35rem",
                background: "rgba(184,168,152,0.15)",
                border: "1px solid rgba(184,168,152,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon style={{ width: 11, height: 11, color: insight.iconColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#2B2523",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {insight.title}
              </p>
              <p
                style={{
                  fontSize: "0.68rem",
                  color: "#9CA3AF",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {insight.description}
              </p>
            </div>
            <Link
              href={insight.href}
              style={{
                fontSize: "0.68rem",
                color: "#D97757",
                fontWeight: 600,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {insight.cta}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
