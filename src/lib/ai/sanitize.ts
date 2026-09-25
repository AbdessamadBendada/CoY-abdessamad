// ─── Protection contre l'injection de prompt (Prompt Injection Guard) ────────
//
// Filtre le contenu utilisateur AVANT de l'injecter dans un prompt Claude.
// Ordre critique : filtrer AVANT de tronquer (sinon l'injection pourrait être
// placée juste après la troncature et échapper au filtre).

// Patterns d'injection connus — ordre du plus spécifique au plus général
const INJECTION_PATTERNS: RegExp[] = [
  // Override d'instructions direct
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /oublie\s+(toutes?\s+)?(les\s+)?instructions?\s+précédentes?/gi,
  /ignore\s+(toutes?\s+)?(les\s+)?instructions?\s+précédentes?/gi,

  // Tentatives de roleplay/persona
  /act\s+as\s+(if\s+you\s+are\s+)?[a-z\s]{1,30}(with\s+no\s+restrictions?)?/gi,
  /you\s+are\s+now\s+(a\s+)?[a-z\s]{1,30}(without\s+any\s+restrictions?)?/gi,
  /tu\s+es\s+maintenant\s+un/gi,

  // Injections de rôles système
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|system\|>/gi,
  /<\|user\|>/gi,
  /<\|assistant\|>/gi,

  // Tentatives d'extraction de données
  /print\s+(all|every|the)\s+(previous|prior|secret|confidential)/gi,
  /reveal\s+(the\s+)?(system\s+)?prompt/gi,
  /show\s+(me\s+)?(your\s+)?(full\s+)?(system\s+)?prompt/gi,

  // Template injection (nos propres placeholders — un attaquant pourrait tenter d'injecter {{OPT_OUT_URL}})
  /\{\{[A-Z_]{2,30}\}\}/g,
];

const MAX_CONTENT_LENGTH = 2000; // caractères max par message

/**
 * Nettoie un texte utilisateur avant injection dans un prompt Claude.
 * - Supprime les patterns d'injection connus
 * - Tronque à MAX_CONTENT_LENGTH
 */
export function sanitizeForAI(text: string): string {
  if (!text || typeof text !== "string") return "";

  let sanitized = text;

  // Filtrer les patterns d'injection AVANT la troncature
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[contenu filtré]");
  }

  // Tronquer après filtrage
  if (sanitized.length > MAX_CONTENT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_CONTENT_LENGTH) + "…";
  }

  return sanitized;
}
