import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

// ─── Types Brevo webhook events ───────────────────────────────────────────────
// Doc : https://developers.brevo.com/docs/transactional-webhooks

interface BrevoWebhookEvent {
  event?: string;            // Email: opened | clicked | unsubscribe | delivered...
  email?: string;
  "message-id"?: string;    // Email message ID (sometimes wrapped in angle brackets)
  messageId?: string | number; // SMS message ID
  msg_status?: string;       // SMS: delivered | replied | unsubscribed | hard_bounce...
  reply?: string;
  to?: string;
  id?: number;               // ID Brevo interne
  link?: string;             // URL cliquée (pour event "clicked")
  date?: string;             // ISO datetime
}

// ─── Authentification par secret partagé ──────────────────────────────────────
// Brevo n'a pas de signature HMAC native sur les webhooks transactionnels — le
// secret est donc porté par l'URL du webhook elle-même (configurée dans Brevo :
// Transactional > Settings > Webhook > URL = .../api/webhooks/brevo?secret=XXXX),
// pas par un header, pour rester portable quelle que soit la configuration Brevo.
function authenticate(request: NextRequest): boolean {
  const provided = new URL(request.url).searchParams.get("secret") ?? "";
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[brevo-webhook] BREVO_WEBHOOK_SECRET non défini");
    return false;
  }
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: BrevoWebhookEvent;
  try {
    body = (await req.json()) as BrevoWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const event = (body.event ?? body.msg_status ?? "").toLowerCase();
  const rawMessageId = body["message-id"] ?? body.messageId;

  if (!rawMessageId) {
    // Pas de message-id → on ne peut pas faire le lien avec une action
    return NextResponse.json({ received: true });
  }

  // Brevo envoie le message-id avec des chevrons : "<uuid@smtp-relay.brevo.com>"
  const messageId = String(rawMessageId).replace(/^<|>$/g, "").trim();

  // Trouver l'action correspondante
  const action = await prisma.winbackAction.findFirst({
    where: { brevoMessageId: messageId },
    select: { id: true, status: true, tenantId: true },
  });

  if (!action) {
    // Message non lié à une WinbackAction (email système, trial email, etc.)
    return NextResponse.json({ received: true });
  }

  const now = new Date();

  switch (event) {
    case "opened": {
      // Ne pas rétrograder un statut déjà avancé (CLICKED, CONVERTED)
      const allowedStatuses = ["SENT", "DELIVERED"];
      if (!allowedStatuses.includes(action.status)) break;
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "OPENED", openedAt: now },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: action.tenantId,
          action: "EMAIL_OPENED",
          entityType: "WinbackAction",
          entityId: action.id,
        },
      });
      break;
    }

    case "delivered": {
      if (action.status !== "SENT") break;
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { deliveredAt: now },
      });
      break;
    }

    case "clicked": {
      const allowedStatuses = ["SENT", "DELIVERED", "OPENED"];
      if (!allowedStatuses.includes(action.status)) break;
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: { status: "CLICKED", clickedAt: now },
      });
      await prisma.auditLog.create({
        data: {
          tenantId: action.tenantId,
          action: "EMAIL_CLICKED",
          entityType: "WinbackAction",
          entityId: action.id,
          details: { link: body.link ?? null },
        },
      });
      break;
    }

    case "unsubscribe":
    case "unsubscribed":
    case "replied": {
      // Brevo reports inbound SMS replies separately. STOP and its common French
      // variants are treated as a permanent opt-out; Brevo's own unsubscribed
      // event is always an opt-out.
      const reply = body.reply?.trim().toUpperCase() ?? "";
      const isSmsOptOut = event === "unsubscribed" ||
        (event === "replied" && /^(STOP|ARRET|ARRÊT|DESABONNER|DÉSABONNER)$/.test(reply));
      if (event === "replied" && !isSmsOptOut) break;
      // Opt-out : mettre le client en cooldown permanent
      const fullAction = await prisma.winbackAction.findUnique({
        where: { id: action.id },
        select: { customerId: true },
      });
      if (fullAction?.customerId) {
        // Cooldown 10 ans = opt-out permanent sans supprimer les données
        const farFuture = new Date(now.getTime() + 10 * 365 * 24 * 3600 * 1000);
        await prisma.customer.update({
          where: { id: fullAction.customerId },
          data: { cooldownUntil: farFuture, optedOutAt: now },
        });
        await prisma.auditLog.create({
          data: {
            tenantId: action.tenantId,
            action: "CUSTOMER_OPTED_OUT",
            entityType: "Customer",
            entityId: fullAction.customerId,
            details: {
              source: event === "replied" ? "BREVO_SMS_STOP" : "BREVO_UNSUBSCRIBE",
              channel: body.messageId !== undefined ? "SMS" : "EMAIL",
            },
          },
        });
      }
      break;
    }

    case "hard_bounce":
    case "rejected":
    case "bl": {
      if (["CONVERTED", "CANCELLED"].includes(action.status)) break;
      await prisma.winbackAction.update({
        where: { id: action.id },
        data: {
          status: "FAILED",
          failedAt: now,
          failureReason: body.messageId !== undefined ? "SMS_UNDELIVERABLE" : "EMAIL_UNDELIVERABLE",
        },
      });
      break;
    }

    default:
      // "soft_bounce", "hard_bounce", "spam" — ignorer silencieusement
      break;
  }

  return NextResponse.json({ received: true });
}
