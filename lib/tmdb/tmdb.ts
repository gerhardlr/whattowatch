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
