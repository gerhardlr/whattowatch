/**
 * Prisma orderBy builder for the Title model.
 *
 * Maps the `sort` URL parameter string to a Prisma.TitleOrderByWithRelationInput:
 *   - "rtScore"    → rtScore desc  (default)
 *   - "imdbRating" → imdbRating desc
 *   - "metacritic" → metacritic desc
 *   - "year"       → year desc
 *   - "title"      → title asc
 */
import { Prisma } from "@prisma/client";

export function buildOrderBy(sort: string): Prisma.TitleOrderByWithRelationInput {
  if (sort === "imdbRating") return { imdbRating: "desc" };
  if (sort === "metacritic") return { metacritic: "desc" };
  if (sort === "year") return { year: "desc" };
  if (sort === "title") return { title: "asc" };
  return { rtScore: "desc" };
}
