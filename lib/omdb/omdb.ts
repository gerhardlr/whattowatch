/**
 * OMDB API client (https://www.omdbapi.com).
 *
 * Fetches IMDb rating, Rotten Tomatoes score, Metacritic score, plot, director,
 * actors, runtime, and content rating for a title by its IMDb ID.
 * Requires OMDB_API_KEY env var (free tier: 1,000 requests/day).
 *
 * Throws OmdbRateLimitError when the daily quota is exceeded so callers can
 * stop processing early rather than burning retries.
 */
import type { OmdbRatings } from "@/types";

export type { OmdbRatings };

const OMDB_BASE = "https://www.omdbapi.com";

function parseRtScore(ratings: Array<{ Source: string; Value: string }>): number | null {
  const rt = ratings.find((r) => r.Source === "Rotten Tomatoes");
  if (!rt) return null;
  const pct = parseInt(rt.Value.replace("%", ""), 10);
  return isNaN(pct) ? null : pct;
}

/** Thrown when the OMDB free-tier daily request limit (1,000 req/day) is reached. */
export class OmdbRateLimitError extends Error {
  constructor() {
    super("OMDB daily request limit reached");
    this.name = "OmdbRateLimitError";
  }
}

/**
 * Fetches ratings and metadata for a title from OMDB by its IMDb ID.
 * Returns null if the title is not found. Throws OmdbRateLimitError on quota exhaustion.
 */
export async function fetchOmdbById(imdbId: string): Promise<OmdbRatings | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) throw new Error("OMDB_API_KEY is not set");

  const url = `${OMDB_BASE}/?apikey=${apiKey}&i=${encodeURIComponent(imdbId)}&plot=short`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.Response === "False") {
    if (data.Error?.includes("Request limit")) throw new OmdbRateLimitError();
    return null;
  }

  const imdbRating = parseFloat(data.imdbRating);
  const metacritic = parseInt(data.Metascore, 10);

  return {
    imdbRating: isNaN(imdbRating) ? null : imdbRating,
    rtScore: parseRtScore(data.Ratings ?? []),
    metacritic: isNaN(metacritic) ? null : metacritic,
    plot: data.Plot !== "N/A" ? data.Plot : null,
    director: data.Director !== "N/A" ? data.Director : null,
    actors: data.Actors !== "N/A" ? data.Actors : null,
    runtime: data.Runtime !== "N/A" ? data.Runtime : null,
    rated: data.Rated !== "N/A" ? data.Rated : null,
  };
}
