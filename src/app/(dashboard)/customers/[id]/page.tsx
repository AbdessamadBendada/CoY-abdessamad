export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Zap, User } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { CustomerRiskBadge, RISK_CONFIG, type ChurnRisk } from "../components/customer-risk-badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScoringDetails {
  sentimentScore?: number;
  sentimentLabel?: string;
  triggers?: string[];
  reasoning?: string;
  aiModelUsed?: string;
  scoredAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function formatDate(d: Date | null | undefined) {
  return d ? dateFmt.format(d) : "—";
}

function formatDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return `${dateFmt.format(d)} ${timeFmt.format(d)}`;
}

const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: "Positif",
  NEUTRAL: "Neutre",
  NEGATIVE: "Négatif",
  VERY_NEGATIVE: "Très négatif",
};

const SOURCE_LABELS: Record<string, string> = {
  CRISP: "Crisp",
  GORGIAS: "Gorgias",
  SHOPIFY: "Shopify",
  PRESTASHOP: "PrestaShop",
  WOOCOMMERCE: "WooCommerce",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireAuth(), params]);

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: user.tenant.id },
    include: {
      conversations: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      },
      actions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          status: true,
          channel: true,
          subject: true,
          sentAt: true,
          churnScoreAtCreation: true,
        },
      },
    },
  });

  if (!customer) notFound();

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email;

  const ltv = parseFloat(customer.ltv.toString());
  const scoring = (customer.scoringDetails ?? {}) as ScoringDetails;
  const risk = customer.churnRisk as ChurnRisk | null;
  const riskConfig = risk ? RISK_CONFIG[risk] : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size={13} />
          Retour aux clients
        </Link>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: "#2B2523" }}>
              {name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
              {customer.email}
              {customer.phone ? ` · ${customer.phone}` : ""}
              {" · "}Synchronisé le {formatDate(customer.updatedAt)}
            </p>
          </div>

          {risk && riskConfig && (
            <CustomerRiskBadge risk={risk} score={customer.churnScore} />
          )}
          {!risk && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full border">
              Non scoré
            </span>
          )}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4" style={{ flexShrink: 0 }}>
        <StatCard
          label="Score churn"
          value={customer.churnScore != null ? customer.churnScore : "—"}
          sub={customer.lastScoredAt ? `Scoré le ${formatDate(customer.lastScoredAt)}` : "Pas encore scoré"}
          accent={
            customer.churnRisk === "CRITICAL" ? "coral"
            : customer.churnRisk === "HIGH" ? "amber"
            : "default"
          }
        />
        <StatCard
          label="LTV"
          value={ltv > 0 ? currencyFmt.format(ltv) : "—"}
          sub={`${customer.totalOrders} commande${customer.totalOrders > 1 ? "s" : ""}`}
          accent="teal"
        />
        <StatCard
          label="Dernière commande"
          value={formatDate(customer.lastOrderAt)}
          sub={`Panier moy. ${customer.averageBasket ? currencyFmt.format(parseFloat(customer.averageBasket.toString())) : "—"}`}
        />
        <StatCard
          label="Actions CoY"
          value={customer.actions.length}
          sub={customer.lastActionAt ? `Dernière le ${formatDate(customer.lastActionAt)}` : "Aucune action"}
        />
      </div>

      {/* ── Corps — scrollable ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* ── Colonne gauche : Profil + Scoring ─────────────────────────── */}
          <div className="space-y-3">

            {/* Infos client */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} style={{ color: "#6B7280" }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Profil client
                </span>
              </div>
              <InfoRow label="Email" value={customer.email} />
              <InfoRow label="Prénom" value={customer.firstName} />
              <InfoRow label="Nom" value={customer.lastName} />
              <InfoRow label="Téléphone" value={customer.phone} />
              <InfoRow label="Client depuis" value={formatDate(customer.createdAt)} />
              <InfoRow
                label="Total dépensé"
                value={customer.totalSpent ? currencyFmt.format(parseFloat(customer.totalSpent.toString())) : "—"}
              />
              {customer.tags.length > 0 && (
                <div className="flex items-start justify-between gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Tags</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {customer.optedOutAt && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Opt-out</span>
                  <span style={{ color: "#E85D4A" }}>
                    Désinscrit le {formatDate(customer.optedOutAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Scoring IA */}
            {customer.churnScore != null && (
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} style={{ color: "#6B7280" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Analyse IA
                  </span>
                </div>

                {scoring.sentimentLabel && (
                  <InfoRow
                    label="Sentiment"
                    value={SENTIMENT_LABELS[scoring.sentimentLabel] ?? scoring.sentimentLabel}
                  />
                )}
                {scoring.sentimentScore != null && (
                  <InfoRow
                    label="Score sentiment"
                    value={`${Math.round(scoring.sentimentScore * 100)}%`}
                  />
                )}
                {scoring.aiModelUsed && (
                  <InfoRow label="Modèle IA" value={scoring.aiModelUsed} />
                )}
                {scoring.scoredAt && (
                  <InfoRow label="Scoré le" value={formatDateTime(new Date(scoring.scoredAt))} />
                )}

                {scoring.triggers && scoring.triggers.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1.5">Déclencheurs détectés</p>
                    <div className="flex flex-wrap gap-1">
                      {scoring.triggers.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(232,93,74,0.1)", color: "#E85D4A" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {scoring.reasoning && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Raisonnement</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
                      {scoring.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions CoY */}
            {customer.actions.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} style={{ color: "#6B7280" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions envoyées
                  </span>
                </div>
                <div className="space-y-2">
                  {customer.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium" style={{ color: "#374151" }}>
                          {action.subject ?? action.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {action.channel} · {formatDate(action.sentAt)}
                        </p>
                      </div>
                      <ActionStatusBadge status={action.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne droite : Conversations ────────────────────────────── */}
          <div className="space-y-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} style={{ color: "#6B7280" }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conversations ({customer.conversations.length})
                </span>
              </div>

              {customer.conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucune conversation synchronisée
                </p>
              ) : (
                <div className="space-y-4">
                  {customer.conversations.map((conv) => (
                    <div key={conv.id} className="border rounded-lg overflow-hidden">
                      {/* En-tête conversation */}
                      <div
                        className="flex items-center justify-between px-3 py-2"
                        style={{ background: "#F9FAFB" }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: conv.source === "CRISP" ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
                              color: conv.source === "CRISP" ? "#3B82F6" : "#64748B",
                            }}
                          >
                            {SOURCE_LABELS[conv.source] ?? conv.source}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: conv.status === "CLOSED" ? "rgba(92,138,58,0.10)" : "rgba(245,158,11,0.1)",
                              color: conv.status === "CLOSED" ? "#5C8A3A" : "#B45309",
                            }}
                          >
                            {conv.status === "CLOSED" ? "Résolu" : "En cours"}
                          </span>
                          {conv.insatisfactionDetected && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(232,93,74,0.1)", color: "#E85D4A" }}
                            >
                              Insatisfaction
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(conv.createdAt)}
                        </span>
                      </div>

                      {/* Messages */}
                      {conv.messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-2">
                          Aucun message
                        </p>
                      ) : (
                        <div className="px-3 py-2 space-y-2 max-h-64 overflow-y-auto">
                          {conv.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.sender === "CUSTOMER" ? "" : "flex-row-reverse"}`}
                            >
                              <div
                                className="text-xs px-2.5 py-1.5 rounded-lg max-w-[80%] leading-relaxed"
                                style={{
                                  background: msg.sender === "CUSTOMER" ? "#F3F4F6" : "#2B2523",
                                  color: msg.sender === "CUSTOMER" ? "#374151" : "#FFFFFF",
                                }}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right" style={{ color: "#374151" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

const ACTION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "En attente", color: "#B45309", bg: "rgba(245,158,11,0.1)" },
  SENT: { label: "Envoyée", color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  DELIVERED: { label: "Délivrée", color: "#5C8A3A", bg: "rgba(92,138,58,0.10)" },
  OPENED: { label: "Ouverte", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
  CONVERTED: { label: "Convertie", color: "#5C8A3A", bg: "rgba(92,138,58,0.12)" },
  FAILED: { label: "Échouée", color: "#E85D4A", bg: "rgba(232,93,74,0.1)" },
  CANCELLED: { label: "Annulée", color: "#64748B", bg: "rgba(100,116,139,0.1)" },
};

function ActionStatusBadge({ status }: { status: string }) {
  const config = ACTION_STATUS_CONFIG[status] ?? {
    label: status,
    color: "#64748B",
    bg: "rgba(100,116,139,0.1)",
  };
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap shrink-0"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
