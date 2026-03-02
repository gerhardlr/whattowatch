/**
 * @jest-environment node
 */

import { fetchOmdbById } from "./omdb";

const FULL_RESPONSE = {
  Response: "True",
  imdbRating: "8.3",
  Metascore: "74",
  Ratings: [
    { Source: "Internet Movie Database", Value: "8.3/10" },
    { Source: "Rotten Tomatoes", Value: "87%" },
    { Source: "Metacritic", Value: "74/100" },
  ],
  Plot: "A test plot.",
  Director: "Christopher Nolan",
  Actors: "Tom Hanks, Robin Wright",
  Runtime: "142 min",
  Rated: "PG-13",
};

function mockFetch(body: object, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as jest.Mock;
}

describe("fetchOmdbById", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, OMDB_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it("throws when OMDB_API_KEY is not set", async () => {
    delete process.env.OMDB_API_KEY;
    await expect(fetchOmdbById("tt1234567")).rejects.toThrow("OMDB_API_KEY is not set");
  });

  it("returns null when fetch response is not ok", async () => {
    mockFetch({}, false);
    const result = await fetchOmdbById("tt1234567");
    expect(result).toBeNull();
  });

  it("returns null when Response=False", async () => {
    mockFetch({ Response: "False", Error: "Movie not found!" });
    const result = await fetchOmdbById("tt9999999");
    expect(result).toBeNull();
  });

  it("parses a full successful response", async () => {
    mockFetch(FULL_RESPONSE);
    const result = await fetchOmdbById("tt1234567");
    expect(result).toEqual({
      imdbRating: 8.3,
      rtScore: 87,
      metacritic: 74,
      plot: "A test plot.",
      director: "Christopher Nolan",
      actors: "Tom Hanks, Robin Wright",
      runtime: "142 min",
      rated: "PG-13",
    });
  });

  it("extracts RT score from Ratings array", async () => {
    mockFetch({ ...FULL_RESPONSE, Ratings: [{ Source: "Rotten Tomatoes", Value: "62%" }] });
    const result = await fetchOmdbById("tt1234567");
    expect(result?.rtScore).toBe(62);
  });

  it("returns null for rtScore when no Rotten Tomatoes rating present", async () => {
    mockFetch({ ...FULL_RESPONSE, Ratings: [] });
    const result = await fetchOmdbById("tt1234567");
    expect(result?.rtScore).toBeNull();
  });

  it("converts N/A string fields to null", async () => {
    mockFetch({
      ...FULL_RESPONSE,
      Plot: "N/A",
      Director: "N/A",
      Actors: "N/A",
      Runtime: "N/A",
      Rated: "N/A",
    });
    const result = await fetchOmdbById("tt1234567");
    expect(result?.plot).toBeNull();
    expect(result?.director).toBeNull();
    expect(result?.actors).toBeNull();
    expect(result?.runtime).toBeNull();
    expect(result?.rated).toBeNull();
  });

  it("converts non-numeric imdbRating to null", async () => {
    mockFetch({ ...FULL_RESPONSE, imdbRating: "N/A" });
    const result = await fetchOmdbById("tt1234567");
    expect(result?.imdbRating).toBeNull();
  });

  it("converts non-numeric Metascore to null", async () => {
    mockFetch({ ...FULL_RESPONSE, Metascore: "N/A" });
    const result = await fetchOmdbById("tt1234567");
    expect(result?.metacritic).toBeNull();
  });

  it("includes the IMDB ID and API key in the fetch URL", async () => {
    mockFetch(FULL_RESPONSE);
    await fetchOmdbById("tt9876543");
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("i=tt9876543");
    expect(calledUrl).toContain("apikey=test-key");
  });
});
