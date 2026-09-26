"use client";

import { useState, useMemo } from "react";
import type React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { CustomerRiskBadge, type ChurnRisk } from "./customer-risk-badge";
import { CustomersFilterEmpty } from "./customers-empty-state";

// ─── Type sérialisé (sans Decimal ni Date) ───────────────────────────────────

export type CustomerRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  churnScore: number | null;
  churnRisk: ChurnRisk | null;
  lastScoredAt: string | null;
  ltv: number;
  totalOrders: number;
  lastOrderAt: string | null;
  cooldownUntil: string | null;
  lastActionAt: string | null;
  recoveredAt: string | null;
  actionsCount: number;
};

// ─── Tri ──────────────────────────────────────────────────────────────────────

type SortKey = "score" | "ltv" | "orders" | "lastOrder";

function sortCustomers(
  customers: CustomerRow[],
  key: SortKey,
  asc: boolean
): CustomerRow[] {
  return [...customers].sort((a, b) => {
    let va: number;
    let vb: number;
    switch (key) {
      case "score":
        va = a.churnScore ?? -1;
        vb = b.churnScore ?? -1;
        break;
      case "ltv":
        va = a.ltv;
        vb = b.ltv;
        break;
      case "orders":
        va = a.totalOrders;
        vb = b.totalOrders;
        break;
      case "lastOrder":
        va = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        vb = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        break;
    }
    return asc ? va - vb : vb - va;
  });
}

// ─── Formatage ────────────────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });
const currencyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

function customerStatus(row: CustomerRow): { label: string; className: string; style?: React.CSSProperties } {
  const now = Date.now();
  if (row.recoveredAt) {
    return { label: "Récupéré", className: "", style: { color: "#5C8A3A" } };
  }
  if (row.cooldownUntil && new Date(row.cooldownUntil).getTime() > now) {
    return { label: "En cooldown", className: "", style: { color: "#64748B" } };
  }
  return { label: "—", className: "text-muted-foreground", style: undefined };
}

// ─── En-tête de colonne triable ───────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  current,
  asc,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <th
      className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-colors"
      style={{ color: isActive ? "#2B2523" : "#7A6355" }}
      onClick={() => onClick(sortKey)}
    >
      {label}{" "}
      <span className="inline-block w-3 text-center">
        {isActive ? (asc ? "↑" : "↓") : "⇅"}
      </span>
    </th>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

type Props = {
  customers: CustomerRow[];
};

export function CustomerTable({ customers }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = useMemo(
    () => sortCustomers(customers, sortKey, sortAsc),
    [customers, sortKey, sortAsc]
  );

  if (sorted.length === 0) {
    return (
      <CustomersFilterEmpty onReset={() => router.push(pathname)} />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ borderBottom: "1px solid #E8DDD0" }}>
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#7A6355" }}>
                Client
              </th>
              <SortableHeader
                label="Risque"
                sortKey="score"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <SortableHeader
                label="LTV"
                sortKey="ltv"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <SortableHeader
                label="Commandes"
                sortKey="orders"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <SortableHeader
                label="Dernière commande"
                sortKey="lastOrder"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#7A6355" }}>
                Statut
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#7A6355" }}>
                Actions envoyées
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((customer, idx) => {
              const name =
                [customer.firstName, customer.lastName]
                  .filter(Boolean)
                  .join(" ") || "—";
              const status = customerStatus(customer);

              return (
                <tr
                  key={customer.id}
                  className="sv-table-row cursor-pointer"
                  style={{
                    animationDelay: `${idx * 40}ms`,
                    height: "56px",
                    borderBottom: "1px solid #E8DDD0",
                  }}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  {/* Client */}
                  <td className="px-3 py-3 max-w-[180px]">
                    <p className="font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.email}
                    </p>
                  </td>

                  {/* Score churn */}
                  <td className="px-3 py-3">
                    {customer.churnRisk ? (
                      <CustomerRiskBadge
                        risk={customer.churnRisk}
                        score={customer.churnScore}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Non scoré
                      </span>
                    )}
                  </td>

                  {/* LTV */}
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    {customer.ltv > 0
                      ? currencyFmt.format(customer.ltv)
                      : <span className="text-muted-foreground">—</span>}
                  </td>

                  {/* Commandes */}
                  <td className="px-3 py-3 text-center tabular-nums">
                    {customer.totalOrders}
                  </td>

                  {/* Dernière commande */}
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(customer.lastOrderAt)}
                  </td>

                  {/* Statut */}
                  <td className={cn("px-3 py-3 text-xs font-medium", status.className)} style={status.style}>
                    {status.label}
                  </td>

                  {/* Actions winback */}
                  <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">
                    {customer.actionsCount > 0 ? customer.actionsCount : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
