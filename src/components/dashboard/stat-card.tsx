interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "teal" | "coral" | "amber" | "default";
}

const ACCENT_STYLES = {
  teal:    { color: "#E8B84B" },
  coral:   { color: "#E85D4A" },
  amber:   { color: "#E8B84B" },
  default: { color: "#7A6355" },
};

export function StatCard({ label, value, sub, accent = "default" }: StatCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E8DDD0",
        borderRadius: "0.75rem",
        padding: "1.1rem 1.25rem",
        boxShadow: "0 1px 3px rgba(43,37,35,0.08)",
      }}
    >
      <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9CA3AF", marginBottom: "0.5rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "0.73rem", color: "#9CA3AF", marginTop: "0.35rem" }}>{sub}</p>
      )}
    </div>
  );
}
