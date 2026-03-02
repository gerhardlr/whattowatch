/**
 * Ratings and metadata returned by the OMDB API for a single title.
 */
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
