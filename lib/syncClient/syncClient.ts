/**
 * Browser-side API client for the admin/sync UI.
 *
 * Thin wrappers over the internal REST endpoints — kept separate from the
 * server-side lib so they can be imported by "use client" components without
 * pulling in Prisma or Node-only dependencies.
 */

/** Triggers a full catalog sync via POST /api/sync. */
export async function syncCatalog(): Promise<{ titlesSynced: number }> {
  const res = await fetch("/api/sync", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Sync failed");
  return data;
}

/** Returns the total number of titles currently in the catalog. */
export async function fetchTotalTitles(): Promise<number> {
  const res = await fetch("/api/titles?page=1&service=all");
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.total as number;
}

/** Triggers one enrichment batch via POST /api/enrich. */
export async function enrichRatings(): Promise<{ enriched: number; remaining: number }> {
  const res = await fetch("/api/enrich", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Enrich failed");
  return data;
}
