import { PrismaClient } from "@prisma/client";

function getPrismaDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = new URL(raw);
    const isSupabasePooler = parsed.hostname.includes(".pooler.supabase.com");
    if (isSupabasePooler) {
      if (!parsed.searchParams.has("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true");
      }
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1");
      }
      return parsed.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getPrismaDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
