import type { TitleItem } from "./title";

/** Common error envelope returned by all API routes on failure. */
export interface ErrorResponse {
  error: string;
}

/** POST /api/sync — successful sync response. */
export interface SyncResponse {
  ok: true;
  titlesSynced: number;
  syncId: string;
}

/** POST /api/enrich — successful enrichment batch response. */
export interface EnrichResponse {
  ok: true;
  enriched: number;
  failed: number;
  remaining: number;
}

/** GET /api/similar — similar titles response. */
export interface SimilarResponse {
  similar: TitleItem[];
}
