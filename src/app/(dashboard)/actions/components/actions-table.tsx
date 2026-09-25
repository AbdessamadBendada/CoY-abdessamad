"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActionStatusBadge,
  ActionChannelBadge,
  type ActionStatus,
  type ActionChannel,
} from "./action-status-badge";
import { ActionReviewModal } from "./action-review-modal";

// ─── Type sérialisé ───────────────────────────────────────────────────────────

export type ActionRow = {
  id: string;
  type: "AUTOMATED" | "MANUAL" | "ESCALATION";
  status: ActionStatus;
  channel: ActionChannel;
  subject: string | null;
  content: string;
  promoCode: string | null;
  promoValue: number | null;
  promoType: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING" | null;
  churnScoreAtCreation: number | null;
  convertedValue: number | null;
  sentAt: string | null;
  convertedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  // Score de Persuasion V1 (depuis aiDecisionLog)
  psychologicalTrigger: string | null;
  persuasionScore: number | null;
};

// ─── Tri ──────────────────────────────────────────────────────────────────────

type SortKey = "date" | "status" | "score" | "revenue";

function sortActions(
  actions: ActionRow[],
  key: SortKey,
  asc: boolean
): ActionRow[] {
  return [...actions].sort((a, b) => {
    let va: number;
    let vb: number;
    switch (key) {
      case "date":
        va = new Date(a.sentAt ?? a.createdAt).getTime();
        vb = new Date(b.sentAt ?? b.createdAt).getTime();
        break;
      case "score":
        va = a.churnScoreAtCreation ?? -1;
        vb = b.churnScoreAtCreation ?? -1;
        break;
      case "revenue":
        va = a.convertedValue ?? 0;
        vb = b.convertedValue ?? 0;
        break;
      case "status":
        va = STATUS_ORDER[a.status] ?? 99;
        vb = STATUS_ORDER[b.status] ?? 99;
        break;
    }
    return asc ? va - vb : vb - va;
  });
}

const STATUS_ORDER: Partial<Record<ActionStatus, number>> = {
  CONVERTED: 0,
  CLICKED: 1,
  OPENED: 2,
  DELIVERED: 3,
  SENT: 4,
  SCHEDULED: 5,
  PENDING: 6,
  NEEDS_REVIEW: 7,
  FAILED: 8,
  CANCELLED: 9,
};

// ─── Formatage ────────────────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

const currencyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

function formatPromo(
  code: string | null,
  value: number | null,
  type: ActionRow["promoType"]
): string {
  if (!code) return "—";
  if (value == null) return code;
  if (type === "PERCENTAGE") return `${code} (−${value}%)`;
  if (type === "FIXED") return `${code} (−${currencyFmt.format(value)})`;
  return `${code} (livraison offerte)`;
}

// ─── Score de Persuasion ──────────────────────────────────────────────────────

function persuasionColor(score: number): string {
  if (score >= 80) return "#5C8A3A";
  if (score >= 60) return "#b45309";
  return "#EF4444";
}

// ─── Badge Levier IA ──────────────────────────────────────────────────────────

const TRIGGER_STYLES: Record<string, { bg: string; color: string }> = {
  "Loss Aversion": { bg: "rgba(249,115,22,0.12)",  color: "#C2410C" },
  "Urgence":       { bg: "rgba(239,68,68,0.12)",   color: "#DC2626" },
  "Réciprocité":   { bg: "rgba(232,184,75,0.12)",   color: "#C99A30" },
  "Social Proof":  { bg: "rgba(139,92,246,0.12)",  color: "#6D28D9" },
  "Ancrage Prix":  { bg: "rgba(232,184,75,0.10)",   color: "#C99A30" },
  "Rareté":        { bg: "rgba(245,158,11,0.12)",  color: "#B45309" },
};

