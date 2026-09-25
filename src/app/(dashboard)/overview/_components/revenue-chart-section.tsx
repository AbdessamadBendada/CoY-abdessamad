import { prisma } from "@/lib/prisma";
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
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8DDD0",
        borderRadius: "0.75rem",
        padding: "1rem",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#2B2523",
          marginBottom: "0.75rem",
        }}
      >
        Évolution du CA sauvé — 6 derniers mois
      </p>
      <RevenueChart data={revenueByMonth} />
    </div>
  );
}
