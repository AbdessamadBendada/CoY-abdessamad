"use client";

import { useRouter, usePathname } from "next/navigation";

type RiskFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const RISK_FILTERS: { value: RiskFilter; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "CRITICAL", label: "Critique" },
  { value: "HIGH", label: "Très haut" },
  { value: "MEDIUM", label: "Modéré" },
  { value: "LOW", label: "Faible" },
];

type Props = {
  currentRisk: RiskFilter;
  countByRisk: Partial<Record<RiskFilter, number>>;
  total: number;
};

export function CustomersFilters({ currentRisk, countByRisk, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function setFilter(risk: RiskFilter) {
    const params = new URLSearchParams();
    if (risk !== "ALL") params.set("risk", risk);
    const qs = params.size > 0 ? `?${params.toString()}` : "";
    router.push(`${pathname}${qs}`);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", alignItems: "center" }}>
      {RISK_FILTERS.map(({ value, label }) => {
        const count = value === "ALL" ? total : (countByRisk[value] ?? 0);
        const isActive = currentRisk === value;

        return (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.75rem",
              borderRadius: 9999,
              fontSize: "0.78rem",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              border: isActive ? "none" : "1px solid #E8DDD0",
              background: isActive ? "#D97757" : "#F5F0E8",
              color: isActive ? "#F5F0E8" : "#7A6355",
              transition: "background 0.15s, color 0.15s, border-color 0.15s",
            }}
          >
            {label}
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                lineHeight: "1.25rem",
                padding: "0 0.375rem",
                borderRadius: 9999,
                background: isActive ? "rgba(245,240,232,0.25)" : "rgba(184,168,152,0.2)",
                color: isActive ? "#F5F0E8" : "#B8A898",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
