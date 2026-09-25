// Closed enums for scenario configuration — all fields injected into prompts must come from these lists

export const TONE_VALUES = ["empathique", "empathique_urgent", "direct", "direct_urgent"] as const;
export type ToneType = (typeof TONE_VALUES)[number];

export const AUTO_SEND_MODE_VALUES = ["manual", "auto"] as const;
export type AutoSendMode = (typeof AUTO_SEND_MODE_VALUES)[number];

// Aligned with PromoType Prisma enum (PERCENTAGE, FIXED, FREE_SHIPPING)
export const COMPENSATION_TYPE_VALUES = [
  "discount_percent",
  "discount_fixed",
  "free_shipping",
] as const;
export type CompensationType = (typeof COMPENSATION_TYPE_VALUES)[number];

// Mapping to Prisma PromoType — not exposed in UI
export const COMPENSATION_TO_PROMO_TYPE: Record<
  CompensationType,
  "PERCENTAGE" | "FIXED" | "FREE_SHIPPING"
> = {
  discount_percent: "PERCENTAGE",
  discount_fixed: "FIXED",
  free_shipping: "FREE_SHIPPING",
};

// Closed allowlist — only these IDs are accepted in triggersConfig to block prompt injection
export const TRIGGER_ID_ALLOWLIST = [
  "loss_aversion",
  "reciprocite",
  "urgence",
  "social_proof",
  "ancrage_prix",
  "rarete",
  "personnalisation_ton",
] as const;
export type TriggerId = (typeof TRIGGER_ID_ALLOWLIST)[number];

// Scenario limits per plan — ADR-015 (21/06/2026) — supersède ADR-014
// Palier unique CoY depuis Plan A (05/09/2026) — COY est le défaut Prisma, y compris en trial
export const SCENARIO_LIMITS: Record<string, number> = {
  ESSENTIEL: 1, // @deprecated — supprimé de la grille commerciale le 09/06/2026
  STARTER: 5, // @deprecated 2026-09-05 — palier unique CoY
  CROISSANCE: 15, // @deprecated 2026-09-05 — idem
  EXPERT: 25, // @deprecated 2026-09-05 — idem
  COY: 25, // Palier unique CoY, 899€/mois — Plan A (05/09/2026)
};

export interface TriggerConfig {
  id: TriggerId;
  weight: number;
  enabled: boolean;
}

export interface TriggersConfig {
  triggers: TriggerConfig[];
}

// ─── Runtime validators ────────────────────────────────────────────────────────
// `tone`/`compensationType` are stored as plain String columns in Prisma (not DB
// enums) — a TypeScript `as ToneType` cast has zero effect at runtime. These
// guards re-validate values read back from the database before they reach a
// prompt or a pricing calculation, so a corrupted/legacy DB value degrades to
// `undefined` (safe default) instead of silently mismatching the wrong branch.

export function isToneType(value: unknown): value is ToneType {
  return typeof value === "string" && (TONE_VALUES as readonly string[]).includes(value);
}

export function isCompensationType(value: unknown): value is CompensationType {
  return (
    typeof value === "string" &&
    (COMPENSATION_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function toValidTone(value: unknown): ToneType | undefined {
  if (isToneType(value)) return value;
  if (value != null) console.warn(`[scenarios] tone invalide ignoré: ${String(value)}`);
  return undefined;
}

export function toValidCompensationType(value: unknown): CompensationType | undefined {
  if (isCompensationType(value)) return value;
  if (value != null) console.warn(`[scenarios] compensationType invalide ignoré: ${String(value)}`);
  return undefined;
}

// ─── Compensation label (single source — UI display) ──────────────────────────

export function compensationLabel(
  type: string | null | undefined,
  value: number | null | undefined
): string {
  if (!isCompensationType(type)) return "";
  if (type === "discount_percent") return `−${value ?? 0}%`;
  if (type === "discount_fixed") return `−${value ?? 0}€`;
  return "Livraison offerte";
}
