import { prisma } from "@/lib/prisma";
import { fetchAllTitles } from "@/lib/justwatch";

interface AlreadyRunningError extends Error {
  code: "ALREADY_RUNNING";
  syncId: string;
}

export async function syncTitles(): Promise<{ titlesSynced: number; syncId: string }> {
  const running = await prisma.syncLog.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
  });
  if (running) {
    const err = Object.assign(new Error("Sync already in progress"), {
      code: "ALREADY_RUNNING" as const,
      syncId: running.id,
    }) as AlreadyRunningError;
    throw err;
  }

  const syncLog = await prisma.syncLog.create({ data: { status: "running" } });

  try {
    const titles = await fetchAllTitles();

    let upserted = 0;
    for (const t of titles) {
      await prisma.title.upsert({
        where: { jwId: t.jwId },
        create: {
          jwId: t.jwId,
          imdbId: t.imdbId,
          title: t.title,
          year: t.year,
          type: t.type,
          genres: t.genres,
          posterUrl: t.posterUrl,
          onNetflix: t.onNetflix,
          onPrime: t.onPrime,
        },
        update: {
          title: t.title,
          year: t.year,
          genres: t.genres,
          posterUrl: t.posterUrl,
          onNetflix: t.onNetflix,
          onPrime: t.onPrime,
          // Don't overwrite imdbId once set
          ...(t.imdbId ? { imdbId: t.imdbId } : {}),
        },
      });
      upserted++;
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "completed", titlesSynced: upserted, completedAt: new Date() },
    });

    return { titlesSynced: upserted, syncId: syncLog.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "failed", error: message, completedAt: new Date() },
    });
    throw err;
  }
}
