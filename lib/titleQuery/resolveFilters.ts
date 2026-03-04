/**
 * Filter resolution — merges URL search params with an optional server-side FilterSpec
 * into a single normalized ResolvedFilters object consumed by buildWhere/buildOrderBy.
 *
 * Merge rules:
 *   - service / type: FilterSpec takes priority over URL param.
 *   - fixedType (component prop): highest priority, overrides both FilterSpec and URL.
 *   - genres: FilterSpec.genres replaces URL genres entirely.
 *   - excludeGenres: FilterSpec and URL values are unioned (deduped).
 *   - minRt / minImdb / minMetacritic: FilterSpec acts as a floor;
 *     the URL param can only raise it, never lower it.
 */
import type { FilterSpec } from "@/types";

/** Raw URL search parameters accepted by title-listing pages. */
export interface TitlePageSearchParams {
  service?: string;
  type?: string;
  genres?: string;
  excludeGenres?: string;
  decade?: string;
  minRt?: string;
  minImdb?: string;
  minMetacritic?: string;
  director?: string;
  actor?: string;
  sort?: string;
  page?: string;
  q?: string;
  sa?: string;
  rentbuy?: string;
}

/** Fully resolved, type-coerced filter state ready for Prisma query construction. */
export interface ResolvedFilters {
  service: string;
  effectiveFixedType?: "movie" | "show";
  type: string;
  sort: string;
  page: number;
  search?: string;
  decade?: string;
  director?: string;
  actor?: string;
  saOnly: boolean;
  includeRentBuy: boolean;
  selectedGenres: string[];
  excludedGenres: string[];
  effectiveMinRt?: number;
  effectiveMinImdb?: number;
  effectiveMinMetacritic?: number;
}

/**
 * Merges URL search params, an optional fixedType prop, and an optional FilterSpec
 * into a single ResolvedFilters object.
 */
export function resolveFilters(
  searchParams: TitlePageSearchParams,
  fixedType?: "movie" | "show",
  filterSpec?: FilterSpec,
): ResolvedFilters {
  const service = filterSpec?.service ?? searchParams.service ?? "all";
  const effectiveFixedType = fixedType ?? filterSpec?.type;
  const type = effectiveFixedType ?? searchParams.type ?? "all";

  const sort = searchParams.sort ?? "rtScore";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.q;
  const decade = searchParams.decade;
  const director = searchParams.director;
  const actor = searchParams.actor;
  const saOnly = searchParams.sa === "1";
  const includeRentBuy = searchParams.rentbuy === "1";

  // Genres: spec replaces URL genres entirely; excludeGenres merges with spec's
  const urlGenres = searchParams.genres ? searchParams.genres.split(",").filter(Boolean) : [];
  const selectedGenres = filterSpec?.genres ?? urlGenres;

  const urlExcludeGenres = searchParams.excludeGenres
    ? searchParams.excludeGenres.split(",").filter(Boolean)
    : [];
  const excludedGenres = [...new Set([...(filterSpec?.excludeGenres ?? []), ...urlExcludeGenres])];

  // Ratings: spec sets a floor; URL param can only raise it higher
  const effectiveMinRt = mergeFloor(filterSpec?.minRt, searchParams.minRt ? parseInt(searchParams.minRt, 10) : undefined);
  const effectiveMinImdb = mergeFloor(filterSpec?.minImdb, searchParams.minImdb ? parseFloat(searchParams.minImdb) : undefined);
  const effectiveMinMetacritic = mergeFloor(filterSpec?.minMetacritic, searchParams.minMetacritic ? parseInt(searchParams.minMetacritic, 10) : undefined);

  return {
    service,
    effectiveFixedType,
    type,
    sort,
    page,
    search,
    decade,
    director,
    actor,
    saOnly,
    includeRentBuy,
    selectedGenres,
    excludedGenres,
    effectiveMinRt,
    effectiveMinImdb,
    effectiveMinMetacritic,
  };
}

/**
 * Returns the higher of `spec` and `url`, or undefined when both are absent.
 * A result of 0 is also treated as absent (returned as undefined) because a
 * zero floor is equivalent to no filter.
 */
export function mergeFloor(spec: number | undefined, url: number | undefined): number | undefined {
  if (spec === undefined && url === undefined) return undefined;
  return Math.max(spec ?? 0, url ?? 0) || undefined;
}
