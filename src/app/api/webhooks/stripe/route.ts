import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/features/billing/stripe/client";
import { prisma } from "@/shared/db/prisma";
import { generateFacturxXml } from "@/features/billing/services/facturx";
import { createSetupFeeInvoiceItem } from "@/features/billing/services/setup-fee";
import { sendSystemEmail } from "@/features/messaging/brevo/send-system-email";
import { Prisma } from "@prisma/client";
import type { Plan, BillingCycle, TenantStatus } from "@prisma/client";
import type Stripe from "stripe";
import type { Prisma as PrismaTypes } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Mapping PlanKey → Plan enum Prisma ─────────────────────────────────────

const PLAN_MAP: Record<string, Plan> = {
  // essentiel: "ESSENTIEL", // @deprecated 2026-06-09 — palier supprimé
  starter: "STARTER", // sessions en vol de l'ancienne grille — traitement manuel, pas de nouvelle vente
  croissance: "CROISSANCE",
  expert: "EXPERT",
  coy: "COY",
};

function toPrismaPlan(planKey: string): Plan | null {
  return PLAN_MAP[planKey.toLowerCase()] ?? null;
}

// ─── Transition de statut gardée (anti-désordre webhooks Stripe) ────────────────
//
// `lastBillingEventAt` est nullable et jamais backfillé : la garde temporelle DOIT
// toujours inclure `lastBillingEventAt: null` en plus de `lte`, sinon aucun tenant
// existant (colonne NULL) ne matcherait jamais `WHERE lastBillingEventAt <= X`.
async function tryTransition(
  tenant: { id: string; status: TenantStatus },
  toStatus: TenantStatus,
  fromStatuses: TenantStatus[],
  eventId: string,
  eventDate: Date,
): Promise<boolean> {
  const result = await prisma.tenant.updateMany({
    where: {
      id: tenant.id,
      status: { in: fromStatuses },
      OR: [{ lastBillingEventAt: null }, { lastBillingEventAt: { lte: eventDate } }],
    },
    data: { status: toStatus, lastBillingEventAt: eventDate },
  });

  if (result.count === 0) {
    console.warn(
      `[stripe-webhook] transition ignorée: tenant=${tenant.id} event=${eventId} statutActuel=${tenant.status} cible=${toStatus}`,
    );
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "WEBHOOK_TRANSITION_SKIPPED",
        entityType: "Tenant",
        entityId: tenant.id,
        details: {
          eventId,
          fromStatuses,
          toStatus,
          currentStatus: tenant.status,
        } as PrismaTypes.InputJsonValue,
      },
    });
    return false;
  }

  return true;
}

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Configuration Stripe manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    console.error("[stripe-webhook] Signature invalide");
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // ─── Dédup non-destructive ─────────────────────────────────────────────────
  // processedAt reste `null` jusqu'à la fin d'un traitement réussi. Sur P2002
  // (rejeu exact ou redélivrance concurrente) : si la ligne existante est déjà
  // marquée traitée → acquittement immédiat ; sinon (traitement en cours ou
  // tentative précédente en échec) → 500, jamais un acquittement silencieux —
  // SAUF si la ligne est plus vieille que STALE_CLAIM_MS (le process précédent est
  // mort avant son `catch`, ex: timeout serverless — sans ce repli, l'événement
  // resterait bloqué à vie, 500 en boucle, sans jamais se réparer).
  const STALE_CLAIM_MS = 10 * 60 * 1000; // 10 min — marge au-delà du maxDuration Vercel (300s)
  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
      if (existing?.processedAt) {
        return NextResponse.json({ received: true, duplicate: true });
      }
      // Reclaim atomique (compare-and-swap via le where) : la ligne précédente est
      // morte sans jamais atteindre son catch (ex: timeout serverless) — on retente
      // le traitement plutôt que de rester bloqué à vie. `updateMany` avec la même
      // condition de fraîcheur dans le `where` empêche deux process concurrents
      // de considérer tous deux la ligne comme périmée et de la retraiter en double.
      const reclaimed = await prisma.stripeWebhookEvent.updateMany({
        where: {
          id: event.id,
          processedAt: null,
          receivedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) },
        },
        data: { receivedAt: new Date() },
      });
      if (reclaimed.count === 0) {
        return NextResponse.json({ error: "Traitement en cours" }, { status: 500 });
      }
    } else {
      console.error("[stripe-webhook] Erreur dédup:", err);
      return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
    }
  }

  const eventDate = new Date(event.created * 1000);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object, event.id, eventDate);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, event.id, eventDate);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, event.id, eventDate);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object, event.id, eventDate);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object, event.id, eventDate);
        break;
      default:
        // Événement non géré — acquitter sans erreur
        break;
    }

    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    console.error(`[stripe-webhook] Erreur traitement ${event.type}:`, err);
    // Supprime la ligne de dédup pour laisser Stripe rejouer l'événement plutôt
    // que d'acquitter silencieusement un traitement (donc une facturation) échoué.
    await prisma.stripeWebhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
  eventDate: Date,
) {
  const { tenantId, plan: planKey, billingCycle } = session.metadata ?? {};
  if (!tenantId || typeof tenantId !== "string" || tenantId.length > 64) return;
  if (!planKey) return;

  const plan = toPrismaPlan(planKey);
  if (!plan) {
    console.error(`[stripe-webhook] Plan inconnu dans metadata: ${planKey}`);
    return;
  }

  const validBillingCycle: BillingCycle =
    billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : undefined;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : undefined;

  // `session.subscription` n'est qu'un ID string dans le payload webhook — le statut
  // réel (trialing/active/…) nécessite un appel API. Échec local, jamais de throw :
  // un throw ferait rejouer Stripe et dupliquerait cet AuditLog. Le statut sera de
  // toute façon synchronisé par le prochain `customer.subscription.updated`.
  let subscriptionStatus: Stripe.Subscription.Status | null = null;
  if (stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      subscriptionStatus = subscription.status;
    } catch (err) {
      console.error(
        `[stripe-webhook] subscriptions.retrieve a échoué pour ${stripeSubscriptionId}:`,
        err,
      );
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "CHECKOUT_SUBSCRIPTION_RETRIEVE_FAILED",
          entityType: "Tenant",
          entityId: tenantId,
          details: {
            stripeSubscriptionId,
            error: err instanceof Error ? err.message : String(err),
          } as PrismaTypes.InputJsonValue,
        },
      });
    }
  }

  // Champs d'identité/plan — toujours sûrs à écrire, aucune garde temporelle requise
  // (ce ne sont pas des transitions de statut, un rejeu tardif ne peut pas les faire
  // régresser dangereusement).
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      billingCycle: validBillingCycle,
      stripeCustomerId,
      stripeSubscriptionId,
    },
  });

  // Écriture du statut — gardée par tryTransition comme les autres handlers (même
  // classe de défaut que handleSubscriptionDeleted avant son fix H3 : un rejeu tardif
  // de checkout.session.completed ne doit pas pouvoir écraser un tenant déjà CANCELLED
  // entre-temps). Ne pose ACTIVE que pour le repli sans période d'essai — le cas
  // `trialing` est laissé à `customer.subscription.updated` (parcours avec essai,
  // introduit en 4.2, pas encore exerçable aujourd'hui).
  if (subscriptionStatus === "active") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true },
    });
    if (tenant) {
      await tryTransition(tenant, "ACTIVE", ["TRIAL", "PAST_DUE", "SUSPENDED"], eventId, eventDate);
    }
  }

  // Aujourd'hui (avant 4.2 / `trial_period_days`), un Checkout sans essai passe
  // directement `active` — Stripe émet alors `customer.subscription.created`, jamais
  // `updated`. Sans cet appel ici, le forfait de lancement ne se déclencherait jamais
  // sur le seul parcours actuellement exerçable. Idempotent (claim `setupFeeCharged`
  // + guard `plan === "COY"` dans setup-fee.ts) — sûr même si 4.2 fait aussi
  // converger ce tenant vers `customer.subscription.updated` plus tard.
  if (subscriptionStatus === "active" && stripeCustomerId) {
    await createSetupFeeInvoiceItem(stripe, stripeCustomerId, tenantId, plan, validBillingCycle);
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "CHECKOUT_SESSION_COMPLETED",
      entityType: "Tenant",
      entityId: tenantId,
      details: {
        plan,
        billingCycle: validBillingCycle,
        checkoutSessionId: session.id,
        subscriptionStatus,
      } as PrismaTypes.InputJsonValue,
    },
  });

  const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
  if (alertEmail) {
    await sendSystemEmail({
      to: alertEmail,
      subject: `[WinBack] Nouvel abonnement — ${plan} ${validBillingCycle}`,
      html: `
        <h2 style="color:#2563eb">🎉 Nouvel abonnement WinBack</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 8px;font-weight:bold">Tenant</td><td style="padding:4px 8px">${escapeHtml(tenantId)}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold">Plan</td><td style="padding:4px 8px">${plan}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold">Cycle</td><td style="padding:4px 8px">${validBillingCycle}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold">Session</td><td style="padding:4px 8px">${escapeHtml(session.id)}</td></tr>
        </table>
      `,
    });
  }
}

