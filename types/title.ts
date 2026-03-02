/**
 * The canonical client-facing shape of a title.
 * Returned by the API and consumed by UI components.
 */
export interface TitleItem {
  id: string;
  jwId: string;
  imdbId: string | null;
  title: string;
  year: number | null;
  type: string;
  genres: string[];
  posterUrl: string | null;
  imdbRating: number | null;
  rtScore: number | null;
  metacritic: number | null;
  rated: string | null;
  runtime: string | null;
  plot: string | null;
  director: string | null;
  actors: string | null;
  onNetflix: boolean;
  onPrime: boolean;
  ratingsUpdatedAt: string | null;
}
