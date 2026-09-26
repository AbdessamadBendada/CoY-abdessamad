import { trackClaude } from "@/features/scoring/ai/claude-client";
import { sanitizeForAI } from "@/features/scoring/ai/sanitize";
import { SECTOR_MODE, SECTOR_SPORT, SECTOR_DECORATION } from "@/config/sectors";

const MODEL = "mistral-large-latest";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringMessage {
  sender: "CUSTOMER" | "AGENT" | "SYSTEM";
  content: string;
}

export interface ScoringCustomerContext {
  firstName: string | null;
  lastName: string | null;
  ltv: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  previousChurnScore: number | null;
  // Secteur de la boutique (ADR-018 — Mode · Sport & Outdoor · Décoration · Autre)
  tenantSector?: string | null;
  // Variables comportementales (optionnelles — calculées avant l'appel)
  averageBasket?: number;
  daysSinceLastOrder?: number;
  orderFrequencyPerMonth?: number;
  // Variables comportementales avancées (calculées depuis la table orders)
  recentOrderAmounts?: number[];  // montants des 3 dernières commandes
  returnRate?: number;            // taux de retour 0.0 à 1.0
  // Variables service client (optionnelles — calculées depuis la table Conversation)
  conversations30d?: number;      // nb de conversations ouvertes sur 30 jours
  unresolvedCount?: number;       // conversations encore ouvertes (non résolues)
  avgResolutionTimeHours?: number; // temps de résolution moyen en heures
}

// ─── Signaux churn sectoriels (ADR-018 — SKILL-Scoring-WinBack.md) ────────────

function getSectorChurnSignals(sector: string): string {
  const signals: Record<string, string> = {
    [SECTOR_MODE]: [
      "Signaux churn sectoriels Mode :",
      "- Taux de retour élevé sur un article (taille/coupe non conforme)",
      "- Ticket 'qualité décevante' (matière, finition) non suivi d'un geste commercial",
      "- Silence après un retour effectué (pas de nouvelle interaction sous 15j)",
      "- Non-réengagement après une collection saisonnière",
      "Drivers à générer : 'Retour sans réponse depuis X jours', 'Ticket qualité non résolu'",
    ].join("\n"),
    [SECTOR_SPORT]: [
      "Signaux churn sectoriels Sport / Outdoor :",
      "- Client mono-achat équipement (skis, vélo) sans retour sur accessoires/consommables",
      "- Ticket 'produit défectueux' résolu sans compensation → risque élevé",
      "- Inactivité inter-saisons (ex: pas d'achat trail/vélo après saison ski)",
      "- Panier: détecter achat équipement seul (sans gants, lunettes, etc.)",
      "Drivers à générer : 'Achat équipement sans accessoires associés', 'Inactivité 6 mois post-achat ski'",
    ].join("\n"),
    [SECTOR_DECORATION]: [
      "Signaux churn sectoriels Décoration :",
      "- Ticket 'colis abîmé' sur pièce volumineuse sans compensation → impact direct confiance",
      "- Retard de livraison signalé sur commande sur mesure ou grande pièce",
      "- Ticket 'difficulté de montage' non suivi d'une notice ou d'un accompagnement",
      "- Fréquence d'achat naturellement faible (catégorie non récurrente) — ne pas traiter le silence comme un signal isolé de désengagement",
      "Drivers à générer : 'Réclamation sans réponse depuis X jours', 'Ticket montage non résolu'",
    ].join("\n"),
  };
  return Object.hasOwn(signals, sector)
    ? signals[sector]
    : "Contexte : e-commerce généraliste — appliquer signaux RFM standard.";
}

