import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAllTitles } from "@/lib/justwatch";

export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return true; // no secret configured = open (dev only)
  const header = req.headers.get("x-sync-secret");
  // Also allow Vercel Cron header
  const cronHeader = req.headers.get("authorization");
  return header === secret || cronHeader === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if a sync is already running
  const running = await prisma.syncLog.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
  });
  if (running) {
    return NextResponse.json(
      { error: "Sync already in progress", syncId: running.id },
      { status: 409 }
    );
  }

  const syncLog = await prisma.syncLog.create({
    data: { status: "running" },
  });

  try {
    const titles = await fetchAllTitles();

    // Upsert all titles
    let upserted = 0;
    for (const t of titles) {
      await prisma.title.upsert({
        where: { jwId: t.jwId },
        create: {
          jwId: t.jwId,
          imdbId: t.imdbId,
          title: t.title,
          year: t.year,
          type: t.type,
          genres: t.genres,
          posterUrl: t.posterUrl,
          onNetflix: t.onNetflix,
          onPrime: t.onPrime,
        },
        update: {
          title: t.title,
          year: t.year,
          genres: t.genres,
          posterUrl: t.posterUrl,
          onNetflix: t.onNetflix,
          onPrime: t.onPrime,
          // Don't overwrite imdbId once set
          ...(t.imdbId ? { imdbId: t.imdbId } : {}),
        },
      });
      upserted++;
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        titlesSynced: upserted,
        completedAt: new Date(),
      },
    });

    // Fire-and-forget enrich call (don't await — Vercel will handle it)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
    fetch(`${baseUrl}/api/enrich`, {
      method: "POST",
      headers: {
        "x-sync-secret": process.env.SYNC_SECRET ?? "",
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, titlesSynced: upserted, syncId: syncLog.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "failed", error: message, completedAt: new Date() },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  return NextResponse.json(logs);
}
