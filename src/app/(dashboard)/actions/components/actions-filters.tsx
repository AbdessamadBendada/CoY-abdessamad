"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/cn";

// ─── Filtres statut ───────────────────────────────────────────────────────────

type StatusFilter =
  | "ALL"
  | "PENDING"
  | "SCHEDULED"
  | "SENT"
  | "CONVERTED"
  | "FAILED"
  | "CANCELLED"
  | "NEEDS_REVIEW";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "SENT", label: "Envoyées" },
  { value: "CONVERTED", label: "Converties" },
  { value: "FAILED", label: "Échouées" },
  { value: "SCHEDULED", label: "Planifiées" },
  { value: "NEEDS_REVIEW", label: "À vérifier" },
  { value: "PENDING", label: "En attente" },
  { value: "CANCELLED", label: "Annulées" },
];

// ─── Filtres canal ────────────────────────────────────────────────────────────

type ChannelFilter = "ALL" | "EMAIL" | "SMS";

const CHANNEL_FILTERS: { value: ChannelFilter; label: string }[] = [
  { value: "ALL", label: "Tous canaux" },
  { value: "EMAIL", label: "✉ Email" },
  { value: "SMS", label: "💬 SMS" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  currentStatus: StatusFilter;
  currentChannel: ChannelFilter;
  countByStatus: Partial<Record<StatusFilter, number>>;
  total: number;
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function ActionsFilters({
  currentStatus,
  currentChannel,
  countByStatus,
  total,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function buildUrl(status: StatusFilter, channel: ChannelFilter) {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (channel !== "ALL") params.set("channel", channel);
    const qs = params.size > 0 ? `?${params.toString()}` : "";
    router.push(`${pathname}${qs}`);
  }

  return (
    <div className="space-y-3">
      {/* Filtre par statut */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ value, label }) => {
          const count = value === "ALL" ? total : (countByStatus[value] ?? 0);
          const isActive = currentStatus === value;
          return (
            <Button
              key={value}
              size="sm"
              variant={isActive ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => buildUrl(value, currentChannel)}
            >
              {label}
              <span
                className={cn(
                  "text-xs rounded-full px-1.5 py-0 leading-5 font-semibold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Filtre par canal */}
      <div className="flex gap-2">
        {CHANNEL_FILTERS.map(({ value, label }) => {
          const isActive = currentChannel === value;
          return (
            <Button
              key={value}
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className={cn("text-xs", isActive && "font-semibold")}
              onClick={() => buildUrl(currentStatus, value)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
