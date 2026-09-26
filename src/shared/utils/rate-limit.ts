import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Sliding window: 5 req / 60s per IP
// Production (Vercel multi-instance): Upstash Redis
// Dev / env vars absentes: fallback in-memory (single-instance only)

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

const memStore = new Map<string, { count: number; reset: number }>();

let ratelimit: Ratelimit | null = null;
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "60 s"),
    prefix: "winback:contact",
  });
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
}

export async function isContactRateLimited(): Promise<boolean> {
  const ip = await getClientIp();

  if (ratelimit) {
    const { success } = await ratelimit.limit(ip);
    return !success;
  }

  // A per-instance memory limit is not a production control. Fail closed for
  // this non-essential public form rather than silently allowing bypasses
  // across serverless instances.
  if (process.env.NODE_ENV === "production") return true;

  // Fallback in-memory (dev ou env Upstash non configurées)
  const now = Date.now();
  const rec = memStore.get(ip);
  if (!rec || now > rec.reset) {
    memStore.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_REQUESTS;
}
