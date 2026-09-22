import { PrismaClient } from "@prisma/client";

/**
 * Render can restart/close idle PostgreSQL connections. Keep one Prisma client
 * for the whole Node process and use a small pool so a single web instance does
 * not exhaust the database connection limit.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) parsed.searchParams.set("connection_limit", "5");
    if (!parsed.searchParams.has("pool_timeout")) parsed.searchParams.set("pool_timeout", "20");
    return parsed.toString();
  } catch {
    // Let Prisma report an invalid DATABASE_URL with its normal diagnostic.
    return url;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl() ? { datasources: { db: { url: databaseUrl() } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// This also prevents hot reloads and server-side module re-evaluation from
// creating additional pools during development and in long-lived deployments.
globalForPrisma.prisma = prisma;
