/**
 * Authorization helpers for protected API routes (/api/sync, /api/enrich).
 *
 * A request is authorized when it carries any of:
 *   - `x-sync-secret: <SYNC_SECRET>` header
 *   - `Authorization: Bearer <SYNC_SECRET>` header
 *   - `Authorization: Bearer <CRON_SECRET>` (auto-injected by Vercel on cron invocations)
 *
 * When neither secret is configured the route is left open (development only).
 */
import type { NextRequest } from "next/server";

/** Returns true if the request is authorized to call a protected API route. */
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
