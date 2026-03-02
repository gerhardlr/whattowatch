import { prisma } from "@/lib/prisma";
import { findTmdbByImdb, getRecommendationImdbIds } from "@/lib/tmdb";
import type { TitleItem } from "@/types";

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
