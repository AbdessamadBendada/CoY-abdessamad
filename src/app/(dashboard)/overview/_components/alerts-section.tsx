import { prisma } from "@/shared/db/prisma";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface AlertsSectionProps {
  tenantId: string;
}

export async function AlertsSection({ tenantId }: AlertsSectionProps) {
  let topRiskCustomers: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    churnScore: number | null;
    churnRisk: string | null;
  }[] = [];

  try {
    topRiskCustomers = await prisma.customer.findMany({
      where: { tenantId, churnRisk: { in: ["HIGH", "CRITICAL"] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        churnScore: true,
        churnRisk: true,
      },
      orderBy: { churnScore: "desc" },
      take: 5,
    });
  } catch (err) {
    console.error("[AlertsSection] DB error — liste vide affichée", err);
  }

  return (
    <div
      className="surface-card"
      style={{
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    >
      <p
        className="panel-title"
        style={{
          padding: "1rem 1rem 0",
          marginBottom: "0.5rem",
        }}
      >
        À surveiller
      </p>
      {topRiskCustomers.length === 0 ? (
        <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "0.5rem",
              background: "rgba(232,184,75,0.10)",
              border: "1px solid rgba(232,184,75,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
            }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: "#E8B84B" }} />
          </div>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#2B2523" }}>
            Aucune alerte active
          </p>
          <p style={{ fontSize: "0.73rem", color: "#6B7280", marginTop: "0.25rem" }}>
            Vos clients sont en bonne santé.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {topRiskCustomers.map((c, i) => {
            const name =
              [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
            const isCritical = c.churnRisk === "CRITICAL";
            const scoreColor = isCritical ? "#C0442A" : "#C99A30";
            const scoreBg = isCritical
              ? "rgba(192,68,42,0.08)"
              : "rgba(232,184,75,0.12)";
            return (
              <li
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderBottom:
                    i < topRiskCustomers.length - 1 ? "1px solid #F3F4F6" : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#2B2523",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {name}
                  </p>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "#9CA3AF",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.email}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      background: scoreBg,
                      color: scoreColor,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.45rem",
                      borderRadius: "9999px",
                    }}
                  >
                    {c.churnScore ?? "—"}
                  </span>
                  <Link
                    href="/customers"
                    style={{
                      fontSize: "0.72rem",
                      color: "#D97757",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Voir →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