// ─── customer.subscription.updated — table de transition (Plan A, round 3) ─────
//
// N'écoute que `subscription.status`, jamais `cancel_at_period_end` : un abonnement
// avec ce flag reste actif et payé jusqu'à la fin de la période — seul l'événement
// `subscription.deleted` (ou un `updated` portant `status: "canceled"`) doit poser
// CANCELLED. `unpaid` (retries de recouvrement épuisés) → SUSPENDED, jamais PAST_DUE
// (PAST_DUE donne un accès complet au produit — send-scheduled.ts, [id]/send/route.ts,
// generate/route.ts whitelistent tous les trois PAST_DUE).
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventId: string,
  eventDate: Date,
) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true, status: true, plan: true, billingCycle: true, stripeCustomerId: true },
  });
  if (!tenant) return;

  switch (subscription.status) {
    case "active": {
      // SUSPENDED inclus : un tenant unpaid qui régularise son paiement doit pouvoir
      // redevenir ACTIVE automatiquement (sinon cul-de-sac nécessitant une
      // intervention manuelle — cf. handleInvoicePaid, même garde élargie).
      await tryTransition(tenant, "ACTIVE", ["TRIAL", "PAST_DUE", "SUSPENDED"], eventId, eventDate);
      // Appel INCONDITIONNEL au résultat de tryTransition : la vraie garde
      // d'idempotence est le claim atomique `setupFeeCharged` dans setup-fee.ts, pas
      // la transition de statut. Si `tryTransition` échoue (événement rejoué après
      // que le statut a déjà changé par un autre chemin), le forfait doit quand même
      // être tenté — sinon un rejeu Stripe post-échec ne le rattrape plus jamais.
      if (tenant.stripeCustomerId) {
        await createSetupFeeInvoiceItem(
          stripe,
          tenant.stripeCustomerId,
          tenant.id,
          tenant.plan,
          tenant.billingCycle,
        );
      }
      break;
    }
    case "past_due":
      await tryTransition(tenant, "PAST_DUE", ["TRIAL", "ACTIVE"], eventId, eventDate);
      break;
    case "unpaid":
      await tryTransition(tenant, "SUSPENDED", ["ACTIVE", "PAST_DUE"], eventId, eventDate);
      break;
    case "canceled":
      await tryTransition(
        tenant,
        "CANCELLED",
        ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"],
        eventId,
        eventDate,
      );
      break;
    default:
      // trialing, incomplete, incomplete_expired, paused — no-op, pas de garde nécessaire
      break;
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string,
  eventDate: Date,
) {
  // Résolution primaire par stripeSubscriptionId (aligné avec handleSubscriptionUpdated) :
  // un abonnement créé sans metadata (ex: Dashboard Stripe manuel) rendait une
  // résiliation silencieusement sans effet avec la résolution par metadata seule.
  let tenant = await prisma.tenant.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true, status: true },
  });

  if (!tenant) {
    const tenantId = subscription.metadata?.tenantId;
    if (tenantId && typeof tenantId === "string" && tenantId.length <= 64) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, status: true },
      });
    }
  }

  if (!tenant) return;

  // Gardé par lastBillingEventAt (comme les autres transitions) : un `deleted` ancien
  // rejoué par Stripe (rejeu jusqu'à ~3j) ne doit pas résilier un tenant qui s'est
  // réabonné entre-temps sous un nouveau stripeSubscriptionId — cas concret via le
  // repli metadata.tenantId, qui retrouve le tenant même après un changement d'ID.
  const applied = await tryTransition(
    tenant,
    "CANCELLED",
    ["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"],
    eventId,
    eventDate,
  );
  if (!applied) return;

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "SUBSCRIPTION_CANCELLED",
      entityType: "Tenant",
      entityId: tenant.id,
      details: {
        subscriptionId: subscription.id,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      } as PrismaTypes.InputJsonValue,
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventId: string, eventDate: Date) {
  // Chercher le tenant par stripeCustomerId
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  if (!stripeCustomerId) return;

  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId },
    select: {
      id: true,
      name: true,
      status: true,
      users: { select: { email: true }, take: 1 },
    },
  });
  if (!tenant) return;

  // Gardé par lastBillingEventAt : un rejeu désordonné (ex: un événement plus ancien
  // livré après coup) ne doit pas rétrograder un tenant déjà remis ACTIVE entre-temps.
  const applied = await tryTransition(tenant, "PAST_DUE", ["TRIAL", "ACTIVE"], eventId, eventDate);
  if (!applied) return;

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "PAYMENT_FAILED",
      entityType: "Tenant",
      entityId: tenant.id,
      details: {
        invoiceId: invoice.id,
        amountDue: invoice.amount_due / 100,
        currency: invoice.currency,
      } as PrismaTypes.InputJsonValue,
    },
  });

  const amountFormatted = `${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`;
  const adminEmail = tenant.users[0]?.email;

  // Notifier l'admin du tenant
  if (adminEmail) {
    await sendSystemEmail({
      to: adminEmail,
      subject: "⚠️ Problème de paiement WinBack — action requise",
      html: `
        <h2 style="color:#dc2626">⚠️ Votre paiement WinBack a échoué</h2>
        <p>Bonjour,</p>
        <p>Le prélèvement de <strong>${escapeHtml(amountFormatted)}</strong> pour votre abonnement WinBack n'a pas pu être effectué.</p>
        <p>Pour éviter toute interruption de service, veuillez mettre à jour votre moyen de paiement dans votre espace client.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:6px">Mettre à jour mon paiement</a></p>
        <p style="color:#6b7280;font-size:12px">Référence : ${escapeHtml(invoice.id)}</p>
      `,
    });
  }

  // Notifier la fondatrice
  const alertEmail = process.env.INTERNAL_ALERT_EMAIL;
  if (alertEmail) {
    const safeTenantName = escapeHtml(tenant.name ?? tenant.id);
    await sendSystemEmail({
      to: alertEmail,
      subject: `[WinBack] Paiement échoué — ${tenant.name ?? tenant.id}`,
      html: `
        <h2 style="color:#dc2626">⚠️ Paiement échoué</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:4px 8px;font-weight:bold">Tenant</td><td style="padding:4px 8px">${safeTenantName}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold">Montant</td><td style="padding:4px 8px">${escapeHtml(amountFormatted)}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold">Invoice</td><td style="padding:4px 8px">${escapeHtml(invoice.id)}</td></tr>
        </table>
      `,
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice, eventId: string, eventDate: Date) {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  if (!stripeCustomerId) return;

  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId },
    select: { id: true, name: true, status: true },
  });
  if (!tenant) return;

  // Remettre le statut à ACTIVE si PAST_DUE ou SUSPENDED (recouvrement — un tenant
  // unpaid qui régularise ne doit pas rester bloqué sans intervention manuelle) —
  // gardé par lastBillingEventAt, mais son résultat ne conditionne JAMAIS l'upsert
  // Invoice ci-dessous (génération Factur-X = obligation légale, jamais skippée).
  if (tenant.status === "PAST_DUE" || tenant.status === "SUSPENDED") {
    await tryTransition(tenant, "ACTIVE", ["PAST_DUE", "SUSPENDED"], eventId, eventDate);
  }

  // Calcul des montants — TVA extraite depuis total_taxes ou calculée à 20%
  const amountTtcCents = invoice.amount_paid;
  const totalTaxCents = invoice.total_taxes?.reduce((sum, t) => sum + t.amount, 0) ?? null;
  const amountTvaCents = totalTaxCents ?? Math.round((amountTtcCents * 20) / 120);
  const amountHtCents = amountTtcCents - amountTvaCents;

  const invoiceNumber = invoice.number ?? `INV-${invoice.id}`;

  // Générer le XML Factur-X MINIMUM avant l'upsert
  const facturxXml = generateFacturxXml({
    invoiceNumber,
    issueDate: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
    sellerName: "CoYia SAS",
    buyerName: tenant.name,
    amountHt: amountHtCents / 100,
    amountTva: amountTvaCents / 100,
    amountTtc: amountTtcCents / 100,
    currency: invoice.currency.toUpperCase(),
  });

  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      tenantId: tenant.id,
      stripeInvoiceId: invoice.id,
      number: invoiceNumber,
      status: "PAID",
      amountHt: amountHtCents / 100,
      amountTva: amountTvaCents / 100,
      amountTtc: amountTtcCents / 100,
      currency: invoice.currency.toUpperCase(),
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
      pdfUrl: invoice.invoice_pdf ?? null,
      facturxXml,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
    update: {
      status: "PAID",
      pdfUrl: invoice.invoice_pdf ?? undefined,
      facturxXml,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "INVOICE_PAID",
      entityType: "Invoice",
      entityId: invoice.id,
      details: {
        invoiceNumber,
        amountTtc: amountTtcCents / 100,
        currency: invoice.currency,
      } as PrismaTypes.InputJsonValue,
    },
  });
}
