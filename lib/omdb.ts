const OMDB_BASE = "https://www.omdbapi.com";

export interface OmdbRatings {
  imdbRating: number | null;
  rtScore: number | null;
  metacritic: number | null;
  plot: string | null;
  director: string | null;
  actors: string | null;
  runtime: string | null;
  rated: string | null;
}

function parseRtScore(ratings: Array<{ Source: string; Value: string }>): number | null {
  const rt = ratings.find((r) => r.Source === "Rotten Tomatoes");
  if (!rt) return null;
  const pct = parseInt(rt.Value.replace("%", ""), 10);
  return isNaN(pct) ? null : pct;
}

export async function fetchOmdbById(imdbId: string): Promise<OmdbRatings | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) throw new Error("OMDB_API_KEY is not set");

  const url = `${OMDB_BASE}/?apikey=${apiKey}&i=${encodeURIComponent(imdbId)}&plot=short`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.Response === "False") return null;

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
