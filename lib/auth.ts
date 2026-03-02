import type { NextRequest } from "next/server";

export function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return true; // no secret configured = open (dev only)
  const header = req.headers.get("x-sync-secret");
  // Also allow Vercel Cron Authorization: Bearer header
  const cronHeader = req.headers.get("authorization");
  return header === secret || cronHeader === `Bearer ${secret}`;
}
