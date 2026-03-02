import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findTmdbByImdb, getRecommendationImdbIds } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const jwId = req.nextUrl.searchParams.get("jwId");
  if (!jwId) {
    return NextResponse.json({ error: "Missing jwId" }, { status: 400 });
  }

  const title = await prisma.title.findUnique({ where: { jwId } });
  if (!title?.imdbId) {
    return NextResponse.json({ similar: [] });
  }

  const tmdb = await findTmdbByImdb(title.imdbId);
  if (!tmdb) {
    return NextResponse.json({ similar: [] });
  }

  const imdbIds = await getRecommendationImdbIds(tmdb.tmdbId, tmdb.mediaType);
  if (!imdbIds.length) {
    return NextResponse.json({ similar: [] });
  }

  // Only return titles we have in our ZA Netflix/Prime catalog
  const similar = await prisma.title.findMany({
    where: {
      imdbId: { in: imdbIds },
      OR: [{ onNetflix: true }, { onPrime: true }],
    },
    take: 12,
  });

  return NextResponse.json({
    similar: similar.map((t) => ({
      ...t,
      ratingsUpdatedAt: t.ratingsUpdatedAt?.toISOString() ?? null,
    })),
  });
}
