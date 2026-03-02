import { prisma } from "@/lib/prisma";
import { fetchOmdbById } from "@/lib/omdb";

const DEFAULT_BATCH_SIZE = 100;

export async function enrichTitles(
  batchSize = DEFAULT_BATCH_SIZE
): Promise<{ enriched: number; failed: number; remaining: number }> {
  // Use isSet:false because Prisma+MongoDB stores unset nullable fields as missing, not null
  const titles = await prisma.title.findMany({
    where: { ratingsUpdatedAt: { isSet: false } },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  let enriched = 0;
  let failed = 0;

  for (const title of titles) {
    if (!title.imdbId) continue;
    try {
      const ratings = await fetchOmdbById(title.imdbId);
      if (ratings) {
        await prisma.title.update({
          where: { id: title.id },
          data: {
            imdbRating: ratings.imdbRating,
            rtScore: ratings.rtScore,
            metacritic: ratings.metacritic,
            plot: ratings.plot,
            director: ratings.director,
            actors: ratings.actors,
            runtime: ratings.runtime,
            rated: ratings.rated,
            ratingsUpdatedAt: new Date(),
          },
        });
        enriched++;
      } else {
        // Mark as attempted so we don't retry forever
        await prisma.title.update({
          where: { id: title.id },
          data: { ratingsUpdatedAt: new Date() },
        });
        failed++;
      }
    } catch {
      failed++;
    }
    // Rate limit: ~3 req/sec to be safe
    await new Promise((r) => setTimeout(r, 350));
  }

  const remaining = await prisma.title.count({
    where: { ratingsUpdatedAt: { isSet: false } },
  });

  return { enriched, failed, remaining };
}
