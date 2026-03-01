import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 48;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const service = searchParams.get("service") ?? "all";
  const type = searchParams.get("type") ?? "all";
  const genre = searchParams.get("genre");
  const sort = searchParams.get("sort") ?? "rtScore";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search = searchParams.get("q");

  const where: Prisma.TitleWhereInput = {};

  if (service === "netflix") where.onNetflix = true;
  else if (service === "prime") where.onPrime = true;
  else if (service === "both") { where.onNetflix = true; where.onPrime = true; }

  if (type === "movie") where.type = "movie";
  else if (type === "show") where.type = "show";

  if (genre) {
    where.genres = { has: genre };
  }

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

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
    prisma.title.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    titles,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
