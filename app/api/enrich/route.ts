import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { enrichTitles } from "@/lib/enrich";

export const maxDuration = 60;

// Vercel Cron invokes via GET — delegate to POST handler
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await enrichTitles();
  return NextResponse.json({ ok: true, ...result });
}
