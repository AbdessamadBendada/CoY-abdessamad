const requiredProduction = [
  "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", "ENCRYPTION_KEY", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  "TRIGGER_PROJECT_REF", "TRIGGER_SECRET_KEY", "SENTRY_DSN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
] as const;

export function criticalEnvironmentIssues() {
  if (process.env.NODE_ENV !== "production") return [];
  return requiredProduction.filter((name) => !process.env[name]);
}

export function assertProductionConfiguration() {
  const missing = criticalEnvironmentIssues();
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
}
