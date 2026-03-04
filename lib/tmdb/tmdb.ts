/**
 * TMDB (The Movie Database) API client used for the "Similar Titles" feature.
 *
 * Requires TMDB_API_KEY env var (free account). Responses are cached for 24h
 * since recommendations change rarely. All functions return null/[] gracefully
 * when the key is missing or the API is unavailable, so the feature degrades
 * silently rather than breaking the page.
 */
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbGet(path: string, extra?: Record<string, string>) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({ api_key: key, language: "en-US", ...extra });
  try {
    const res = await fetch(`${TMDB_BASE}${path}?${params}`, {
      next: { revalidate: 86400 }, // cache 24h — recommendations don't change often
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Looks up a TMDB ID and media type ("movie" | "tv") by IMDb ID. Returns null if not found. */
export async function findTmdbByImdb(
  imdbId: string
): Promise<{ tmdbId: number; mediaType: "movie" | "tv" } | null> {
  const data = await tmdbGet(`/find/${imdbId}`, { external_source: "imdb_id" });
  if (data?.movie_results?.[0]) {
    return { tmdbId: data.movie_results[0].id as number, mediaType: "movie" };
  }
  if (data?.tv_results?.[0]) {
    return { tmdbId: data.tv_results[0].id as number, mediaType: "tv" };
  }
  return null;
}

/**
 * Fetches TMDB recommendations for a title and resolves them to IMDb IDs.
 * Returns up to 20 IMDb IDs (tt-prefixed strings). IDs that cannot be resolved
 * are filtered out.
 */
export async function getRecommendationImdbIds(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<string[]> {
  const data = await tmdbGet(`/${mediaType}/${tmdbId}/recommendations`);
  const results: Array<{ id: number }> = data?.results?.slice(0, 20) ?? [];
  if (!results.length) return [];

  // Fetch external IDs in parallel to get IMDB IDs for each recommendation
  const imdbIds = await Promise.all(
    results.map(async ({ id }) => {
      const ext = await tmdbGet(`/${mediaType}/${id}/external_ids`);
      return typeof ext?.imdb_id === "string" ? ext.imdb_id : null;
    })
  );

  return imdbIds.filter((id): id is string => id !== null && id.startsWith("tt"));
}
