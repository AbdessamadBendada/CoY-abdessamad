export type ChurnRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const RISK_CONFIG: Record<ChurnRisk, { label: string; bg: string; color: string }> = {
  CRITICAL: {
    label: "Critique",
    bg: "rgba(192,68,42,0.08)",
    color: "#C0442A",
  },
  HIGH: {
    label: "Très haut",
    bg: "rgba(232,184,75,0.12)",
    color: "#C99A30",
  },
  MEDIUM: {
    label: "Modéré",
    bg: "rgba(122,99,85,0.08)",
    color: "#7A6355",
  },
  LOW: {
    label: "Faible",
    bg: "rgba(184,168,152,0.12)",
    color: "#B8A898",
  },
};

export function CustomerRiskBadge({
  risk,
  score,
}: {
  risk: ChurnRisk;
  score?: number | null;
}) {
  const config = RISK_CONFIG[risk];
  return (
    <span
      style={{ background: config.bg, color: config.color }}
      className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
    >
      {score != null ? `${score} — ` : ""}
      {config.label}
    </span>
  );
}

export { RISK_CONFIG };
