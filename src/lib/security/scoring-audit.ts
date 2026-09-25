/**
 * scoring-audit.ts
 * Outil d'audit de la qualité des données de scoring churn.
 * Vérifie que les 10 variables sont alimentées par des données réelles
 * (Shopify/PrestaShop/Gorgias) et jamais hardcodées.
 *
 * Ce fichier est un outil de diagnostic — il ne remplace pas le scoring Claude.
 * Le score churn réel est calculé par Claude et stocké dans Customer.churnScore.
 *
 * @see TECHNICAL_SPEC_V1.1 Section 3 — Modèle de Scoring de Churn
 */

import { prisma } from "@/lib/prisma";
import { computeOrderVariables } from "@/lib/customers/compute-order-variables";
import { computeServiceVariables } from "@/lib/customers/compute-service-variables";

// ============================================================
// TYPES
// ============================================================

export type ScoringVariableName =
  | "sentimentScore"
  | "churnSignals"
  | "daysSinceLastOrder"
  | "orderFrequencyDeviation"
  | "avgOrderValueTrend"
  | "returnRate"
  | "conversations30d"
  | "unresolvedCount"
  | "avgResolutionTimeHours"
  | "customRiskFactors";

export type DataQuality = "REAL" | "ESTIMATED" | "MISSING";

export interface ScoringVariableRecord {
  variable: ScoringVariableName;
  weight: number;
  rawValue: number | undefined;
  source: string;
  dataQuality: DataQuality;
}

export interface ScoringAuditResult {
  tenantId: string;
  customerId: string;
  auditedAt: Date;
  currentChurnScore: number | null;
  currentChurnRisk: string | null;
  variables: Record<ScoringVariableName, ScoringVariableRecord>;
  dataCompletenessScore: number; // 0-100 : % de variables avec données RÉELLES
  missingVariables: ScoringVariableName[];
  estimatedVariables: ScoringVariableName[];
  realVariables: ScoringVariableName[];
}

// Poids conformes Spec V1.1 Section 3.1 (total = 100)
const SCORING_WEIGHTS: Record<ScoringVariableName, number> = {
  sentimentScore: 20,
  churnSignals: 15,
  daysSinceLastOrder: 15,
  orderFrequencyDeviation: 10,
  avgOrderValueTrend: 8,
  returnRate: 7,
  conversations30d: 10,
  unresolvedCount: 8,
  avgResolutionTimeHours: 7,
  customRiskFactors: 0, // réservé extensibilité future
};

