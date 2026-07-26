// xd
// Hubio — Digital business platform (Prisma client singleton)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/** Placeholder so Prisma Client can init during `next build` when DATABASE_URL is unset (e.g. Preview). */
const BUILD_TIME_DATABASE_URL =
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

let databaseUrl = process.env.DATABASE_URL || BUILD_TIME_DATABASE_URL;

if (databaseUrl) {
  // If it's a Supabase pooler or pgBouncer connection, make sure pgbouncer=true is appended
  const isPooler = databaseUrl.includes("pooler.supabase.com") || databaseUrl.includes(":6543");
  if (isPooler && !databaseUrl.includes("pgbouncer=")) {
    const separator = databaseUrl.includes("?") ? "&" : "?";
    databaseUrl = `${databaseUrl}${separator}pgbouncer=true`;
  }
}

const prismaOptions: { datasources?: { db: { url: string } } } = {};
if (databaseUrl) {
  prismaOptions.datasources = {
    db: {
      url: databaseUrl,
    },
  };
}

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
