export async function syncCatalog(): Promise<{ titlesSynced: number }> {
  const res = await fetch("/api/sync", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Sync failed");
  return data;
}

export async function fetchTotalTitles(): Promise<number> {
  const res = await fetch("/api/titles?page=1&service=all");
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.total as number;
}

export async function enrichRatings(): Promise<{ enriched: number; remaining: number }> {
  const res = await fetch("/api/enrich", { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Enrich failed");
  return data;
}
