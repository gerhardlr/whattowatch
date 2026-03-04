/**
 * @jest-environment node
 */

jest.mock("@/lib/features", () => ({ DISNEY_ENABLED: false }));

import { buildWhere } from "./buildWhere";
import type { ResolvedFilters } from "./resolveFilters";

function base(overrides: Partial<ResolvedFilters> = {}): ResolvedFilters {
  return {
    service: "all",
    type: "all",
    sort: "rtScore",
    page: 1,
    saOnly: false,
    includeRentBuy: false,
    selectedGenres: [],
    excludedGenres: [],
    ...overrides,
  };
}

// ── service ───────────────────────────────────────────────────────────────────

describe("service", () => {
  it("sets OR across all services (excl. Disney) when service=all", () => {
    const { OR } = buildWhere(base()) as { OR: object[] };
    expect(OR).toContainEqual({ onNetflix: true });
    expect(OR).toContainEqual({ onPrime: true });
    expect(OR).toContainEqual({ onApple: true });
    expect(OR).not.toContainEqual({ onDisney: true });
  });

  it("sets onNetflix=true when service=netflix", () => {
    expect(buildWhere(base({ service: "netflix" }))).toMatchObject({ onNetflix: true });
  });

  it("sets OR=[onPrime] when service=prime without rentbuy", () => {
    const { OR } = buildWhere(base({ service: "prime" })) as { OR: object[] };
    expect(OR).toContainEqual({ onPrime: true });
    expect(OR).not.toContainEqual({ onPrimePay: true });
  });

  it("includes onPrimePay when service=prime with includeRentBuy", () => {
    const { OR } = buildWhere(base({ service: "prime", includeRentBuy: true })) as { OR: object[] };
    expect(OR).toContainEqual({ onPrimePay: true });
  });

  it("sets onDisney=true when service=disney", () => {
    expect(buildWhere(base({ service: "disney" }))).toMatchObject({ onDisney: true });
  });

  it("sets OR=[onApple] when service=apple without rentbuy", () => {
    const { OR } = buildWhere(base({ service: "apple" })) as { OR: object[] };
    expect(OR).toContainEqual({ onApple: true });
    expect(OR).not.toContainEqual({ onApplePay: true });
  });

  it("includes onApplePay when service=apple with includeRentBuy", () => {
    const { OR } = buildWhere(base({ service: "apple", includeRentBuy: true })) as { OR: object[] };
    expect(OR).toContainEqual({ onApplePay: true });
  });
});

// ── type ──────────────────────────────────────────────────────────────────────

describe("type", () => {
  it("omits type field when type=all", () => {
    expect(buildWhere(base())).not.toHaveProperty("type");
  });

  it("sets type=movie", () => {
    expect(buildWhere(base({ type: "movie" }))).toMatchObject({ type: "movie" });
  });

  it("sets type=show", () => {
    expect(buildWhere(base({ type: "show" }))).toMatchObject({ type: "show" });
  });
});

// ── genres ────────────────────────────────────────────────────────────────────

describe("genres", () => {
  it("omits genres when selectedGenres is empty", () => {
    expect(buildWhere(base())).not.toHaveProperty("genres");
  });

  it("sets hasSome when selectedGenres has values", () => {
    expect(buildWhere(base({ selectedGenres: ["Action", "Drama"] }))).toMatchObject({
      genres: { hasSome: ["Action", "Drama"] },
    });
  });

  it("sets NOT.genres.hasSome when excludedGenres has values", () => {
    expect(buildWhere(base({ excludedGenres: ["Horror"] }))).toMatchObject({
      NOT: { genres: { hasSome: ["Horror"] } },
    });
  });
});

// ── decade ────────────────────────────────────────────────────────────────────

describe("decade", () => {
  it("omits year when decade is not set", () => {
    expect(buildWhere(base())).not.toHaveProperty("year");
  });

  it("sets year < 1980 for 'classic'", () => {
    expect(buildWhere(base({ decade: "classic" }))).toMatchObject({ year: { lt: 1980 } });
  });

  it("sets year range for a decade string", () => {
    expect(buildWhere(base({ decade: "2010" }))).toMatchObject({ year: { gte: 2010, lt: 2020 } });
  });
});

// ── ratings floors ────────────────────────────────────────────────────────────

describe("ratings floors", () => {
  it("omits rtScore/imdbRating/metacritic when floors are unset", () => {
    const where = buildWhere(base());
    expect(where).not.toHaveProperty("rtScore");
    expect(where).not.toHaveProperty("imdbRating");
    expect(where).not.toHaveProperty("metacritic");
  });

  it("sets rtScore gte", () => {
    expect(buildWhere(base({ effectiveMinRt: 80 }))).toMatchObject({ rtScore: { gte: 80 } });
  });

  it("sets imdbRating gte", () => {
    expect(buildWhere(base({ effectiveMinImdb: 7.5 }))).toMatchObject({ imdbRating: { gte: 7.5 } });
  });

  it("sets metacritic gte", () => {
    expect(buildWhere(base({ effectiveMinMetacritic: 75 }))).toMatchObject({ metacritic: { gte: 75 } });
  });
});

// ── text search ───────────────────────────────────────────────────────────────

describe("text search", () => {
  it("omits title/director/actors when not set", () => {
    const where = buildWhere(base());
    expect(where).not.toHaveProperty("title");
    expect(where).not.toHaveProperty("director");
    expect(where).not.toHaveProperty("actors");
  });

  it("sets case-insensitive title contains", () => {
    expect(buildWhere(base({ search: "inception" }))).toMatchObject({
      title: { contains: "inception", mode: "insensitive" },
    });
  });

  it("sets case-insensitive director contains", () => {
    expect(buildWhere(base({ director: "Nolan" }))).toMatchObject({
      director: { contains: "Nolan", mode: "insensitive" },
    });
  });

  it("sets case-insensitive actors contains", () => {
    expect(buildWhere(base({ actor: "DiCaprio" }))).toMatchObject({
      actors: { contains: "DiCaprio", mode: "insensitive" },
    });
  });
});
