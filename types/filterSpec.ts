/**
 * A predefined filter applied server-side before any URL params.
 *
 * - genres / excludeGenres: replace the user's genre selection entirely
 * - minRt / minImdb: act as a floor — the user's URL param can only raise them
 * - type: locks the content type (same effect as fixedType)
 * - service: locks the streaming service
 */
export interface FilterSpec {
  genres?: string[];
  excludeGenres?: string[];
  minRt?: number;
  minImdb?: number;
  minMetacritic?: number;
  type?: "movie" | "show";
  service?: string;
}