export interface ScoringResult {
  churnScore: number;
  churnRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sentimentScore: number;
  sentimentLabel:
    | "VERY_NEGATIVE"
    | "NEGATIVE"
    | "NEUTRAL"
    | "POSITIVE"
    | "VERY_POSITIVE";
  insatisfactionDetected: boolean;
  triggers: string[];
  reasoning: string;
  aiModelUsed: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(
  messages: ScoringMessage[],
  customer: ScoringCustomerContext
): string {
  const customerName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    "Inconnu";

  const conversation = messages
    .map((m) => `[${m.sender}]: ${sanitizeForAI(m.content)}`)
    .join("\n");

  // Section comportementale (affichée uniquement si au moins un champ est disponible)
  const hasBehavioral =
    customer.daysSinceLastOrder != null ||
    customer.orderFrequencyPerMonth != null ||
    customer.averageBasket != null ||
    (customer.recentOrderAmounts != null && customer.recentOrderAmounts.length > 0) ||
    customer.returnRate != null;

  const behavioralSection = hasBehavioral
    ? `
=== COMPORTEMENT D'ACHAT ===
Jours depuis dernière commande : ${customer.daysSinceLastOrder != null ? customer.daysSinceLastOrder + " jours" : "inconnu"}
Fréquence d'achat : ${customer.orderFrequencyPerMonth != null ? customer.orderFrequencyPerMonth.toFixed(2) + " commandes/mois" : "inconnue"}
Panier moyen : ${customer.averageBasket != null ? customer.averageBasket + "€" : "inconnu"}
Montants 3 dernières commandes : ${customer.recentOrderAmounts?.length ? customer.recentOrderAmounts.map((a) => a + "€").join(", ") : "inconnu"}
Taux de retour : ${customer.returnRate != null ? (customer.returnRate * 100).toFixed(1) + "%" : "inconnu"}`
    : "";

  // Section service client (affichée uniquement si au moins un champ est disponible)
  const hasServiceData =
    customer.conversations30d != null ||
    customer.unresolvedCount != null ||
    customer.avgResolutionTimeHours != null;

  const serviceSection = hasServiceData
    ? `
=== SERVICE CLIENT ===
Conversations ouvertes (30 derniers jours) : ${customer.conversations30d ?? "inconnu"}
Conversations non résolues : ${customer.unresolvedCount ?? "inconnu"}
Temps de résolution moyen : ${customer.avgResolutionTimeHours != null ? customer.avgResolutionTimeHours + "h" : "inconnu"}`
    : "";

  const sectorSection = customer.tenantSector
    ? `\n=== SECTEUR DE LA BOUTIQUE ===\n${getSectorChurnSignals(customer.tenantSector)}`
    : "";

  return `Vous êtes un expert en analyse du risque de churn pour le e-commerce français.

Analysez la conversation de service client ci-dessous et évaluez le risque que ce client ne revienne plus jamais acheter sur la boutique.

=== CONTEXTE CLIENT ===
Nom : ${customerName}
LTV : ${customer.ltv}€
Nombre de commandes : ${customer.totalOrders}
CA total : ${customer.totalSpent}€
Dernière commande : ${customer.lastOrderAt ?? "inconnue"}
Score churn précédent : ${customer.previousChurnScore !== null ? customer.previousChurnScore : "aucun (premier scoring)"}
${behavioralSection}
${serviceSection}
${sectorSection}

=== CONVERSATION ===
${conversation}

=== INSTRUCTIONS ===
Retournez UNIQUEMENT un objet JSON valide (sans markdown, sans explication) avec ces champs :
{
  "churnScore": <entier 0-100>,
  "churnRisk": <"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">,
  "sentimentScore": <décimal -1.0 à 1.0>,
  "sentimentLabel": <"VERY_NEGATIVE" | "NEGATIVE" | "NEUTRAL" | "POSITIVE" | "VERY_POSITIVE">,
  "insatisfactionDetected": <true | false>,
  "triggers": [<liste de signaux détectés en français>],
  "reasoning": <explication concise en français, max 120 mots>
}

Grille de scoring :
- CRITICAL (85-100) : client furieux, menace explicite de partir, demande de remboursement total, ton agressif
- HIGH (60-84) : fort mécontentement, doutes exprimés sur la boutique, insatisfaction non résolue
- MEDIUM (40-59) : insatisfaction modérée, question sans réponse satisfaisante, frustration contenue
- LOW (0-39) : situation résolue, ton neutre ou positif, client satisfait de la réponse

Signaux comportementaux à pondérer fortement (section COMPORTEMENT D'ACHAT) :
- Délai depuis la dernière commande nettement supérieur à la fréquence habituelle → risque élevé
- Fréquence d'achat en baisse → signal de désengagement progressif
- Panier moyen anormalement bas pour la LTV du client → possible perte de confiance
- Montants des 3 dernières commandes en baisse progressive → désengagement financier
- Taux de retour supérieur à 30% → signal fort d'insatisfaction produit récurrente

Signaux service client à pondérer (section SERVICE CLIENT) :
- Conversations non résolues > 2 → insatisfaction structurelle, risque élevé
- Temps de résolution moyen > 48h → friction service client, corrélé au churn
- Volume de conversations 30j élevé → multiplication des incidents, signal d'alerte`;
}

// ─── Scoring function ─────────────────────────────────────────────────────────

function mapToChurnRisk(
  score: number
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 85) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export async function scoreConversation(
  messages: ScoringMessage[],
  customer: ScoringCustomerContext
): Promise<ScoringResult> {
  const prompt = buildPrompt(messages, customer);

  const response = await trackClaude(
    { model: MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] },
    { agentName: "scoring-agent", metadata: { customerName: customer.firstName } }
  );

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Réponse Mistral inattendue (type non texte)");
  }

  // Extract JSON — Mistral might wrap it in ```json ... ``` blocks
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Pas de JSON valide dans la réponse Mistral : ${content.text.slice(0, 200)}`
    );
  }

  let parsed: Omit<ScoringResult, "aiModelUsed">;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`JSON malformé dans la réponse Mistral : ${jsonMatch[0].slice(0, 200)}`);
  }

  // Validate and clamp values
  const churnScore = Math.max(0, Math.min(100, Math.round(Number(parsed.churnScore) || 0)));
  const sentimentScore = Math.max(-1, Math.min(1, Number(parsed.sentimentScore) || 0));

  return {
    churnScore,
    churnRisk: parsed.churnRisk ?? mapToChurnRisk(churnScore),
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    sentimentLabel: parsed.sentimentLabel ?? "NEUTRAL",
    insatisfactionDetected: Boolean(parsed.insatisfactionDetected),
    triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
    reasoning: parsed.reasoning ?? "",
    aiModelUsed: MODEL,
  };
}
