import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(connectionString: string | undefined) {
  if (!connectionString) throw new Error("DATABASE_URL is required to create PrismaClient");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Client Next.js/serverless — utilise DATABASE_URL (PgBouncer port 6543)
export const prisma =
  globalForPrisma.prisma ??
  createClient(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Client pour jobs long-running (Trigger.dev) — DIRECT_URL (port 5432, sans PgBouncer)
// Évite les conflits de prepared statements 42P05 avec le binary engine Prisma 6
export function createJobsClient(): PrismaClient {
  return createClient(process.env.DIRECT_URL ?? process.env.DATABASE_URL);
}
