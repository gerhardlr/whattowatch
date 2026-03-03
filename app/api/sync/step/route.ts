import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { runSyncStep } from "@/lib/sync";

// Internal endpoint called by each step to chain to the next one.
// Each invocation runs one provider pass (~20-30s) or one genre pass (~5-10s),
// well within Vercel's 60s limit, then fires the next step via after().
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { done, phase } = await runSyncStep();

  if (!done) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
    const secret = process.env.SYNC_SECRET ?? "";
    after(async () => {
      await fetch(`${baseUrl}/api/sync/step`, {
        method: "POST",
        headers: { "x-sync-secret": secret },
      });
    });
  }

  return NextResponse.json({ ok: true, done, phase });
}
