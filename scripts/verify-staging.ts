import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const required = ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ENCRYPTION_KEY", "OAUTH_STATE_SECRET", "TRIGGER_PROJECT_REF", "TRIGGER_SECRET_KEY", "SENTRY_DSN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "MISTRAL_API_KEY", "BREVO_API_KEY", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"];

async function main() {
  const failures: string[] = [];
  if (String(process.env.NODE_ENV) !== "staging") failures.push("NODE_ENV must be staging");
  for (const key of required) if (!process.env[key]) failures.push(`missing ${key}`);
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) failures.push("staging must use a Stripe test key");
  if ((process.env.DATABASE_URL ?? "").match(/prod|production/i)) failures.push("DATABASE_URL appears to target production");
  if (!failures.length) {
    const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try { await db.$queryRaw`SELECT 1`; } catch { failures.push("database connection failed"); } finally { await db.$disconnect(); }
  }
  if (failures.length) { console.error("STAGING VERIFICATION: FAIL"); failures.forEach((item) => console.error(`- ${item}`)); process.exitCode = 1; return; }
  console.log("STAGING VERIFICATION: PASS");
  console.log("Database reachable; required configuration present; test Stripe key confirmed.");
}
void main();
