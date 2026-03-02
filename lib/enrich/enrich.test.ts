/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    title: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/omdb", () => ({
  fetchOmdbById: jest.fn(),
}));

// Skip the 350ms rate-limit delay in tests
jest.spyOn(global, "setTimeout").mockImplementation((fn: TimerHandler) => {
  if (typeof fn === "function") fn();
  return 0 as unknown as ReturnType<typeof setTimeout>;
});

import { enrichTitles } from "./enrich";
import { prisma } from "@/lib/prisma";
import { fetchOmdbById } from "@/lib/omdb";

const mockFindMany = prisma.title.findMany as jest.Mock;
const mockUpdate = prisma.title.update as jest.Mock;
const mockCount = prisma.title.count as jest.Mock;
const mockFetchOmdb = fetchOmdbById as jest.Mock;

const OMDB_RATINGS = {
  imdbRating: 8.0, rtScore: 85, metacritic: 70,
  plot: "A plot.", director: "A Director", actors: "Actor One",
  runtime: "120 min", rated: "PG-13",
};

describe("enrichTitles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns enriched=0/failed=0/remaining=0 when no unenriched titles", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await enrichTitles();

    expect(result).toEqual({ enriched: 0, failed: 0, remaining: 0 });
    expect(mockFetchOmdb).not.toHaveBeenCalled();
  });

  it("skips titles with no imdbId and does not call OMDB", async () => {
    mockFindMany.mockResolvedValue([{ id: "t1", imdbId: null }]);
    mockCount.mockResolvedValue(1);

    const result = await enrichTitles();

    expect(mockFetchOmdb).not.toHaveBeenCalled();
    expect(result.enriched).toBe(0);
  });

  it("enriches a title when OMDB returns ratings", async () => {
    mockFindMany.mockResolvedValue([{ id: "t1", imdbId: "tt1234567" }]);
    mockFetchOmdb.mockResolvedValue(OMDB_RATINGS);
    mockUpdate.mockResolvedValue({});
    mockCount.mockResolvedValue(0);

    const result = await enrichTitles();

    expect(result.enriched).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imdbRating: 8.0, rtScore: 85, ratingsUpdatedAt: expect.any(Date) }),
      })
    );
  });

  it("marks title as attempted when OMDB returns null", async () => {
    mockFindMany.mockResolvedValue([{ id: "t1", imdbId: "tt0000000" }]);
    mockFetchOmdb.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({});
    mockCount.mockResolvedValue(0);

    const result = await enrichTitles();

    expect(result.failed).toBe(1);
    expect(result.enriched).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ratingsUpdatedAt: expect.any(Date) }) })
    );
  });

  it("counts failed when OMDB throws", async () => {
    mockFindMany.mockResolvedValue([{ id: "t1", imdbId: "tt1234567" }]);
    mockFetchOmdb.mockRejectedValue(new Error("OMDB down"));
    mockCount.mockResolvedValue(0);

    const result = await enrichTitles();

    expect(result.failed).toBe(1);
    expect(result.enriched).toBe(0);
  });

  it("reports remaining unenriched count", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(42);

    const result = await enrichTitles();

    expect(result.remaining).toBe(42);
  });

  it("uses batchSize parameter in findMany query", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await enrichTitles(25);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25 })
    );
  });
});
