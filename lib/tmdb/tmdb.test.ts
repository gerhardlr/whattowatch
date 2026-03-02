/**
 * @jest-environment node
 */

import { findTmdbByImdb, getRecommendationImdbIds } from "./tmdb";

function mockFetch(...responses: Array<object | null>) {
  let call = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const body = responses[call++] ?? null;
    return Promise.resolve({
      ok: body !== null,
      json: () => Promise.resolve(body),
    });
  }) as jest.Mock;
}

describe("findTmdbByImdb", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, TMDB_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it("returns null when TMDB_API_KEY is not set", async () => {
    delete process.env.TMDB_API_KEY;
    const result = await findTmdbByImdb("tt1234567");
    expect(result).toBeNull();
  });

  it("returns movie result when movie_results is non-empty", async () => {
    mockFetch({ movie_results: [{ id: 550 }], tv_results: [] });
    const result = await findTmdbByImdb("tt1234567");
    expect(result).toEqual({ tmdbId: 550, mediaType: "movie" });
  });

  it("returns tv result when tv_results is non-empty", async () => {
    mockFetch({ movie_results: [], tv_results: [{ id: 1399 }] });
    const result = await findTmdbByImdb("tt0944947");
    expect(result).toEqual({ tmdbId: 1399, mediaType: "tv" });
  });

  it("prefers movie over tv when both have results", async () => {
    mockFetch({ movie_results: [{ id: 100 }], tv_results: [{ id: 200 }] });
    const result = await findTmdbByImdb("tt1234567");
    expect(result?.mediaType).toBe("movie");
  });

  it("returns null when both result arrays are empty", async () => {
    mockFetch({ movie_results: [], tv_results: [] });
    const result = await findTmdbByImdb("tt0000000");
    expect(result).toBeNull();
  });

  it("returns null when fetch fails (not ok)", async () => {
    mockFetch(null);
    const result = await findTmdbByImdb("tt1234567");
    expect(result).toBeNull();
  });

  it("includes the IMDB ID in the fetch URL", async () => {
    mockFetch({ movie_results: [{ id: 1 }], tv_results: [] });
    await findTmdbByImdb("tt9876543");
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/find/tt9876543");
    expect(calledUrl).toContain("external_source=imdb_id");
  });
});

describe("getRecommendationImdbIds", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, TMDB_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it("returns empty array when no recommendations", async () => {
    mockFetch({ results: [] });
    const result = await getRecommendationImdbIds(550, "movie");
    expect(result).toEqual([]);
  });

  it("returns empty array when recommendations fetch fails", async () => {
    mockFetch(null);
    const result = await getRecommendationImdbIds(550, "movie");
    expect(result).toEqual([]);
  });

  it("returns IMDB IDs from external_ids calls", async () => {
    // First call: recommendations list; subsequent: external_ids per result
    mockFetch(
      { results: [{ id: 101 }, { id: 102 }] },
      { imdb_id: "tt0111111" },
      { imdb_id: "tt0222222" }
    );
    const result = await getRecommendationImdbIds(550, "movie");
    expect(result).toEqual(["tt0111111", "tt0222222"]);
  });

  it("filters out results without a valid tt IMDB ID", async () => {
    mockFetch(
      { results: [{ id: 101 }, { id: 102 }, { id: 103 }] },
      { imdb_id: "tt0111111" },
      { imdb_id: null },
      { imdb_id: "nm0000001" } // person ID — not a tt prefix
    );
    const result = await getRecommendationImdbIds(550, "movie");
    expect(result).toEqual(["tt0111111"]);
  });

  it("limits to first 20 recommendations", async () => {
    const manyResults = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
    const externalIdResponses = Array.from({ length: 20 }, (_, i) => ({
      imdb_id: `tt${String(i + 1).padStart(7, "0")}`,
    }));
    mockFetch({ results: manyResults }, ...externalIdResponses);
    const result = await getRecommendationImdbIds(550, "movie");
    expect(result).toHaveLength(20);
  });

  it("uses the correct media type path for tv", async () => {
    mockFetch({ results: [{ id: 200 }] }, { imdb_id: "tt0333333" });
    await getRecommendationImdbIds(1399, "tv");
    const firstCallUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(firstCallUrl).toContain("/tv/1399/recommendations");
  });
});
