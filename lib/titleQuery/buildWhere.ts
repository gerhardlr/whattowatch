/**
 * Prisma where-clause builder for the Title model.
 *
 * Translates a ResolvedFilters object into a Prisma.TitleWhereInput by applying:
 *   - Service availability (onNetflix, onPrime, onApple, … OR conditions)
 *   - Content type (movie / show)
 *   - Genre inclusion (hasSome) and exclusion (NOT hasSome)
 *   - Decade range (year gte/lt)
 *   - Minimum rating floors (rtScore, imdbRating, metacritic)
 *   - Case-insensitive text search on title, director, and actors fields
 */
import { Prisma } from "@prisma/client";
import { DISNEY_ENABLED } from "@/lib/features";
import type { ResolvedFilters } from "./resolveFilters";

export function buildWhere(filters: ResolvedFilters): Prisma.TitleWhereInput {
  const { service, type, includeRentBuy, selectedGenres, excludedGenres, decade,
    effectiveMinRt, effectiveMinImdb, effectiveMinMetacritic, director, actor, search } = filters;

  const where: Prisma.TitleWhereInput = {};

  if (service === "netflix") where.onNetflix = true;
  else if (service === "prime") {
    where.OR = includeRentBuy
      ? [{ onPrime: true }, { onPrimePay: true }]
      : [{ onPrime: true }];
  } else if (service === "disney") where.onDisney = true;
  else if (service === "apple") {
    where.OR = includeRentBuy
      ? [{ onApple: true }, { onApplePay: true }]
      : [{ onApple: true }];
  } else {
    where.OR = [
      { onNetflix: true },
      { onPrime: true },
      { onPrimePay: true },
      ...(DISNEY_ENABLED ? [{ onDisney: true }] : []),
      { onApple: true },
      { onApplePay: true },
    ];
  }

  if (type === "movie") where.type = "movie";
  else if (type === "show") where.type = "show";

  if (selectedGenres.length > 0) where.genres = { hasSome: selectedGenres };
  if (excludedGenres.length > 0) where.NOT = { genres: { hasSome: excludedGenres } };

  if (decade) {
    if (decade === "classic") {
      where.year = { lt: 1980 };
    } else {
      const start = parseInt(decade, 10);
      where.year = { gte: start, lt: start + 10 };
    }
  }

  if (effectiveMinRt) where.rtScore = { gte: effectiveMinRt };
  if (effectiveMinImdb) where.imdbRating = { gte: effectiveMinImdb };
  if (effectiveMinMetacritic) where.metacritic = { gte: effectiveMinMetacritic };
  if (director) where.director = { contains: director, mode: "insensitive" };
  if (actor) where.actors = { contains: actor, mode: "insensitive" };
  if (search) where.title = { contains: search, mode: "insensitive" };

  return where;
}
