import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PLAN_QUOTAS } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionsFilters } from "../components/actions-filters";
import { ActionsTable, type ActionRow } from "../components/actions-table";
import type { ActionStatus } from "../components/action-status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Instancié une fois au niveau module — évite la recréation à chaque rendu
const currencyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type StatusFilter =
  | "ALL"
  | "PENDING"
  | "SCHEDULED"
  | "SENT"
  | "CONVERTED"
  | "FAILED"
  | "CANCELLED"
  | "NEEDS_REVIEW";

type ChannelFilter = "ALL" | "EMAIL" | "SMS";

const SENT_STATUSES = [
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "CONVERTED",
  "FAILED",
] as const;

interface ActionsContentProps {
  tenantId: string;
  plan: string;
  statusFilter: StatusFilter;
  channelFilter: ChannelFilter;
}

export async function ActionsContent({
  tenantId,
  plan,
  statusFilter,
  channelFilter,
}: ActionsContentProps) {
  const whereFiltered: Prisma.WinbackActionWhereInput = {
    tenantId,
    ...(statusFilter !== "ALL" && {
      status:
        statusFilter === "SENT"
          ? {
              in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] as ActionStatus[],
            }
          : (statusFilter as ActionStatus),
    }),
    ...(channelFilter !== "ALL" && { channel: channelFilter }),
  };

  const [actions, statusGroups, totalActions, totalConverted, caRecupere, activeIntegrationsCount] =
    await Promise.all([
      prisma.winbackAction.findMany({
        where: whereFiltered,
        select: {
          id: true,
          type: true,
          status: true,
          channel: true,
          subject: true,
          content: true,
          promoCode: true,
          promoValue: true,
          promoType: true,
          churnScoreAtCreation: true,
          convertedValue: true,
          sentAt: true,
          convertedAt: true,
          failureReason: true,
          createdAt: true,
          aiDecisionLog: true,
          psychologicalTrigger: true,
          persuasionScore: true,
          customer: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      prisma.winbackAction.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.winbackAction.count({ where: { tenantId } }),
      prisma.winbackAction.count({ where: { tenantId, status: "CONVERTED" } }),
      prisma.winbackAction.aggregate({
        where: { tenantId, status: "CONVERTED" },
        _sum: { convertedValue: true },
      }),
      prisma.integration.count({ where: { tenantId, status: "ACTIVE" } }),
    ]);

  // Sérialisation (Decimal + Date → primitifs pour Client Components)
  const serializedActions: ActionRow[] = actions.map((a) => {
    const log = a.aiDecisionLog as {
      psychologicalTrigger?: string;
      persuasionScore?: number;
    } | null;

    return {
      id: a.id,
      type: a.type,
      status: a.status as ActionRow["status"],
      channel: a.channel,
      subject: a.subject,
      content: a.content,
      promoCode: a.promoCode,
      promoValue: a.promoValue != null ? parseFloat(a.promoValue.toString()) : null,
      promoType: a.promoType,
      churnScoreAtCreation: a.churnScoreAtCreation,
      convertedValue:
        a.convertedValue != null ? parseFloat(a.convertedValue.toString()) : null,
      sentAt: a.sentAt?.toISOString() ?? null,
      convertedAt: a.convertedAt?.toISOString() ?? null,
      failureReason: a.failureReason,
      createdAt: a.createdAt.toISOString(),
      customer: a.customer,
      psychologicalTrigger: a.psychologicalTrigger ?? log?.psychologicalTrigger ?? null,
      persuasionScore: a.persuasionScore ?? log?.persuasionScore ?? null,
    };
  });

  // Métriques par statut
  const countByStatus: Partial<Record<StatusFilter, number>> = {};
  let sentCount = 0;
  for (const group of statusGroups) {
    const s = group.status as ActionStatus;
    if ((SENT_STATUSES as readonly string[]).includes(s)) {
      sentCount += group._count.id;
      if (s !== "CONVERTED" && s !== "FAILED") {
        countByStatus["SENT"] = (countByStatus["SENT"] ?? 0) + group._count.id;
      }
    }
    if (s === "CONVERTED") countByStatus["CONVERTED"] = group._count.id;
    if (s === "FAILED") countByStatus["FAILED"] = group._count.id;
    if (s === "PENDING") countByStatus["PENDING"] = group._count.id;
    if (s === "CANCELLED") countByStatus["CANCELLED"] = group._count.id;
    if (s === "SCHEDULED") {
      countByStatus["PENDING"] = (countByStatus["PENDING"] ?? 0) + group._count.id;
    }
  }

  const tauxConversion =
    sentCount > 0 ? Math.round((totalConverted / sentCount) * 100) : 0;
  const caTotal = caRecupere._sum.convertedValue
    ? parseFloat(caRecupere._sum.convertedValue.toString())
    : 0;

  const planKey = plan.toLowerCase() as keyof typeof PLAN_QUOTAS;
  const actionsLimit = PLAN_QUOTAS[planKey]?.actions_limit ?? 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", height: "100%", minHeight: 0 }}>
      {/* KPI cards */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4" style={{ flexShrink: 0 }}>
        <StatCard
          label="Total actions"
          value={totalActions}
          sub={actionsLimit === -1 ? "illimitées" : `${actionsLimit} max / mois`}
          accent="teal"
        />
        <StatCard
          label="Converties"
          value={totalConverted}
          sub={`Taux : ${tauxConversion}%`}
          accent={totalConverted > 0 ? "teal" : "default"}
        />
        <StatCard
          label="CA récupéré"
          value={caTotal > 0 ? currencyFmt.format(caTotal) : "—"}
          sub="Sur les actions converties"
          accent={caTotal > 0 ? "teal" : "default"}
        />
        <StatCard
          label="Échouées"
          value={countByStatus["FAILED"] ?? 0}
          sub="À investiguer"
          accent={(countByStatus["FAILED"] ?? 0) > 0 ? "coral" : "default"}
        />
      </div>

      {/* État vide ou liste */}
      {totalActions === 0 ? (
        <Card style={{ flex: 1, minHeight: 0 }}>
          <CardContent className="h-full flex flex-col items-center justify-center text-center space-y-3">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <svg width="40" height="40" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.12 }}>
                <circle cx="36" cy="36" r="8"  fill="none" stroke="#D97757" strokeWidth="1.5"/>
                <circle cx="36" cy="36" r="16" fill="none" stroke="#D97757" strokeWidth="1"/>
                <circle cx="36" cy="36" r="24" fill="none" stroke="#D97757" strokeWidth="0.8" opacity="0.7"/>
                <circle cx="36" cy="36" r="32" fill="none" stroke="#D97757" strokeWidth="0.6" opacity="0.5"/>
                <line x1="36" y1="4"  x2="36" y2="68" stroke="#D97757" strokeWidth="0.5" opacity="0.35"/>
                <line x1="4"  y1="36" x2="68" y2="36" stroke="#D97757" strokeWidth="0.5" opacity="0.35"/>
                <path d="M36 36 L36 4 A32 32 0 0 1 68 36 Z" fill="rgba(217,119,87,0.15)"/>
                <circle cx="36" cy="36" r="3" fill="#D97757"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">
                CoY est prêt — vos premières actions arrivent
              </h3>
              {activeIntegrationsCount > 0 ? (
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  CoY surveille vos clients en temps réel. Dès qu&apos;un client dépasse le seuil
                  de risque, une action de récupération se déclenche automatiquement. Aucun
                  client à risque détecté pour l&apos;instant.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Dès qu&apos;un client dépasse votre seuil de risque, CoY déclenche
                  automatiquement un email ou SMS de récupération. Connectez vos outils pour activer
                  la détection.
                </p>
              )}
            </div>
            {activeIntegrationsCount > 0 ? (
              <Link href="/customers">
                <Button size="sm" variant="outline">
                  Voir les clients à risque
                </Button>
              </Link>
            ) : (
              <Link href="/integrations">
                <Button size="sm" variant="outline">
                  Connecter une intégration
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div style={{ flexShrink: 0 }}>
            <ActionsFilters
              currentStatus={statusFilter}
              currentChannel={channelFilter}
              countByStatus={countByStatus}
              total={totalActions}
            />
          </div>
          {/* Table — prend toute la hauteur restante, scroll interne */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <ActionsTable actions={serializedActions} />
            {totalActions > 100 && statusFilter === "ALL" && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Affichage des 100 dernières actions. La pagination complète sera disponible en V2.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
