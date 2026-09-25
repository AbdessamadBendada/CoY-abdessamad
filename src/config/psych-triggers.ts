// Triggers psychologiques disponibles par palier — source unique.
// Importé par generate/route.ts, send-scheduled.ts et settings/scenarios/preview/route.ts
// pour garantir que l'aperçu et l'envoi réel utilisent toujours le même jeu de triggers.

import { TRIGGER_ID_ALLOWLIST } from "@/types/scenarios";

export const PLAN_PSYCH_TRIGGERS: Record<string, string[]> = {
  ESSENTIEL: ["loss_aversion", "reciprocite"], // @deprecated 2026-09-05 — palier unique CoY
  STARTER: ["loss_aversion", "reciprocite", "urgence"], // @deprecated 2026-09-05 — idem
  CROISSANCE: ["loss_aversion", "reciprocite", "urgence", "social_proof", "ancrage_prix"], // @deprecated 2026-09-05 — idem
  EXPERT: [
    "loss_aversion",
    "reciprocite",
    "urgence",
    "social_proof",
    "ancrage_prix",
    "rarete",
    "personnalisation_ton",
  ], // @deprecated 2026-09-05 — idem
  // Palier unique CoY : les 7 triggers, dérivés de l'allowlist unique anti-injection
  // (TRIGGER_ID_ALLOWLIST) plutôt que dupliqués ici — Plan A (05/09/2026)
  COY: [...TRIGGER_ID_ALLOWLIST],
};
