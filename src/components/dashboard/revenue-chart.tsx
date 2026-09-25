"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type MonthlyRevenue = {
  month: string;
  ca: number;
};

const RADAR_EMPTY = (
  <svg width="64" height="64" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.08 }}>
    <circle cx="36" cy="36" r="8"  fill="none" stroke="#2B2523" strokeWidth="1.5"/>
    <circle cx="36" cy="36" r="16" fill="none" stroke="#2B2523" strokeWidth="1"/>
    <circle cx="36" cy="36" r="24" fill="none" stroke="#2B2523" strokeWidth="0.8"/>
    <circle cx="36" cy="36" r="32" fill="none" stroke="#2B2523" strokeWidth="0.6"/>
    <line x1="36" y1="4"  x2="36" y2="68" stroke="#2B2523" strokeWidth="0.5"/>
    <line x1="4"  y1="36" x2="68" y2="36" stroke="#2B2523" strokeWidth="0.5"/>
    <path d="M36 36 L36 4 A32 32 0 0 1 68 36 Z" fill="rgba(43,37,35,0.1)"/>
    <circle cx="36" cy="36" r="3" fill="#2B2523"/>
  </svg>
);

function EuroTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#F5F0E8",
        border: "1px solid #E8DDD0",
        borderRadius: "0.5rem",
        padding: "0.5rem 0.75rem",
        fontSize: "0.78rem",
        boxShadow: "0 4px 12px rgba(43,37,35,0.08)",
      }}
    >
      <p style={{ color: "#7A6355", marginBottom: "0.15rem" }}>{label}</p>
      <p style={{ fontWeight: 700, color: "#D97757" }}>
        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(payload[0].value)}
      </p>
    </div>
  );
}

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const hasData = data.some((d) => d.ca > 0);
  const maxCa = Math.max(...data.map((d) => d.ca), 1);

  if (!hasData) {
    return (
      <div
        style={{
          height: 280,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          background: "#F5F0E8",
          borderRadius: "0.5rem",
          border: "1px dashed #E8DDD0",
        }}
      >
        {RADAR_EMPTY}
        <p style={{
          fontFamily: "var(--font-heading)",
          fontStyle: "italic",
          fontSize: "0.9rem",
          color: "#7A6355",
          textAlign: "center",
        }}>
          Votre courbe de performance se construira ici.
        </p>
        <p style={{ fontSize: "0.72rem", color: "#B8A898", textAlign: "center" }}>
          Les premières données apparaissent dès votre première conversion.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D97757" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#D97757" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#B8A898" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#B8A898" }}
          axisLine={false}
          tickLine={false}
          domain={[0, maxCa * 1.2]}
          tickFormatter={(v: number) =>
            v === 0 ? "0" : `${Math.round(v / 1000)}k`
          }
        />
        <Tooltip content={<EuroTooltip />} />
        <Area
          type="monotone"
          dataKey="ca"
          stroke="#D97757"
          strokeWidth={2.5}
          fill="url(#caGradient)"
          dot={{ r: 3, fill: "#D97757", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#D97757" }}
          isAnimationActive={true}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
