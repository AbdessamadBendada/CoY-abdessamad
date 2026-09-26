import { prisma } from "@/shared/db/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RevenueChart, type MonthlyRevenue } from "@/components/dashboard/revenue-chart";

interface RevenueChartSectionProps {
  tenantId: string;
}

export async function RevenueChartSection({ tenantId }: RevenueChartSectionProps) {
  const now = new Date();

  const revenueByMonth: MonthlyRevenue[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: format(d, "MMM", { locale: fr }), ca: 0 };
  });

  try {
    const revenueActions = await prisma.winbackAction.findMany({
      where: {
        tenantId,
        status: "CONVERTED",
        convertedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
      select: { convertedAt: true, convertedValue: true },
    });

    revenueActions.forEach((a) => {
      if (!a.convertedAt) return;
      const label = format(new Date(a.convertedAt), "MMM", { locale: fr });
      const slot = revenueByMonth.find((m) => m.month === label);
      if (slot) slot.ca += parseFloat((a.convertedValue ?? 0).toString());
    });
  } catch (err) {
    console.error("[RevenueChartSection] DB error — graphique vide affiché", err);
  }

  return (
    <div
      className="surface-card"
      style={{
        borderRadius: "1rem",
        padding: "1.2rem",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "0.75rem" }}>
      <p className="panel-title">Performance de récupération</p>
      <p style={{ fontSize: "0.7rem", color: "#9b9099", marginTop: "0.2rem" }}>
        Chiffre d&apos;affaires attribué aux actions CoY · 6 derniers mois
      </p>
      </div>
      <RevenueChart data={revenueByMonth} />
    </div>
  );
}
