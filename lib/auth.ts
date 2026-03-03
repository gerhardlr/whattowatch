import type { NextRequest } from "next/server";

export function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  const cronSecret = process.env.CRON_SECRET; // Vercel-managed, auto-set on cron invocations
  if (!secret && !cronSecret) return true; // no secret configured = open (dev only)
  const header = req.headers.get("x-sync-secret");
  const authHeader = req.headers.get("authorization");
  return (
    (!!secret && (header === secret || authHeader === `Bearer ${secret}`)) ||
    (!!cronSecret && authHeader === `Bearer ${cronSecret}`)
  );
}
