import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/auth";
import { startSync } from "@/lib/sync";

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await startSync();

  // Fire the first step after returning the response — each step chains to the next
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const secret = process.env.SYNC_SECRET ?? "";
  after(async () => {
    await fetch(`${baseUrl}/api/sync/step`, {
      method: "POST",
      headers: { "x-sync-secret": secret },
    });
  });

  return NextResponse.json({ ok: true, queued: true });
}

export async function GET(req: NextRequest) {
  // Vercel Cron invokes via GET with Authorization: Bearer <CRON_SECRET>
  if (isAuthorized(req)) {
    return POST(req);
  }

  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  return NextResponse.json(logs);
}
