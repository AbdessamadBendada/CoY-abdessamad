export const APP_NAME = "CoY";
export const APP_TAGLINE = "L'IA qui sauve vos clients avant qu'ils ne partent.";
export const APP_DESCRIPTION =
  "Agent IA de récupération proactive des clients insatisfaits pour PME e-commerce françaises.";

// Scoring
export const CHURN_SCORE_DEFAULT_THRESHOLD = 65;
export const CHURN_SCORE_MIN = 0;
export const CHURN_SCORE_MAX = 100;
export const COOLDOWN_DAYS_DEFAULT = 7;
export const COOLDOWN_DAYS_MIN = 3;
export const COOLDOWN_DAYS_MAX = 30;

// Quotas
export const QUOTA_WARNING_PERCENT = 80;
export const QUOTA_CRITICAL_PERCENT = 90;
export const QUOTA_BLOCK_PERCENT = 100;

// Polling
export const PRESTASHOP_POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 min
export const PRESTASHOP_POLLING_SLOW_MS = 15 * 60 * 1000; // 15 min (hébergement lent)
export const DASHBOARD_POLLING_INTERVAL_MS = 30 * 1000; // 30s

// CSAT
export const CSAT_WEAK_SIGNAL_THRESHOLD = 3; // 3/5 = signal faible
export const CSAT_WEAK_SIGNAL_WEIGHT = 0.3;
export const CSAT_STRONG_SIGNAL_WEIGHT = 0.8;
export const CSAT_FOLLOWUP_DELAY_DAYS = 7; // J+7 post-récupération

// Historique initial (sync Gorgias)
export const INITIAL_SYNC_DAYS = 7;
