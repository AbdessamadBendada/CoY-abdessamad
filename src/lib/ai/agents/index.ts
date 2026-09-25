// ─── Pipeline d'agents IA — WinBack Agent ────────────────────────────────────
//
// Ordre d'exécution dans /api/v1/actions/generate :
//   1. decideActionTiming   → Timing Agent    : quand/quel canal envoyer
//   2. generateAction       → Message Agent   : génère le message personnalisé
//   3. moderateAction       → Modération Agent: vérifie + corrige RGPD 2026
//   4. scoreConversation    → Scoring Agent   : churn 0-100 (appelé par webhook)
//
// Import recommandé :
//   import { generateAction, moderateAction, decideActionTiming, scoreConversation } from "@/lib/ai/agents";

export { generateAction } from "./action-generation";
export type { ActionGenerationInput, ActionGenerationResult } from "./action-generation";

export { moderateAction } from "./moderation";
export type { ModerationInput, ModerationResult } from "./moderation";

export { decideActionTiming } from "./timing";
export type { TimingInput, TimingDecision, PreviousAction } from "./timing";

export { scoreConversation } from "./scoring";
export type { ScoringMessage, ScoringResult, ScoringCustomerContext } from "./scoring";
