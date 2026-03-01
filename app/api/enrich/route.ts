import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchOmdbById } from "@/lib/omdb";

export const maxDuration = 300;

const BATCH_SIZE = 100; // Stay well within 1000/day free limit

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-sync-secret");
  // Also accept Vercel Cron's Authorization: Bearer header
  const cronHeader = req.headers.get("authorization");
  return header === secret || cronHeader === `Bearer ${secret}`;
}

// Vercel Cron invokes via GET — delegate to POST handler
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find titles that have an IMDB ID but no ratings yet
  // Use isSet:false because Prisma+MongoDB stores unset nullable fields as missing, not null
  const titles = await prisma.title.findMany({
    where: {
      ratingsUpdatedAt: { isSet: false },
    },
    take: BATCH_SIZE,
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

  return NextResponse.json({
    ok: true,
    enriched,
    failed,
    remaining: await prisma.title.count({
      where: { ratingsUpdatedAt: { isSet: false } },
    }),
  });
}
