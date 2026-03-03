import { prisma } from "@/lib/prisma";
import { fetchGenres } from "@/lib/justwatch";
import { fetchProviderPage, fetchGenrePage } from "@/lib/justwatch/fetchTitles";
import config from "@/lib/justwatch/config";
import type { JWTitle } from "@/types";

const SYNC_ID = "singleton";
const BATCH = 20;
// Pages per provider step: 10 pages × ~100 titles = 1000 titles per step.
// Conservative default — each step should run well within Vercel's 60s limit.
// Increase if Vercel logs show steps completing in <30s.
const PAGES_PER_STEP = 10;

// Which DB flag fields each provider owns — genre passes only set these to true, never false
function providerFlagUpdate(provider: string, t: JWTitle): Record<string, boolean> {
  switch (provider) {
    case "netflix":
      return { onNetflix: t.onNetflix };
    case "amazonprimevideo":
      return { onPrime: t.onPrime, onPrimePay: t.onPrimePay };
    case "appletvplus":
      return { onApple: t.onApple, onApplePay: t.onApplePay };
    default:
      return {};
  }
}

async function upsertTitles(
  titles: JWTitle[],
  flagUpdate: (t: JWTitle) => Record<string, boolean>
): Promise<number> {
  for (let i = 0; i < titles.length; i += BATCH) {
    const chunk = titles.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((t) =>
        prisma.title.upsert({
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
            onPrimePay: t.onPrimePay,
            onDisney: t.onDisney,
            onApple: t.onApple,
            onApplePay: t.onApplePay,
          },
          update: {
            title: t.title,
            year: t.year,
            genres: t.genres,
            posterUrl: t.posterUrl,
            ...(t.imdbId ? { imdbId: t.imdbId } : {}),
            ...flagUpdate(t),
          },
        })
      )
    );
  }
  return titles.length;
}

/**
 * Resets all provider flags, fetches genres, creates a SyncLog, and saves
 * the initial SyncState. Call once to kick off a new sync, then call
 * runSyncStep() repeatedly until it returns { done: true }.
 */
export async function startSync(): Promise<void> {
  // Clear all provider flags so titles removed from a platform get cleared.
  // Retry on write conflicts which can occur on Atlas free-tier shared infrastructure.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await prisma.title.updateMany({
        data: {
          onNetflix: false,
          onPrime: false,
          onPrimePay: false,
          onDisney: false,
          onApple: false,
          onApplePay: false,
        },
      });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isConflict = msg.includes("write conflict") || msg.includes("deadlock");
      if (!isConflict || attempt === 5) throw err;
      console.log(`  [sync] updateMany conflict, retrying (attempt ${attempt}/5)…`);
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }

  const genres = await fetchGenres();
  const syncLog = await prisma.syncLog.create({ data: { status: "running" } });

  await prisma.syncState.upsert({
    where: { id: SYNC_ID },
    create: {
      id: SYNC_ID,
      phase: "providers",
      phaseIndex: 0,
      cursor: null,
      genres: genres.map((g) => g.id),
      syncLogId: syncLog.id,
      titlesSynced: 0,
    },
    update: {
      phase: "providers",
      phaseIndex: 0,
      cursor: null,
      genres: genres.map((g) => g.id),
      syncLogId: syncLog.id,
      titlesSynced: 0,
    },
  });
}

/**
 * Executes one step of the sync: either one provider pass or one genre pass.
 * Each step comfortably fits within Vercel's 60s function timeout.
 * Returns { done: true } when the sync is fully complete.
 */
export async function runSyncStep(): Promise<{ done: boolean; phase: string }> {
  const state = await prisma.syncState.findUnique({ where: { id: SYNC_ID } });
  if (!state) return { done: true, phase: "none" };

  const providers = [...config.providers];

  try {
    if (state.phase === "providers") {
      const provider = providers[state.phaseIndex];
      const { titles, nextCursor, hasMore } = await fetchProviderPage(
        provider,
        state.cursor ?? null,
        PAGES_PER_STEP
      );
      const count = await upsertTitles(titles, (t) => providerFlagUpdate(provider, t));

      if (hasMore) {
        // More pages remain for this provider — stay on same provider, advance cursor
        await prisma.syncState.update({
          where: { id: SYNC_ID },
          data: { cursor: nextCursor, titlesSynced: state.titlesSynced + count },
        });
        return { done: false, phase: `providers[${state.phaseIndex}]=${provider} (continued)` };
      }

      // All pages for this provider done — advance to next provider or genres
      const nextIndex = state.phaseIndex + 1;
      const isLast = nextIndex >= providers.length;
      await prisma.syncState.update({
        where: { id: SYNC_ID },
        data: {
          phase: isLast ? "genres" : "providers",
          phaseIndex: isLast ? 0 : nextIndex,
          cursor: null,
          titlesSynced: state.titlesSynced + count,
        },
      });
      return { done: false, phase: `providers[${state.phaseIndex}]=${provider}` };
    }

    if (state.phase === "genres") {
      const genreId = state.genres[state.phaseIndex];
      const { titles, nextCursor, hasMore } = await fetchGenrePage(
        genreId,
        state.cursor ?? null,
        PAGES_PER_STEP
      );
      // Only set flags to true — never overwrite a provider pass's true with false
      await upsertTitles(titles, (t) => ({
        ...(t.onNetflix ? { onNetflix: true } : {}),
        ...(t.onPrime ? { onPrime: true } : {}),
        ...(t.onPrimePay ? { onPrimePay: true } : {}),
        ...(t.onDisney ? { onDisney: true } : {}),
        ...(t.onApple ? { onApple: true } : {}),
        ...(t.onApplePay ? { onApplePay: true } : {}),
      }));

      if (hasMore) {
        await prisma.syncState.update({
          where: { id: SYNC_ID },
          data: { cursor: nextCursor },
        });
        return { done: false, phase: `genres[${state.phaseIndex}]=${genreId} (continued)` };
      }

      const nextIndex = state.phaseIndex + 1;
      const isLast = nextIndex >= state.genres.length;
      await prisma.syncState.update({
        where: { id: SYNC_ID },
        data: {
          phase: isLast ? "complete" : "genres",
          phaseIndex: isLast ? 0 : nextIndex,
          cursor: null,
        },
      });
      return { done: false, phase: `genres[${state.phaseIndex}]=${genreId}` };
    }

    if (state.phase === "complete") {
      await prisma.syncLog.update({
        where: { id: state.syncLogId },
        data: { status: "completed", titlesSynced: state.titlesSynced, completedAt: new Date() },
      });
      await prisma.syncState.delete({ where: { id: SYNC_ID } });
      return { done: true, phase: "complete" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncLog
      .update({ where: { id: state.syncLogId }, data: { status: "failed", error: message, completedAt: new Date() } })
      .catch(() => {});
    await prisma.syncState.delete({ where: { id: SYNC_ID } }).catch(() => {});
    throw err;
  }

  return { done: true, phase: state.phase };
}
