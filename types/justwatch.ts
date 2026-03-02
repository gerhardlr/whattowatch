/**
 * Types for the JustWatch catalog domain.
 */
export type JWTitleType = "MOVIE" | "SHOW";

export interface JWTitle {
  jwId: string;
  imdbId: string | null;
  title: string;
  year: number | null;
  type: "movie" | "show";
  genres: string[];
  posterUrl: string | null;
  onNetflix: boolean;
  onPrime: boolean;
  onPrimePay: boolean;
  onDisney: boolean;
  onApple: boolean;
  onApplePay: boolean;
}
