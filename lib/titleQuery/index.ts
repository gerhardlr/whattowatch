/**
 * Public entry point for the titleQuery module.
 *
 * Exposes `fetchTitlePage` — the single function that orchestrates the full
 * query pipeline: resolve URL/FilterSpec params → build Prisma where/orderBy
 * → execute DB queries in parallel → return paginated results.
 *
 * Also re-exports the submodule types and functions for callers that need
 * direct access to `resolveFilters`, `buildWhere`, or `buildOrderBy`.
 */
import { prisma } from "@/lib/prisma";
import type { FilterSpec } from "@/types";
import { resolveFilters } from "./resolveFilters";
import { buildWhere } from "./buildWhere";
import { buildOrderBy } from "./buildOrderBy";
import type { ResolvedFilters, TitlePageSearchParams } from "./resolveFilters";

export const PAGE_SIZE = 48;

export type { TitlePageSearchParams, ResolvedFilters } from "./resolveFilters";
export { resolveFilters } from "./resolveFilters";
export { buildWhere } from "./buildWhere";
export { buildOrderBy } from "./buildOrderBy";

export interface TitleQueryResult {
  filters: ResolvedFilters;
  total: number;
  totalPages: number;
  titles: Awaited<ReturnType<typeof prisma.title.findMany>>;
  availableGenres: string[];
}

async function fetchTitles(filters: ResolvedFilters) {
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(filters.sort);

  const [total, titles, genreResult] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({ where, orderBy, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.$runCommandRaw({ distinct: "Title", key: "genres" }) as Promise<{ values: string[] }>,
  ]);

  return { total, titles, availableGenres: [...(genreResult.values ?? [])].sort() };
}

/**
 * Resolves filters from raw URL search params and an optional FilterSpec, then
 * runs the Prisma count/findMany/distinct-genres queries in parallel.
 *
 * @param searchParams - Raw URL search parameters from the page request.
 * @param fixedType    - Optional hard-coded content type ("movie" | "show") that
 *                       takes precedence over both FilterSpec and URL param.
 * @param filterSpec   - Optional server-side filter preset (floors and overrides).
 * @returns Resolved filters, paginated titles, total count, totalPages, and
 *          the full sorted list of available genres in the catalog.
 */
export async function fetchTitlePage(
  searchParams: TitlePageSearchParams,
  fixedType?: "movie" | "show",
  filterSpec?: FilterSpec,
): Promise<TitleQueryResult> {
  const filters = resolveFilters(searchParams, fixedType, filterSpec);
  const result = await fetchTitles(filters);
  return { filters, ...result, totalPages: Math.ceil(result.total / PAGE_SIZE) };
}
