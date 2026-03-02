import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { DISNEY_ENABLED } from "@/lib/features";
import TitleGrid from "./browse/TitleGrid";

const PAGE_SIZE = 48;

export interface TitlePageSearchParams {
  service?: string;
  type?: string;
  genres?: string;
  excludeGenres?: string;
  decade?: string;
  minRt?: string;
  minImdb?: string;
  director?: string;
  actor?: string;
  sort?: string;
  page?: string;
  q?: string;
  sa?: string;
  rentbuy?: string;
}

interface Props {
  searchParams: TitlePageSearchParams;
  fixedType?: "movie" | "show";
}

export async function TitlePageContent({ searchParams, fixedType }: Props) {
  const service = searchParams.service ?? "all";
  const type = fixedType ?? searchParams.type ?? "all";
  const sort = searchParams.sort ?? "rtScore";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.q;
  const selectedGenres = searchParams.genres ? searchParams.genres.split(",").filter(Boolean) : [];
  const excludedGenres = searchParams.excludeGenres ? searchParams.excludeGenres.split(",").filter(Boolean) : [];
  const decade = searchParams.decade;
  const minRt = searchParams.minRt;
  const minImdb = searchParams.minImdb;
  const director = searchParams.director;
  const actor = searchParams.actor;
  const saOnly = searchParams.sa === "1";
  const includeRentBuy = searchParams.rentbuy === "1";

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

  if (minRt) where.rtScore = { gte: parseInt(minRt, 10) };
  if (minImdb) where.imdbRating = { gte: parseFloat(minImdb) };
  if (director) where.director = { contains: director, mode: "insensitive" };
  if (actor) where.actors = { contains: actor, mode: "insensitive" };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const orderBy: Prisma.TitleOrderByWithRelationInput =
    sort === "imdbRating"
      ? { imdbRating: "desc" }
      : sort === "year"
      ? { year: "desc" }
      : sort === "title"
      ? { title: "asc" }
      : { rtScore: "desc" };

  const [total, titles, genreResult] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.$runCommandRaw({ distinct: "Title", key: "genres" }) as Promise<{ values: string[] }>,
  ]);
  const availableGenres = [...(genreResult.values ?? [])].sort();

  return (
    <TitleGrid
      titles={titles.map((t) => ({ ...t, ratingsUpdatedAt: t.ratingsUpdatedAt?.toISOString() ?? null }))}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      service={service}
      sort={sort}
      search={search ?? undefined}
      fixedType={fixedType}
      saOnly={saOnly}
      includeRentBuy={includeRentBuy}
      genres={selectedGenres.length > 0 ? selectedGenres : undefined}
      excludeGenres={excludedGenres.length > 0 ? excludedGenres : undefined}
      decade={decade}
      availableGenres={availableGenres}
      minRt={minRt}
      minImdb={minImdb}
      director={director}
      actor={actor}
    />
  );
}
