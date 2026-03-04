/**
 * @jest-environment node
 */

import { resolveFilters, mergeFloor } from "./resolveFilters";
import type { TitlePageSearchParams } from "./resolveFilters";

const empty: TitlePageSearchParams = {};

// ── mergeFloor ────────────────────────────────────────────────────────────────

describe("mergeFloor", () => {
  it("returns undefined when both are undefined", () => {
    expect(mergeFloor(undefined, undefined)).toBeUndefined();
  });

  it("returns the spec value when url is undefined", () => {
    expect(mergeFloor(70, undefined)).toBe(70);
  });

  it("returns the url value when spec is undefined", () => {
    expect(mergeFloor(undefined, 80)).toBe(80);
  });

  it("returns the higher of the two values", () => {
    expect(mergeFloor(60, 80)).toBe(80);
    expect(mergeFloor(80, 60)).toBe(80);
  });

  it("returns undefined when both are 0 (falsy floor)", () => {
    expect(mergeFloor(0, 0)).toBeUndefined();
  });
});

// ── service resolution ────────────────────────────────────────────────────────

describe("service resolution", () => {
  it("defaults to 'all' when nothing is set", () => {
    expect(resolveFilters(empty).service).toBe("all");
  });

  it("uses URL param when no filterSpec", () => {
    expect(resolveFilters({ service: "netflix" }).service).toBe("netflix");
  });

  it("filterSpec.service overrides URL param", () => {
    expect(resolveFilters({ service: "netflix" }, undefined, { service: "prime" }).service).toBe("prime");
  });
});

// ── type resolution ───────────────────────────────────────────────────────────

describe("type resolution", () => {
  it("defaults to 'all'", () => {
    expect(resolveFilters(empty).type).toBe("all");
  });

  it("fixedType prop takes highest priority", () => {
    const result = resolveFilters({ type: "show" }, "movie", { type: "show" });
    expect(result.type).toBe("movie");
    expect(result.effectiveFixedType).toBe("movie");
  });

  it("filterSpec.type takes priority over URL param", () => {
    expect(resolveFilters({ type: "show" }, undefined, { type: "movie" }).type).toBe("movie");
  });

  it("falls back to URL param when no fixedType or spec", () => {
    expect(resolveFilters({ type: "show" }).type).toBe("show");
  });
});

// ── genre resolution ──────────────────────────────────────────────────────────

describe("genre resolution", () => {
  it("returns empty arrays by default", () => {
    const { selectedGenres, excludedGenres } = resolveFilters(empty);
    expect(selectedGenres).toEqual([]);
    expect(excludedGenres).toEqual([]);
  });

  it("parses comma-separated genres from URL", () => {
    expect(resolveFilters({ genres: "Action,Drama" }).selectedGenres).toEqual(["Action", "Drama"]);
  });

  it("filterSpec.genres replaces URL genres", () => {
    const result = resolveFilters({ genres: "Action" }, undefined, { genres: ["Comedy"] });
    expect(result.selectedGenres).toEqual(["Comedy"]);
  });

  it("merges filterSpec.excludeGenres with URL excludeGenres (deduped)", () => {
    const result = resolveFilters(
      { excludeGenres: "Horror,Crime" },
      undefined,
      { excludeGenres: ["Horror"] },
    );
    expect(result.excludedGenres).toEqual(["Horror", "Crime"]);
  });
});

// ── ratings floor resolution ──────────────────────────────────────────────────

describe("ratings floor resolution", () => {
  it("effectiveMinRt is undefined by default", () => {
    expect(resolveFilters(empty).effectiveMinRt).toBeUndefined();
  });

  it("uses URL minRt when no spec floor", () => {
    expect(resolveFilters({ minRt: "75" }).effectiveMinRt).toBe(75);
  });

  it("spec floor takes effect when URL is lower", () => {
    expect(resolveFilters({ minRt: "60" }, undefined, { minRt: 80 }).effectiveMinRt).toBe(80);
  });

  it("URL can raise above spec floor", () => {
    expect(resolveFilters({ minRt: "90" }, undefined, { minRt: 80 }).effectiveMinRt).toBe(90);
  });

  it("effectiveMinImdb and effectiveMinMetacritic follow same logic", () => {
    const result = resolveFilters({ minImdb: "7", minMetacritic: "70" });
    expect(result.effectiveMinImdb).toBe(7);
    expect(result.effectiveMinMetacritic).toBe(70);
  });
});

// ── pagination ────────────────────────────────────────────────────────────────

describe("pagination", () => {
  it("defaults to page 1", () => {
    expect(resolveFilters(empty).page).toBe(1);
  });

  it("parses page from URL", () => {
    expect(resolveFilters({ page: "3" }).page).toBe(3);
  });

  it("clamps page to minimum of 1", () => {
    expect(resolveFilters({ page: "0" }).page).toBe(1);
    expect(resolveFilters({ page: "-5" }).page).toBe(1);
  });
});

// ── misc params ───────────────────────────────────────────────────────────────

describe("misc params", () => {
  it("maps q to search", () => {
    expect(resolveFilters({ q: "inception" }).search).toBe("inception");
  });

  it("saOnly is true only when sa=1", () => {
    expect(resolveFilters({ sa: "1" }).saOnly).toBe(true);
    expect(resolveFilters({ sa: "0" }).saOnly).toBe(false);
    expect(resolveFilters(empty).saOnly).toBe(false);
  });

  it("includeRentBuy is true only when rentbuy=1", () => {
    expect(resolveFilters({ rentbuy: "1" }).includeRentBuy).toBe(true);
    expect(resolveFilters(empty).includeRentBuy).toBe(false);
  });

  it("passes through decade, director, actor", () => {
    const result = resolveFilters({ decade: "2010", director: "Nolan", actor: "DiCaprio" });
    expect(result.decade).toBe("2010");
    expect(result.director).toBe("Nolan");
    expect(result.actor).toBe("DiCaprio");
  });
});
