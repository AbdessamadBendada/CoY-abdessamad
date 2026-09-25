import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreConversation } from "@/lib/ai/agents";
import { computeOrderVariables } from "@/lib/customers/compute-order-variables";
import { computeServiceVariables } from "@/lib/customers/compute-service-variables";
import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/security/log-event";
import { CHURN_SCORE_DEFAULT_THRESHOLD } from "@/config/constants";
import { getAppUrl } from "@/lib/utils/get-app-url";

// ─── Types payload Gorgias ─────────────────────────────────────────────────

interface GorgiasCustomer {
  id: number;
  email: string;
  firstname?: string | null;
  lastname?: string | null;
}

interface GorgiasMessage {
  id: number;
  from_agent: boolean;
  body_text?: string | null;
  created_datetime: string;
}

interface GorgiasTicket {
  id: number;
  status: string;
  channel?: string | null;
  subject?: string | null;
  customer: GorgiasCustomer;
  messages?: GorgiasMessage[];
  created_datetime: string;
}

interface GorgiasWebhookPayload {
  event?: string;
  // Format standard : data = ticket
  data?: GorgiasTicket;
  // Format legacy : ticket directement
  ticket?: GorgiasTicket;
}

// ─── Validation HMAC ────────────────────────────────────────────────────────

function validateHmac(rawBody: string, secret: string, signature: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Mapping statut ticket Gorgias → ConversationStatus Prisma ──────────────

function mapStatus(status: string): "OPEN" | "CLOSED" | "MERGED" {
  if (status === "closed") return "CLOSED";
  if (status === "merged") return "MERGED";
  return "OPEN";
}

// ─── POST /api/webhooks/gorgias?tenantId=xxx ───────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const integrationId = searchParams.get("integrationId");

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId manquant" }, { status: 400 });
  }

  // Lire le corps brut (nécessaire pour la validation HMAC)
  const rawBody = await request.text();

  // Récupérer l'intégration Gorgias active par son ID opaque
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, type: "GORGIAS", status: "ACTIVE" },
    include: { tenant: { select: { settings: true } } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Intégration Gorgias introuvable ou inactive" }, { status: 404 });
  }

  const tenantId = integration.tenantId;

  // Valider la signature HMAC — obligatoire (toute intégration OAuth possède webhook_secret)
  const config = (integration.config ?? {}) as Record<string, string>;
  if (!config.webhook_secret) {
    console.error(`[webhook/gorgias] webhook_secret absent pour tenant ${tenantId} — configuration incomplète`);
    return NextResponse.json({ error: "Configuration incomplète" }, { status: 500 });
  }
  const signature = request.headers.get("X-Gorgias-Hmac-SHA256") ?? "";
  if (!validateHmac(rawBody, decrypt(config.webhook_secret), signature)) {
    await logSecurityEvent({
      event: "HMAC_FAILURE",
      severity: "CRITICAL",
      tenantId,
      request,
      details: { integration: "gorgias" },
    });
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  // Parser le payload
  let payload: GorgiasWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  // Extraire le ticket (support format "data" et "ticket" pour compatibilité)
  const ticket = payload.data ?? payload.ticket;
  if (!ticket?.customer?.email) {
    // Événement inconnu ou sans données client — acquitter silencieusement
    return NextResponse.json({ received: true });
  }

  // ── Upsert Customer ──────────────────────────────────────────────────────

  const gorgiasCustomer = ticket.customer;
  const customer = await prisma.customer.upsert({
    where: {
      tenantId_email: { tenantId, email: gorgiasCustomer.email },
    },
    create: {
      tenantId,
      integrationId: integration.id,
      externalId: String(gorgiasCustomer.id),
      email: gorgiasCustomer.email,
      firstName: gorgiasCustomer.firstname ?? null,
      lastName: gorgiasCustomer.lastname ?? null,
    },
    update: {
      firstName: gorgiasCustomer.firstname ?? undefined,
      lastName: gorgiasCustomer.lastname ?? undefined,
    },
  });

  // ── Find or Create Conversation ──────────────────────────────────────────

  const externalConvId = String(ticket.id);
  const convStatus = mapStatus(ticket.status);

  let conversation = await prisma.conversation.findFirst({
    where: { customerId: customer.id, externalId: externalConvId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        customerId: customer.id,
        externalId: externalConvId,
        source: "GORGIAS",
        subject: ticket.subject ?? null,
        status: convStatus,
      },
    });
  } else if (conversation.status !== convStatus) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: convStatus,
        // Enregistrer la date de fermeture pour calculer avg_resolution_time_hours
        closedAt: convStatus === "CLOSED" ? new Date() : undefined,
      },
    });
  }

  // ── Upsert Messages ──────────────────────────────────────────────────────

  const incomingMessages = ticket.messages ?? [];
  for (const msg of incomingMessages) {
    if (!msg.body_text) continue;
    const existing = await prisma.message.findFirst({
      where: { conversationId: conversation.id, externalId: String(msg.id) },
    });
    if (!existing) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          externalId: String(msg.id),
          sender: msg.from_agent ? "AGENT" : "CUSTOMER",
          content: msg.body_text,
          createdAt: new Date(msg.created_datetime),
        },
      });
    }
  }

  // ── Scoring IA ───────────────────────────────────────────────────────────

  const hasCustomerMessage = incomingMessages.some((m) => !m.from_agent && m.body_text);
  if (!hasCustomerMessage) {
    return NextResponse.json({ received: true });
  }

  const scoringMessages = incomingMessages
    .filter((m) => m.body_text)
    .map((m) => ({
      sender: (m.from_agent ? "AGENT" : "CUSTOMER") as "AGENT" | "CUSTOMER",
      content: m.body_text!,
    }));

  try {
    const nowMs = Date.now();
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor((nowMs - customer.lastOrderAt.getTime()) / 86400000)
      : undefined;
    const monthsSinceCreation = Math.max(1, (nowMs - customer.createdAt.getTime()) / (30 * 86400000));
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

    const now = new Date();

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        churnScore: result.churnScore,
        churnRisk: result.churnRisk,
        lastScoredAt: now,
        scoringDetails: {
          sentimentScore: result.sentimentScore,
          sentimentLabel: result.sentimentLabel,
          triggers: result.triggers,
          reasoning: result.reasoning,
          aiModelUsed: result.aiModelUsed,
          scoredAt: now.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        sentimentScore: result.sentimentScore,
        sentimentLabel: result.sentimentLabel,
        insatisfactionDetected: result.insatisfactionDetected,
        analyzedAt: now,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "SCORING_COMPLETED",
        entityType: "Customer",
        entityId: customer.id,
        details: {
          source: "GORGIAS_WEBHOOK",
          gorgiasTicketId: externalConvId,
          churnScore: result.churnScore,
          churnRisk: result.churnRisk,
          insatisfactionDetected: result.insatisfactionDetected,
          aiModelUsed: result.aiModelUsed,
        } as Prisma.InputJsonValue,
      },
    });

    // ── Déclencher action de récupération si risque élevé ────────────────────
    const tenantSettings = (integration.tenant.settings ?? {}) as {
      churn_threshold?: number;
    };
    const threshold = tenantSettings.churn_threshold ?? CHURN_SCORE_DEFAULT_THRESHOLD;
    const isInCooldown = customer.cooldownUntil != null && customer.cooldownUntil > now;

    if (result.insatisfactionDetected && result.churnScore >= threshold && !isInCooldown) {
      const appUrl = getAppUrl();

      // after() : s'exécute après que { received: true } soit renvoyé à Gorgias.
      // Évite que la génération IA (3 appels Mistral + Brevo) bloque la réponse webhook.
      after(async () => {
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
          console.error("[gorgias-webhook] Erreur déclenchement action:", err);
        }
      });
    }
  } catch (err) {
    // Ne pas bloquer — retourner 200 pour éviter les relances Gorgias
    console.error("[gorgias-webhook] Erreur scoring IA:", err);
  }

  return NextResponse.json({ received: true });
}
