import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import TitleGrid from "../browse/TitleGrid";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

const PAGE_SIZE = 48;

interface SearchParams {
  service?: string;
  sort?: string;
  page?: string;
  q?: string;
  genre?: string;
  decade?: string;
  minRt?: string;
  minImdb?: string;
  director?: string;
  actor?: string;
  sa?: string;
}

async function MoviesContent({ searchParams }: { searchParams: SearchParams }) {
  const service = searchParams.service ?? "all";
  const sort = searchParams.sort ?? "rtScore";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.q;
  const genre = searchParams.genre;
  const decade = searchParams.decade;
  const minRt = searchParams.minRt;
  const minImdb = searchParams.minImdb;
  const director = searchParams.director;
  const actor = searchParams.actor;
  const saOnly = searchParams.sa === "1";

  const where: Prisma.TitleWhereInput = { type: "movie" };
  if (service === "netflix") where.onNetflix = true;
  else if (service === "prime") where.onPrime = true;
  else if (saOnly) where.OR = [{ onNetflix: true }, { onPrime: true }];
  if (genre) where.genres = { has: genre };
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
      fixedType="movie"
      saOnly={saOnly}
      genre={genre}
      decade={decade}
      availableGenres={availableGenres}
      minRt={minRt}
      minImdb={minImdb}
      director={director}
      actor={actor}
    />
  );
}

export default async function MoviesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}>
      <MoviesContent searchParams={params} />
    </Suspense>
  );
}
