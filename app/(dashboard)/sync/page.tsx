import { prisma } from "@/lib/prisma";
import { SyncClient } from "@/components/SyncClient";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const [lastSync, total, netflix, prime, enriched, pending] = await Promise.all([
    prisma.syncLog.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.title.count(),
    prisma.title.count({ where: { onNetflix: true } }),
    prisma.title.count({ where: { onPrime: true } }),
    prisma.title.count({ where: { ratingsUpdatedAt: { not: null } } }),
    prisma.title.count({ where: { imdbId: { not: null }, ratingsUpdatedAt: null } }),
  ]);

  return (
    <SyncClient
      lastSync={
        lastSync
          ? {
              ...lastSync,
              startedAt: lastSync.startedAt.toISOString(),
              completedAt: lastSync.completedAt?.toISOString() ?? null,
            }
          : null
      }
      stats={{ total, netflix, prime, enriched, pending }}
    />
  );
}
