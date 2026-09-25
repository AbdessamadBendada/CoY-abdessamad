export const dynamic = "force-dynamic";


import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { ActionsContent } from "./_components/actions-content";

const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "SCHEDULED",
  "SENT",
  "CONVERTED",
  "FAILED",
  "CANCELLED",
  "NEEDS_REVIEW",
] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const VALID_CHANNELS = ["ALL", "EMAIL", "SMS"] as const;
type ChannelFilter = (typeof VALID_CHANNELS)[number];

function parseStatus(v: string | undefined): StatusFilter {
  if (!v) return "ALL";
  const u = v.toUpperCase() as StatusFilter;
  return VALID_STATUSES.includes(u) ? u : "ALL";
}

function parseChannel(v: string | undefined): ChannelFilter {
  if (!v) return "ALL";
  const u = v.toUpperCase() as ChannelFilter;
  return VALID_CHANNELS.includes(u) ? u : "ALL";
}

function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 80, background: "#F3F4F6", borderRadius: "0.75rem" }} />
        ))}
      </div>
      <div style={{ height: 400, background: "#F3F4F6", borderRadius: "0.75rem" }} />
    </div>
  );
}

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  // requireAuth() est wrappé avec React cache() — 0ms si le layout l'a déjà appelé
  const [user, { status: rawStatus, channel: rawChannel }] = await Promise.all([
    requireAuth(),
    searchParams,
  ]);

  const statusFilter = parseStatus(rawStatus);
  const channelFilter = parseChannel(rawChannel);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {/* En-tête — statique, rendu immédiat */}
      <div style={{ flexShrink: 0 }}>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#2B2523" }}>Actions en cours</h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          Emails et SMS de récupération actifs — suivi des conversions et du CA récupéré en temps réel.
        </p>
      </div>

      {/* KPIs + tableau — streaming, prend le reste de la hauteur */}
      <Suspense fallback={<ContentSkeleton />}>
        <ActionsContent
          tenantId={user.tenant.id}
          plan={user.tenant.plan}
          statusFilter={statusFilter}
          channelFilter={channelFilter}
        />
      </Suspense>
    </div>
  );
}
