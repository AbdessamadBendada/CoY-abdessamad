import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { scoreConversation } from "@/lib/ai/agents";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

// ─── Rate limiting par tenant ──────────────────────────────────────────────────
// Max 10 appels par minute par tenant — même protection que /api/v1/actions/generate
// (chaque appel déclenche Claude ~0.05€/req → risque financier direct)

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

async function checkRateLimit(tenantId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.auditLog.count({
    where: {
      tenantId,
      action: "SCORING_COMPLETED",
      createdAt: { gte: since },
    },
  });
  return recentCount < RATE_LIMIT_MAX_REQUESTS;
}

// ─── Authentification par API key ─────────────────────────────────────────────

function authenticate(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const apiKey = process.env.SCORING_API_KEY;
  if (!apiKey) {
    console.error("[scoring] SCORING_API_KEY non défini dans les variables d'environnement");
    return false;
  }
  const expected = `Bearer ${apiKey}`;
  // timingSafeEqual obligatoire — évite les timing attacks sur la clé API
  if (!auth || auth.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Schéma de la requête ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().min(1),
  conversationId: z.string().optional(),
  messages: z
    .array(
      z.object({
        sender: z.enum(["CUSTOMER", "AGENT", "SYSTEM"]),
        content: z.string().min(1),
      })
    )
    .min(1, "Au moins un message requis"),
  // Variables comportementales optionnelles (calculées par n8n avant l'appel)
  averageBasket: z.number().nonnegative().optional(),
  daysSinceLastOrder: z.number().int().nonnegative().optional(),
  orderFrequencyPerMonth: z.number().nonnegative().optional(),
  // Variables comportementales avancées (depuis la table orders)
  recentOrderAmounts: z.array(z.number().nonnegative()).max(3).optional(),
  returnRate: z.number().min(0).max(1).optional(),
});

// ─── POST /api/v1/scoring ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  if (!authenticate(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { tenantId, customerId, conversationId, messages, averageBasket, daysSinceLastOrder, orderFrequencyPerMonth, recentOrderAmounts, returnRate } = parsed.data;

  // ── Rate limiting (avant tout appel Claude) ───────────────────────────────────
  const withinLimit = await checkRateLimit(tenantId);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessayez dans une minute" },
      { status: 429 }
    );
  }

  // Vérifier que le tenant existe
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, settings: true, sector: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  // Récupérer le client
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      ltv: true,
      totalOrders: true,
      totalSpent: true,
      lastOrderAt: true,
      churnScore: true,
      cooldownUntil: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  // Vérifier le cooldown
  const isInCooldown =
    customer.cooldownUntil !== null &&
    new Date(customer.cooldownUntil) > new Date();

  // ── Appel Claude ────────────────────────────────────────────────────────────
  let result;
  try {
    result = await scoreConversation(messages, {
      firstName: customer.firstName,
      lastName: customer.lastName,
      ltv: parseFloat(customer.ltv.toString()),
      totalOrders: customer.totalOrders,
      totalSpent: parseFloat(customer.totalSpent.toString()),
      lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
      previousChurnScore: customer.churnScore,
      tenantSector: tenant.sector,
      averageBasket,
      daysSinceLastOrder,
      orderFrequencyPerMonth,
      recentOrderAmounts,
      returnRate,
    });
  } catch (err) {
    console.error("[scoring] Erreur Claude API :", err);
    return NextResponse.json(
      { error: "Erreur du moteur d'analyse IA" },
      { status: 500 }
    );
  }

  // ── Mise à jour Prisma ──────────────────────────────────────────────────────
  const now = new Date();

  await prisma.customer.update({
    where: { id: customerId },
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

  if (conversationId) {
    await prisma.conversation.updateMany({
      where: { id: conversationId, tenantId },
      data: {
        sentimentScore: result.sentimentScore,
        sentimentLabel: result.sentimentLabel,
        insatisfactionDetected: result.insatisfactionDetected,
        analyzedAt: now,
      },
    });
  }

  // ── Log audit ───────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "SCORING_COMPLETED",
      entityType: "Customer",
      entityId: customerId,
      details: {
        churnScore: result.churnScore,
        churnRisk: result.churnRisk,
        insatisfactionDetected: result.insatisfactionDetected,
        aiModelUsed: result.aiModelUsed,
      } as Prisma.InputJsonValue,
    },
  });

  // ── Réponse ─────────────────────────────────────────────────────────────────
  return NextResponse.json({
    customerId,
    churnScore: result.churnScore,
    churnRisk: result.churnRisk,
    sentimentScore: result.sentimentScore,
    sentimentLabel: result.sentimentLabel,
    insatisfactionDetected: result.insatisfactionDetected,
    triggers: result.triggers,
    reasoning: result.reasoning,
    shouldTriggerAction: result.insatisfactionDetected && !isInCooldown,
    isInCooldown,
    scoredAt: now.toISOString(),
  });
}
