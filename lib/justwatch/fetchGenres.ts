/**
 * Fetches the full list of genres available on JustWatch for the configured
 * country/language. Used at the start of each sync to drive the genre-filtered
 * second pass in fetchTitles.
 */
import config from "./config";
import type { JWGenre } from "@/types";
import { GENRES_QUERY } from "./queries";

/** Fetches all JustWatch genres for ZA, returned as `{ id, name }` pairs. */
export async function fetchGenres(): Promise<JWGenre[]> {
  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: GENRES_QUERY }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`JustWatch API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`JustWatch GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return (json.data.genres as Array<{ shortName: string; translation: string }>).map((g) => ({
    id: g.shortName,
    name: g.translation,
  }));
}
