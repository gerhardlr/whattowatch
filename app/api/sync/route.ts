import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/auth";
import { syncTitles } from "@/lib/sync";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncTitles();

    // Fire-and-forget enrich call (don't await — Vercel will handle it)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
    fetch(`${baseUrl}/api/enrich`, {
      method: "POST",
      headers: { "x-sync-secret": process.env.SYNC_SECRET ?? "" },
    }).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const e = err as { code?: string; syncId?: string; message?: string };
    if (e.code === "ALREADY_RUNNING") {
      return NextResponse.json(
        { error: e.message ?? "Sync already in progress", syncId: e.syncId },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron invokes via GET with Authorization: Bearer <CRON_SECRET>
  const secret = process.env.SYNC_SECRET;
  const cronHeader = req.headers.get("authorization");
  if (secret && cronHeader === `Bearer ${secret}`) {
    return POST(req);
  }

  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  return NextResponse.json(logs);
}
