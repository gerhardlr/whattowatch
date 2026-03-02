/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/similar", () => ({
  getSimilarTitles: jest.fn(),
}));

import { GET } from "./route";
import { getSimilarTitles } from "@/lib/similar";

const mockGetSimilarTitles = getSimilarTitles as jest.Mock;

function makeReq(jwId?: string) {
  const url = jwId
    ? `http://localhost/api/similar?jwId=${jwId}`
    : "http://localhost/api/similar";
  return new NextRequest(new URL(url));
}

describe("GET /api/similar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when jwId query param is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing jwId/i);
  });

  it("returns empty similar array when getSimilarTitles returns []", async () => {
    mockGetSimilarTitles.mockResolvedValue([]);

    const res = await GET(makeReq("jw-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.similar).toEqual([]);
  });

  it("returns titles from getSimilarTitles result", async () => {
    const similarTitle = {
      id: "t2", jwId: "jw-2", imdbId: "tt9999", title: "Similar Movie",
      year: 2021, type: "movie", genres: [], posterUrl: null,
      imdbRating: 7.0, rtScore: 72, metacritic: null, rated: null,
      runtime: "110 min", plot: null, director: null,
      onNetflix: true, onPrime: false, ratingsUpdatedAt: "2024-01-01T00:00:00.000Z",
    };
    mockGetSimilarTitles.mockResolvedValue([similarTitle]);

    const res = await GET(makeReq("jw-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.similar).toHaveLength(1);
    expect(data.similar[0].jwId).toBe("jw-2");
  });
});