// Vérification intégrité à l'import
const TOTAL_WEIGHT = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
if (TOTAL_WEIGHT !== 100) {
  throw new Error(`[scoring-audit] Poids invalides : total ${TOTAL_WEIGHT} !== 100`);
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

/**
 * Audite la qualité des données de scoring pour un client.
 * Récupère les 10 variables depuis la DB (données issues des webhooks réels).
 * Rapporte lesquelles sont REAL / ESTIMATED / MISSING.
 *
 * @param tenantId  - Isolation multi-tenant OBLIGATOIRE
 * @param customerId - Client à auditer
 */
export async function auditCustomerScoring(
  tenantId: string,
  customerId: string
): Promise<ScoringAuditResult> {
  // ── Vérification tenant ──────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error(`[scoring-audit] Tenant ${tenantId} introuvable`);

  // ── Vérification appartenance client au tenant ───────────────
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer || customer.tenantId !== tenantId) {
    throw new Error(
      `[scoring-audit] Customer ${customerId} n'appartient pas au tenant ${tenantId}`
    );
  }

  const auditedAt = new Date();
  const variables = {} as Record<ScoringVariableName, ScoringVariableRecord>;

  // ── Récupération données réelles ─────────────────────────────

  // 1. sentimentScore (20 pts) — depuis les conversations Gorgias
  const negativeConversations = await prisma.conversation.count({
    where: {
      customerId,
      tenantId,
      sentimentLabel: { in: ["VERY_NEGATIVE", "NEGATIVE"] },
    },
  });
  const totalConversationsForSentiment = await prisma.conversation.count({
    where: { customerId, tenantId, sentimentLabel: { not: null } },
  });
  const hasSentimentData = totalConversationsForSentiment > 0;
  variables.sentimentScore = {
    variable: "sentimentScore",
    weight: SCORING_WEIGHTS.sentimentScore,
    rawValue: hasSentimentData
      ? negativeConversations / totalConversationsForSentiment
      : undefined,
    source: "Gorgias (Conversation.sentimentLabel)",
    dataQuality: hasSentimentData ? "REAL" : "MISSING",
  };

  // 2. churnSignals (15 pts) — conversations avec insatisfaction détectée
  const churnSignalCount = await prisma.conversation.count({
    where: { customerId, tenantId, insatisfactionDetected: true },
  });
  const hasConversations = await prisma.conversation.count({ where: { customerId, tenantId } });
  variables.churnSignals = {
    variable: "churnSignals",
    weight: SCORING_WEIGHTS.churnSignals,
    rawValue: churnSignalCount,
    source: "Gorgias (Conversation.insatisfactionDetected)",
    dataQuality: hasConversations > 0 ? "REAL" : "MISSING",
  };

  // 3. daysSinceLastOrder (15 pts) — depuis Customer.lastOrderAt
  const daysSinceLastOrder = customer.lastOrderAt
    ? Math.floor((Date.now() - customer.lastOrderAt.getTime()) / 86_400_000)
    : undefined;
  variables.daysSinceLastOrder = {
    variable: "daysSinceLastOrder",
    weight: SCORING_WEIGHTS.daysSinceLastOrder,
    rawValue: daysSinceLastOrder,
    source: "Shopify/PrestaShop (Customer.lastOrderAt)",
    dataQuality: customer.lastOrderAt ? "REAL" : "MISSING",
  };

  // 4-6. Variables commandes — computeOrderVariables (Spec V1.1)
  const orderVars = await computeOrderVariables(
    customerId,
    customer.totalOrders,
    tenantId,
    prisma
  );

  // 4. orderFrequencyDeviation (10 pts)
  const hasOrderHistory = orderVars.recentOrderAmounts.length > 0;
  variables.orderFrequencyDeviation = {
    variable: "orderFrequencyDeviation",
    weight: SCORING_WEIGHTS.orderFrequencyDeviation,
    rawValue: hasOrderHistory ? orderVars.recentOrderAmounts.length : undefined,
    source: "Shopify/PrestaShop (Order table)",
    dataQuality: hasOrderHistory ? "REAL" : customer.totalOrders > 0 ? "ESTIMATED" : "MISSING",
  };

  // 5. avgOrderValueTrend (8 pts)
  const avgOrderValue =
    orderVars.recentOrderAmounts.length > 0
      ? orderVars.recentOrderAmounts.reduce((a, b) => a + b, 0) /
        orderVars.recentOrderAmounts.length
      : undefined;
  variables.avgOrderValueTrend = {
    variable: "avgOrderValueTrend",
    weight: SCORING_WEIGHTS.avgOrderValueTrend,
    rawValue: avgOrderValue,
    source: "Shopify/PrestaShop (Order.amount)",
    dataQuality: avgOrderValue !== undefined ? "REAL" : "MISSING",
  };

  // 6. returnRate (7 pts) — JAMAIS hardcodé
  variables.returnRate = {
    variable: "returnRate",
    weight: SCORING_WEIGHTS.returnRate,
    rawValue: orderVars.returnRate,
    source: "Shopify/PrestaShop (Order.isReturn)",
    dataQuality: orderVars.returnRate !== undefined ? "REAL" : "MISSING",
  };

  // 7-9. Variables service client — computeServiceVariables (Spec V1.1)
  const serviceVars = await computeServiceVariables(customerId, tenantId, prisma);

  variables.conversations30d = {
    variable: "conversations30d",
    weight: SCORING_WEIGHTS.conversations30d,
    rawValue: serviceVars.conversations30d,
    source: "Gorgias (Conversation.createdAt 30j)",
    dataQuality: "REAL",
  };

  variables.unresolvedCount = {
    variable: "unresolvedCount",
    weight: SCORING_WEIGHTS.unresolvedCount,
    rawValue: serviceVars.unresolvedCount,
    source: "Gorgias (Conversation.status=OPEN)",
    dataQuality: "REAL",
  };

  // 9. avgResolutionTimeHours (7 pts) — JAMAIS hardcodé
  variables.avgResolutionTimeHours = {
    variable: "avgResolutionTimeHours",
    weight: SCORING_WEIGHTS.avgResolutionTimeHours,
    rawValue: serviceVars.avgResolutionTimeHours,
    source: "Gorgias (Conversation.closedAt)",
    dataQuality: serviceVars.avgResolutionTimeHours !== undefined ? "REAL" : "ESTIMATED",
  };

  // 10. customRiskFactors (0 pts — extensibilité future)
  variables.customRiskFactors = {
    variable: "customRiskFactors",
    weight: SCORING_WEIGHTS.customRiskFactors,
    rawValue: 0,
    source: "Réservé extensibilité",
    dataQuality: "ESTIMATED",
  };

  // ── Calcul completeness score ────────────────────────────────
  const scored = Object.values(variables);
  const realVariables = scored
    .filter((v) => v.dataQuality === "REAL" && v.weight > 0)
    .map((v) => v.variable);
  const estimatedVariables = scored
    .filter((v) => v.dataQuality === "ESTIMATED" && v.weight > 0)
    .map((v) => v.variable);
  const missingVariables = scored
    .filter((v) => v.dataQuality === "MISSING" && v.weight > 0)
    .map((v) => v.variable);

  // Completeness = somme des poids des variables REAL / 100
  const realWeightSum = realVariables.reduce(
    (sum, name) => sum + SCORING_WEIGHTS[name],
    0
  );
  const dataCompletenessScore = realWeightSum; // déjà sur 100 (poids totaux = 100)

  // ── Log AuditLog (AI Act — traçabilité immuable) ─────────────
  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "SCORING_AUDIT",
      entityType: "Customer",
      entityId: customerId,
      details: {
        auditedAt: auditedAt.toISOString(),
        currentChurnScore: customer.churnScore,
        dataCompletenessScore,
        realVariables,
        estimatedVariables,
        missingVariables,
      },
    },
  });

  console.info("[scoring-audit] Audit terminé", {
    tenantId,
    customerId,
    dataCompletenessScore,
    missingVariables,
  });

  return {
    tenantId,
    customerId,
    auditedAt,
    currentChurnScore: customer.churnScore,
    currentChurnRisk: customer.churnRisk,
    variables,
    dataCompletenessScore,
    realVariables,
    estimatedVariables,
    missingVariables,
  };
}

export default auditCustomerScoring;
