/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    title: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/tmdb", () => ({
  findTmdbByImdb: jest.fn(),
  getRecommendationImdbIds: jest.fn(),
}));

import { getSimilarTitles } from "./similar";
import { prisma } from "@/lib/prisma";
import { findTmdbByImdb, getRecommendationImdbIds } from "@/lib/tmdb";

const mockFindUnique = prisma.title.findUnique as jest.Mock;
const mockFindMany = prisma.title.findMany as jest.Mock;
const mockFindTmdb = findTmdbByImdb as jest.Mock;
const mockGetRecommendations = getRecommendationImdbIds as jest.Mock;

const SAMPLE_TITLE = {
  id: "t1", jwId: "jw-1", imdbId: "tt1234567",
  title: "Test Movie", year: 2022, type: "movie",
  genres: [], posterUrl: null, imdbRating: 7.5, rtScore: 80,
  metacritic: null, rated: "PG-13", runtime: "120 min",
  plot: null, director: null, onNetflix: true, onPrime: false,
  ratingsUpdatedAt: null,
};

describe("getSimilarTitles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns [] when title is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    expect(await getSimilarTitles("jw-unknown")).toEqual([]);
    expect(mockFindTmdb).not.toHaveBeenCalled();
  });

  it("returns [] when title has no imdbId", async () => {
    mockFindUnique.mockResolvedValue({ ...SAMPLE_TITLE, imdbId: null });

    expect(await getSimilarTitles("jw-1")).toEqual([]);
    expect(mockFindTmdb).not.toHaveBeenCalled();
  });

  it("returns [] when TMDB lookup returns null", async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_TITLE);
    mockFindTmdb.mockResolvedValue(null);

    expect(await getSimilarTitles("jw-1")).toEqual([]);
    expect(mockGetRecommendations).not.toHaveBeenCalled();
  });

  it("returns [] when TMDB returns no recommendation IDs", async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_TITLE);
    mockFindTmdb.mockResolvedValue({ tmdbId: 550, mediaType: "movie" });
    mockGetRecommendations.mockResolvedValue([]);

    expect(await getSimilarTitles("jw-1")).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns similar titles that exist in the ZA catalog", async () => {
    const similarTitle = { ...SAMPLE_TITLE, id: "t2", jwId: "jw-2", title: "Similar Movie", ratingsUpdatedAt: new Date("2024-01-01") };
    mockFindUnique.mockResolvedValue(SAMPLE_TITLE);
    mockFindTmdb.mockResolvedValue({ tmdbId: 550, mediaType: "movie" });
    mockGetRecommendations.mockResolvedValue(["tt9999999"]);
    mockFindMany.mockResolvedValue([similarTitle]);

    const result = await getSimilarTitles("jw-1");

    expect(result).toHaveLength(1);
    expect(result[0].jwId).toBe("jw-2");
  });

  it("queries DB only for titles on Netflix or Prime", async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_TITLE);
    mockFindTmdb.mockResolvedValue({ tmdbId: 550, mediaType: "movie" });
    mockGetRecommendations.mockResolvedValue(["tt0111111", "tt0222222"]);
    mockFindMany.mockResolvedValue([]);

    await getSimilarTitles("jw-1");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          imdbId: { in: ["tt0111111", "tt0222222"] },
          OR: [{ onNetflix: true }, { onPrime: true }],
        }),
      })
    );
  });

  it("serialises ratingsUpdatedAt to ISO string", async () => {
    const titleWithDate = { ...SAMPLE_TITLE, id: "t2", ratingsUpdatedAt: new Date("2024-01-01") };
    mockFindUnique.mockResolvedValue(SAMPLE_TITLE);
    mockFindTmdb.mockResolvedValue({ tmdbId: 550, mediaType: "movie" });
    mockGetRecommendations.mockResolvedValue(["tt9999999"]);
    mockFindMany.mockResolvedValue([titleWithDate]);

    const result = await getSimilarTitles("jw-1");

    expect(typeof result[0].ratingsUpdatedAt).toBe("string");
  });

  it("serialises null ratingsUpdatedAt to null", async () => {
    const titleWithNoDate = { ...SAMPLE_TITLE, id: "t2", ratingsUpdatedAt: null };
    mockFindUnique.mockResolvedValue(SAMPLE_TITLE);
    mockFindTmdb.mockResolvedValue({ tmdbId: 550, mediaType: "movie" });
    mockGetRecommendations.mockResolvedValue(["tt9999999"]);
    mockFindMany.mockResolvedValue([titleWithNoDate]);

    const result = await getSimilarTitles("jw-1");

    expect(result[0].ratingsUpdatedAt).toBeNull();
  });
});
