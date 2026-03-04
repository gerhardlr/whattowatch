import type { FilterSpec } from "@/types";
import { fetchTitlePage } from "@/lib/titleQuery";
import type { TitlePageSearchParams } from "@/lib/titleQuery";
import TitleGrid from "@/components/TitleGrid";

export type { TitlePageSearchParams };

interface Props {
  searchParams: TitlePageSearchParams;
  fixedType?: "movie" | "show";
  filterSpec?: FilterSpec;
}

export async function TitlePageContent({ searchParams, fixedType, filterSpec }: Props) {
  const { filters, total, totalPages, titles, availableGenres } = await fetchTitlePage(searchParams, fixedType, filterSpec);

  return (
    <TitleGrid
      titles={titles.map((t) => ({ ...t, ratingsUpdatedAt: t.ratingsUpdatedAt?.toISOString() ?? null }))}
      total={total}
      page={filters.page}
      totalPages={totalPages}
      service={filters.service}
      sort={filters.sort}
      search={filters.search}
      fixedType={filters.effectiveFixedType}
      saOnly={filters.saOnly}
      includeRentBuy={filters.includeRentBuy}
      genres={filters.selectedGenres.length > 0 ? filters.selectedGenres : undefined}
      excludeGenres={filters.excludedGenres.length > 0 ? filters.excludedGenres : undefined}
      decade={filters.decade}
      availableGenres={availableGenres}
      minRt={filters.effectiveMinRt?.toString()}
      minImdb={filters.effectiveMinImdb?.toString()}
      minMetacritic={filters.effectiveMinMetacritic?.toString()}
      director={filters.director}
      actor={filters.actor}
      genresLocked={!!filterSpec?.genres}
      serviceLocked={!!filterSpec?.service}
    />
  );
}
