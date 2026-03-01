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
}

async function SeriesContent({ searchParams }: { searchParams: SearchParams }) {
  const service = searchParams.service ?? "all";
  const sort = searchParams.sort ?? "rtScore";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.q;
  const genre = searchParams.genre;

  const where: Prisma.TitleWhereInput = { type: "show" };
  if (service === "netflix") where.onNetflix = true;
  else if (service === "prime") where.onPrime = true;
  if (genre) where.genres = { has: genre };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const orderBy: Prisma.TitleOrderByWithRelationInput =
    sort === "imdbRating"
      ? { imdbRating: "desc" }
      : sort === "year"
      ? { year: "desc" }
      : sort === "title"
      ? { title: "asc" }
      : { rtScore: "desc" };

  const [total, titles] = await Promise.all([
    prisma.title.count({ where }),
    prisma.title.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return (
    <TitleGrid
      titles={titles.map((t) => ({ ...t, ratingsUpdatedAt: t.ratingsUpdatedAt?.toISOString() ?? null }))}
      total={total}
      page={page}
      totalPages={Math.ceil(total / PAGE_SIZE)}
      service={service}
      sort={sort}
      search={search ?? undefined}
      fixedType="show"
    />
  );
}

export default async function SeriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}>
      <SeriesContent searchParams={params} />
    </Suspense>
  );
}
