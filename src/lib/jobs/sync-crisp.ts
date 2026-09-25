import { createJobsClient } from "@/lib/prisma";
import { scoreConversation } from "@/lib/ai/agents";
import { computeOrderVariables } from "@/lib/customers/compute-order-variables";
import { computeServiceVariables } from "@/lib/customers/compute-service-variables";
import { CHURN_SCORE_DEFAULT_THRESHOLD } from "@/config/constants";
import type { Prisma } from "@prisma/client";
import { getAppUrl } from "@/lib/utils/get-app-url";

// ─── Types API Crisp ──────────────────────────────────────────────────────────

interface CrispConversationMeta {
  email?: string | null;
  nickname?: string | null;
  firstname?: string | null;
  lastname?: string | null;
}

interface CrispConversation {
  session_id: string;
  state: string; // "resolved" | "pending" | "unresolved"
  created_at: number; // Unix timestamp ms
  updated_at: number;
  meta: CrispConversationMeta;
}

interface CrispConversationsResponse {
  data?: CrispConversation[];
  error?: { reason?: string };
}

interface CrispMessage {
  fingerprint: number;
  from: string; // "user" | "operator"
  type: string; // "text" | "file" | "animation" | ...
  content?: string | null;
  timestamp: number;
}

interface CrispMessagesResponse {
  data?: CrispMessage[];
}

// ─── Mapping statut Crisp → ConversationStatus ───────────────────────────────

function mapCrispStatus(state: string): "OPEN" | "CLOSED" | "MERGED" {
  if (state === "resolved") return "CLOSED";
  return "OPEN";
}

// ─── runSyncCrisp ─────────────────────────────────────────────────────────────
//
// Polling cron (30 min) — récupère les conversations modifiées depuis lastSyncAt.
// Pagination sur page_number jusqu'à data[] vide.
// ⚠️ Pas de recalcCustomerStats ni checkAttribution (Crisp = helpdesk, pas e-commerce).
// Utilise DIRECT_URL via createJobsClient (évite PgBouncer 42P05).

