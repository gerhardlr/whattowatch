/**
 * Prisma client singleton.
 *
 * Re-uses a single PrismaClient instance across hot-reloads in development
 * by stashing it on the global object. In production a fresh instance is
 * created once per process.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