function TriggerBadge({ trigger }: { trigger: string }) {
  const style = TRIGGER_STYLES[trigger] ?? { bg: "rgba(107,114,128,0.1)", color: "#6B7280" };
  return (
    <span
      style={{
        display: "inline-block",
        background: style.bg,
        color: style.color,
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "0.18rem 0.5rem",
        borderRadius: "9999px",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {trigger}
    </span>
  );
}

// ─── En-tête triable ──────────────────────────────────────────────────────────

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
      className={cn(
        "px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors",
        isActive && "text-foreground"
      )}
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
  actions: ActionRow[];
};

export function ActionsTable({ actions }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [localActions, setLocalActions] = useState(actions);
  const [reviewingAction, setReviewingAction] = useState<ActionRow | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function handleSent(actionId: string, sentAt: string) {
    setLocalActions((prev) =>
      prev.map((a) =>
        a.id === actionId ? { ...a, status: "SENT" as ActionStatus, sentAt } : a
      )
    );
  }

  async function handleRetry(e: React.MouseEvent, actionId: string) {
    e.stopPropagation();
    if (retryingIds.has(actionId)) return;
    setRetryingIds((prev) => new Set(prev).add(actionId));
    try {
      const res = await fetch(`/api/v1/actions/${actionId}/retry`, { method: "POST" });
      if (res.ok) {
        setLocalActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? { ...a, status: "SCHEDULED" as ActionStatus, failureReason: null }
              : a
          )
        );
      }
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }

  async function handleCancel(e: React.MouseEvent, actionId: string) {
    e.stopPropagation();
    if (cancellingIds.has(actionId)) return;
    setCancellingIds((prev) => new Set(prev).add(actionId));
    try {
      const res = await fetch(`/api/v1/actions/${actionId}/cancel`, { method: "POST" });
      if (res.ok) {
        setLocalActions((prev) =>
          prev.map((a) =>
            a.id === actionId
              ? { ...a, status: "CANCELLED" as ActionStatus }
              : a
          )
        );
      }
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }

  const sorted = sortActions(localActions, sortKey, sortAsc);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Aucune action ne correspond à ce filtre.
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Client
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Canal
              </th>
              <SortableHeader
                label="Statut"
                sortKey="status"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Sujet
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Levier IA
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                Promo
              </th>
              <SortableHeader
                label="Score"
                sortKey="score"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <SortableHeader
                label="CA récupéré"
                sortKey="revenue"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
              <SortableHeader
                label="Date"
                sortKey="date"
                current={sortKey}
                asc={sortAsc}
                onClick={handleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((action) => {
              const customerName = action.customer
                ? [action.customer.firstName, action.customer.lastName]
                    .filter(Boolean)
                    .join(" ") || action.customer.email
                : "—";

              const isReviewable =
                action.status === "PENDING" || action.status === "NEEDS_REVIEW";

              return (
                <tr
                  key={action.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    isReviewable && "cursor-pointer"
                  )}
                  onClick={isReviewable ? () => setReviewingAction(action) : undefined}
                  title={isReviewable ? "Cliquer pour réviser et envoyer" : undefined}
                >
                  {/* Client */}
                  <td className="px-3 py-3 max-w-[160px]">
                    <p className="font-medium truncate">{customerName}</p>
                    {action.customer && (
                      <p className="text-xs text-muted-foreground truncate">
                        {action.customer.email}
                      </p>
                    )}
                  </td>

                  {/* Canal */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <ActionChannelBadge channel={action.channel} />
                  </td>

                  {/* Statut */}
                  <td className="px-3 py-3">
                    <ActionStatusBadge status={action.status} />
                    {action.status === "FAILED" && action.failureReason && (
                      <p className="text-xs text-destructive mt-1 max-w-[140px] truncate">
                        {action.failureReason}
                      </p>
                    )}
                    {action.status === "FAILED" && (
                      <button
                        onClick={(e) => handleRetry(e, action.id)}
                        disabled={retryingIds.has(action.id)}
                        title="Relancer cette action"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          marginTop: "0.375rem",
                          fontSize: "0.72rem",
                          color: retryingIds.has(action.id) ? "#B8A898" : "#D97757",
                          background: "none",
                          border: "none",
                          cursor: retryingIds.has(action.id) ? "wait" : "pointer",
                          padding: 0,
                        }}
                      >
                        <RefreshCw
                          size={11}
                          style={{
                            animation: retryingIds.has(action.id)
                              ? "spin 1s linear infinite"
                              : undefined,
                          }}
                        />
                        Réessayer
                      </button>
                    )}
                    {(action.status === "PENDING" ||
                      action.status === "SCHEDULED" ||
                      action.status === "NEEDS_REVIEW") && (
                      <button
                        onClick={(e) => handleCancel(e, action.id)}
                        disabled={cancellingIds.has(action.id)}
                        title="Annuler cette action"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          marginTop: "0.375rem",
                          fontSize: "0.72rem",
                          color: cancellingIds.has(action.id) ? "#B8A898" : "#B8A898",
                          background: "none",
                          border: "none",
                          cursor: cancellingIds.has(action.id) ? "wait" : "pointer",
                          padding: 0,
                          opacity: cancellingIds.has(action.id) ? 0.5 : 0.7,
                        }}
                      >
                        <X size={11} />
                        Annuler
                      </button>
                    )}
                  </td>

                  {/* Sujet */}
                  <td className="px-3 py-3 max-w-[180px]">
                    <p className="truncate text-muted-foreground">
                      {action.subject ?? "—"}
                    </p>
                  </td>

                  {/* Levier IA + Score de Persuasion */}
                  <td className="px-3 py-3">
                    {action.psychologicalTrigger ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
                        <TriggerBadge trigger={action.psychologicalTrigger} />
                        {action.persuasionScore != null && (
                          <p className="text-xs font-semibold tabular-nums" style={{ color: persuasionColor(action.persuasionScore) }}>
                            {action.persuasionScore}/100
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Promo */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {formatPromo(
                      action.promoCode,
                      action.promoValue,
                      action.promoType
                    )}
                  </td>

                  {/* Score churn */}
                  <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">
                    {action.churnScoreAtCreation ?? "—"}
                  </td>

                  {/* CA récupéré */}
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    {action.convertedValue != null && action.convertedValue > 0 ? (
                      <span className="font-medium" style={{ color: "#5C8A3A" }}>
                        {currencyFmt.format(action.convertedValue)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {formatDate(action.sentAt ?? action.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    {reviewingAction && (
      <ActionReviewModal
        action={reviewingAction}
        onClose={() => setReviewingAction(null)}
        onSent={handleSent}
      />
    )}
    </>
  );
}
