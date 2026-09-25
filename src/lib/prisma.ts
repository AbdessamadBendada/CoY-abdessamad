import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Client Next.js/serverless — utilise DATABASE_URL (PgBouncer port 6543)
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Client pour jobs long-running (Trigger.dev) — DIRECT_URL (port 5432, sans PgBouncer)
// Évite les conflits de prepared statements 42P05 avec le binary engine Prisma 6
export function createJobsClient(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}
