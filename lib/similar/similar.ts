/**
 * "Similar Titles" feature — finds catalog titles related to a given title.
 *
 * Pipeline:
 *   1. Look up the title's IMDb ID in the DB.
 *   2. Resolve it to a TMDB ID via the TMDB find-by-external-ID endpoint.
 *   3. Fetch TMDB recommendations and map them back to IMDb IDs.
 *   4. Filter to titles present in our ZA catalog (Netflix or Prime).
 *
 * Returns at most 12 results. Returns [] at any step if data is unavailable.
 */
import { prisma } from "@/lib/prisma";
import { findTmdbByImdb, getRecommendationImdbIds } from "@/lib/tmdb";
import type { TitleItem } from "@/types";

/** Returns up to 12 catalog titles similar to the given JustWatch ID. */
export async function getSimilarTitles(jwId: string): Promise<TitleItem[]> {
  const title = await prisma.title.findUnique({ where: { jwId } });
  if (!title?.imdbId) return [];

  const tmdb = await findTmdbByImdb(title.imdbId);
  if (!tmdb) return [];

  const imdbIds = await getRecommendationImdbIds(tmdb.tmdbId, tmdb.mediaType);
  if (!imdbIds.length) return [];

  // Only return titles we have in our ZA Netflix/Prime catalog
  const similar = await prisma.title.findMany({
    where: {
      imdbId: { in: imdbIds },
      OR: [{ onNetflix: true }, { onPrime: true }],
    },
    take: 12,
  });

  return similar.map((t) => ({
    ...t,
    ratingsUpdatedAt: t.ratingsUpdatedAt?.toISOString() ?? null,
  }));
}