export async function runSyncCrisp(): Promise<{ synced: number; errors: number }> {
  const prisma = createJobsClient();
  const now = new Date();
  let totalSynced = 0;
  let totalErrors = 0;

  try {
    const integrations = await prisma.integration.findMany({
      where: { type: "CRISP", status: "ACTIVE" },
      include: { tenant: { select: { sector: true, settings: true } } },
    });

    for (const integration of integrations) {
      const config = (integration.config ?? {}) as Record<string, string>;
      if (!config.website_id) continue;

      const websiteId = config.website_id;
      const identifier = process.env.CRISP_PLUGIN_IDENTIFIER ?? "";
      const key = process.env.CRISP_PLUGIN_KEY ?? "";
      if (!identifier || !key) {
        console.error(`[sync-crisp] CRISP_PLUGIN_IDENTIFIER ou CRISP_PLUGIN_KEY manquant`);
        continue;
      }
      const basicAuth = Buffer.from(`${identifier}:${key}`).toString("base64");
      const headers: Record<string, string> = {
        Authorization: `Basic ${basicAuth}`,
        "X-Crisp-Tier": "plugin",
      };

      // since = lastSyncAt ou maintenant - 30 minutes (premier run), en Unix timestamp secondes
      const since = integration.lastSyncAt ?? new Date(now.getTime() - 30 * 60 * 1000);
      const sinceUnix = Math.floor(since.getTime() / 1000);

      // Pagination : incrémenter page_number jusqu'à data[] vide
      const processedSessionIds = new Set<string>();
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        let conversations: CrispConversation[] = [];
        try {
          const url = `https://api.crisp.chat/v1/website/${websiteId}/conversations/${page}?filter_date_start=${sinceUnix}`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            console.error(`[sync-crisp] GET conversations failed for tenant ${integration.tenantId}: ${res.status}`);
            break;
          }
          const body = (await res.json()) as CrispConversationsResponse;
          conversations = body.data ?? [];
        } catch (err) {
          console.error(`[sync-crisp] Fetch conversations error for tenant ${integration.tenantId}:`, err);
          break;
        }

        if (conversations.length === 0) {
          hasMore = false;
          break;
        }

        for (const conv of conversations) {
          try {
            const email = conv.meta?.email;
            if (!email) {
              console.warn(`[sync-crisp] Email absent pour conversation ${conv.session_id}, ignorée`);
              continue;
            }

            const tenantId = integration.tenantId;

            // Upsert Customer
            const customer = await prisma.customer.upsert({
              where: { tenantId_email: { tenantId, email } },
              create: {
                tenantId,
                integrationId: integration.id,
                externalId: conv.session_id,
                email,
                firstName: conv.meta.firstname ?? conv.meta.nickname ?? null,
                lastName: conv.meta.lastname ?? null,
              },
              update: {
                firstName: conv.meta.firstname ?? conv.meta.nickname ?? undefined,
                lastName: conv.meta.lastname ?? undefined,
              },
            });

            // Find or Create Conversation
            const convStatus = mapCrispStatus(conv.state);
            let conversation = await prisma.conversation.findFirst({
              where: { customerId: customer.id, externalId: conv.session_id },
            });

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  tenantId,
                  customerId: customer.id,
                  externalId: conv.session_id,
                  source: "CRISP",
                  status: convStatus,
                  createdAt: new Date(conv.created_at),
                },
              });
            } else if (conversation.status !== convStatus) {
              conversation = await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  status: convStatus,
                  closedAt: convStatus === "CLOSED" ? new Date() : undefined,
                },
              });
            }

            // Fetch messages
            let messages: CrispMessage[] = [];
            try {
              const msgRes = await fetch(
                `https://api.crisp.chat/v1/website/${websiteId}/conversation/${conv.session_id}/messages`,
                { headers }
              );
              if (msgRes.ok) {
                const msgBody = (await msgRes.json()) as CrispMessagesResponse;
                messages = (msgBody.data ?? []).filter((m) => m.type === "text" && m.content);
              }
            } catch (err) {
              console.warn(`[sync-crisp] Fetch messages error for ${conv.session_id}:`, err);
            }

            // Upsert Messages (déduplication par fingerprint)
            for (const msg of messages) {
              if (!msg.content) continue;
              const existing = await prisma.message.findFirst({
                where: { conversationId: conversation.id, externalId: String(msg.fingerprint) },
              });
              if (!existing) {
                await prisma.message.create({
                  data: {
                    conversationId: conversation.id,
                    externalId: String(msg.fingerprint),
                    sender: msg.from === "user" ? "CUSTOMER" : "AGENT",
                    content: msg.content,
                    createdAt: new Date(msg.timestamp),
                  },
                });
              }
            }

            // Scoring IA si au moins un message client
            const hasCustomerMessage = messages.some((m) => m.from === "user" && m.content);
            if (hasCustomerMessage) {
              const scoringMessages = messages
                .filter((m) => m.content)
                .map((m) => ({
                  sender: (m.from === "user" ? "CUSTOMER" : "AGENT") as "AGENT" | "CUSTOMER",
                  content: m.content!,
                }));

              try {
                const nowMs = Date.now();
                const daysSinceLastOrder = customer.lastOrderAt
                  ? Math.floor((nowMs - customer.lastOrderAt.getTime()) / 86400000)
                  : undefined;
                const monthsSinceCreation = Math.max(
                  1,
                  (nowMs - customer.createdAt.getTime()) / (30 * 86400000)
                );
                const orderFrequencyPerMonth =
                  customer.totalOrders > 0
                    ? Math.round((customer.totalOrders / monthsSinceCreation) * 100) / 100
                    : undefined;

                const [{ recentOrderAmounts, returnRate }, serviceVars] = await Promise.all([
                  computeOrderVariables(customer.id, customer.totalOrders, tenantId, prisma),
                  computeServiceVariables(customer.id, tenantId, prisma),
                ]);

                const result = await scoreConversation(scoringMessages, {
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  ltv: parseFloat(customer.ltv.toString()),
                  totalOrders: customer.totalOrders,
                  totalSpent: parseFloat(customer.totalSpent.toString()),
                  lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
                  previousChurnScore: customer.churnScore,
                  averageBasket:
                    customer.averageBasket != null
                      ? parseFloat(customer.averageBasket.toString())
                      : undefined,
                  daysSinceLastOrder,
                  orderFrequencyPerMonth,
                  recentOrderAmounts: recentOrderAmounts.length > 0 ? recentOrderAmounts : undefined,
                  returnRate,
                  ...serviceVars,
                });

                const scoredAt = new Date();
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: {
                    churnScore: result.churnScore,
                    churnRisk: result.churnRisk,
                    lastScoredAt: scoredAt,
                    scoringDetails: {
                      sentimentScore: result.sentimentScore,
                      sentimentLabel: result.sentimentLabel,
                      triggers: result.triggers,
                      reasoning: result.reasoning,
                      aiModelUsed: result.aiModelUsed,
                      scoredAt: scoredAt.toISOString(),
                    } as Prisma.InputJsonValue,
                  },
                });

                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: {
                    sentimentScore: result.sentimentScore,
                    sentimentLabel: result.sentimentLabel,
                    insatisfactionDetected: result.insatisfactionDetected,
                    analyzedAt: scoredAt,
                  },
                });

                await prisma.auditLog.create({
                  data: {
                    tenantId,
                    action: "SCORING_COMPLETED",
                    entityType: "Customer",
                    entityId: customer.id,
                    details: {
                      source: "CRISP_POLLING",
                      crispSessionId: conv.session_id,
                      churnScore: result.churnScore,
                      churnRisk: result.churnRisk,
                      insatisfactionDetected: result.insatisfactionDetected,
                      aiModelUsed: result.aiModelUsed,
                    } as Prisma.InputJsonValue,
                  },
                });

                // ── Déclencher action de récupération si risque élevé ────────────
                const tenantSettings = (integration.tenant.settings ?? {}) as {
                  churn_threshold?: number;
                };
                const threshold =
                  tenantSettings.churn_threshold ?? CHURN_SCORE_DEFAULT_THRESHOLD;
                const isInCooldown =
                  customer.cooldownUntil != null && customer.cooldownUntil > now;

                if (
                  result.insatisfactionDetected &&
                  result.churnScore >= threshold &&
                  !isInCooldown
                ) {
                  const appUrl =
                    getAppUrl();
                  try {
                    await fetch(`${appUrl}/api/v1/actions/generate`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.SCORING_API_KEY}`,
                      },
                      body: JSON.stringify({
                        tenantId,
                        customerId: customer.id,
                        channel: "EMAIL",
                        triggers: result.triggers ?? [],
                      }),
                      cache: "no-store",
                    });
                  } catch (err) {
                    console.error(
                      `[sync-crisp] Erreur déclenchement action client ${customer.id}:`,
                      err
                    );
                  }
                }
              } catch (err) {
                console.error(`[sync-crisp] Erreur scoring IA pour ${conv.session_id}:`, err);
              }
            }

            processedSessionIds.add(conv.session_id);
            totalSynced++;
          } catch (err) {
            console.error(`[sync-crisp] Erreur traitement conversation ${conv.session_id}:`, err);
            totalErrors++;
          }
        }

        // Crisp renvoie 25 conversations par page max
        if (conversations.length < 25) hasMore = false;
        else page++;
      }

      // ── Phase 2 : rattrapage messages — conversations OPEN non incluses dans la pagination ──
      // filter_date_start filtre par created_at → les conversations plus anciennes avec
      // de nouveaux messages ne réapparaissent pas. Ce sweep compense ce comportement.
      const openConvs = await prisma.conversation.findMany({
        where: {
          tenantId: integration.tenantId,
          source: "CRISP",
          status: "OPEN",
        },
        select: { id: true, externalId: true },
      });

      for (const openConv of openConvs) {
        if (!openConv.externalId) continue;
        if (processedSessionIds.has(openConv.externalId)) continue; // déjà traité dans phase 1

        try {
          const msgRes = await fetch(
            `https://api.crisp.chat/v1/website/${websiteId}/conversation/${openConv.externalId}/messages`,
            { headers }
          );
          if (!msgRes.ok) continue;
          const msgBody = (await msgRes.json()) as CrispMessagesResponse;
          const msgs = (msgBody.data ?? []).filter((m) => m.type === "text" && m.content);

          for (const msg of msgs) {
            if (!msg.content) continue;
            const existing = await prisma.message.findFirst({
              where: { conversationId: openConv.id, externalId: String(msg.fingerprint) },
            });
            if (!existing) {
              await prisma.message.create({
                data: {
                  conversationId: openConv.id,
                  externalId: String(msg.fingerprint),
                  sender: msg.from === "user" ? "CUSTOMER" : "AGENT",
                  content: msg.content,
                  createdAt: new Date(msg.timestamp),
                },
              });
            }
          }
        } catch (err) {
          console.warn(`[sync-crisp] Sweep messages error for ${openConv.externalId}:`, err);
        }
      }

      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: now },
      });
    }

    console.log(`[sync-crisp] ${totalSynced} conversation(s) synchronisée(s), ${totalErrors} erreur(s)`);
    return { synced: totalSynced, errors: totalErrors };
  } finally {
    await prisma.$disconnect();
  }
}
