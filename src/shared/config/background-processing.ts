/**
 * Server-only controls for durable background work. They deliberately live in
 * deployment configuration, not tenant settings: a single tenant must not be
 * able to consume all AI or delivery capacity.
 */
function positiveInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export const backgroundProcessing = {
  /** How many tenants a dispatcher visits in one tick. */
  tenantWindow: positiveInt("BACKGROUND_TENANT_WINDOW", 50),
  /** Maximum eligible items taken from one tenant in a dispatch tick. */
  scoringBatchPerTenant: positiveInt("SCORING_BATCH_PER_TENANT", 10),
  messageBatchPerTenant: positiveInt("MESSAGE_BATCH_PER_TENANT", 5),
  /** Upper bounds on work handed to Trigger.dev in one scheduler run. */
  scoringDispatchLimit: positiveInt("SCORING_DISPATCH_LIMIT", 250),
  messageDispatchLimit: positiveInt("MESSAGE_DISPATCH_LIMIT", 150),
  /** Shared Trigger.dev queue concurrency; protects Mistral and Brevo. */
  scoringConcurrency: positiveInt("SCORING_WORKER_CONCURRENCY", 8),
  messageConcurrency: positiveInt("MESSAGE_WORKER_CONCURRENCY", 5),
  /** Application-level retry policy, persisted in the database. */
  scoringMaxAttempts: positiveInt("SCORING_MAX_ATTEMPTS", 5),
  messageMaxAttempts: positiveInt("MESSAGE_MAX_ATTEMPTS", 4),
  retryBaseSeconds: positiveInt("BACKGROUND_RETRY_BASE_SECONDS", 60),
  claimLeaseMinutes: positiveInt("BACKGROUND_CLAIM_LEASE_MINUTES", 15),
  rescoreDays: positiveInt("SCORING_RESCORE_DAYS", 7),
  activeOrderDays: positiveInt("SCORING_ACTIVE_ORDER_DAYS", 90),
  backlogAlertThreshold: positiveInt("BACKGROUND_BACKLOG_ALERT_THRESHOLD", 1_000),
  integrationBackfillDays: positiveInt("INTEGRATION_BACKFILL_DAYS", 365),
} as const;

export function retryAt(attempt: number, now = new Date()): Date {
  // Capped exponential backoff: 1m, 2m, 4m… (default) up to one hour.
  const seconds = Math.min(
    backgroundProcessing.retryBaseSeconds * 2 ** Math.max(0, attempt - 1),
    60 * 60,
  );
  return new Date(now.getTime() + seconds * 1000);
}
