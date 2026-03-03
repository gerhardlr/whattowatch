/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    title: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockCount = prisma.title.count as jest.Mock;
const mockFindMany = prisma.title.findMany as jest.Mock;

function makeReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/titles");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(0);
  mockFindMany.mockResolvedValue([]);
});

function capturedWhere() {
  return mockCount.mock.calls[0][0].where as Record<string, unknown>;
}

function capturedOrderBy() {
  return mockFindMany.mock.calls[0][0].orderBy as Record<string, unknown>;
}

// ── Service filters ───────────────────────────────────────────────────────────

describe("service filter", () => {
  it("sets OR across all services when service=all (default)", async () => {
    await GET(makeReq());
    const where = capturedWhere();
    expect(where).toHaveProperty("OR");
    expect(where).not.toHaveProperty("onNetflix");
  });

  it("filters by onNetflix=true when service=netflix", async () => {
    await GET(makeReq({ service: "netflix" }));
    expect(capturedWhere()).toMatchObject({ onNetflix: true });
  });

  it("filters by onPrime only (no rentbuy) when service=prime", async () => {
    await GET(makeReq({ service: "prime" }));
    const { OR } = capturedWhere() as { OR: object[] };
    expect(OR).toContainEqual({ onPrime: true });
    expect(OR).not.toContainEqual({ onPrimePay: true });
  });

  it("includes onPrimePay when service=prime and rentbuy=1", async () => {
    await GET(makeReq({ service: "prime", rentbuy: "1" }));
    const { OR } = capturedWhere() as { OR: object[] };
    expect(OR).toContainEqual({ onPrime: true });
    expect(OR).toContainEqual({ onPrimePay: true });
  });

  it("filters by onDisney=true when service=disney", async () => {
    await GET(makeReq({ service: "disney" }));
    expect(capturedWhere()).toMatchObject({ onDisney: true });
  });

  it("filters by onApple only (no rentbuy) when service=apple", async () => {
    await GET(makeReq({ service: "apple" }));
    const { OR } = capturedWhere() as { OR: object[] };
    expect(OR).toContainEqual({ onApple: true });
    expect(OR).not.toContainEqual({ onApplePay: true });
  });

  it("includes onApplePay when service=apple and rentbuy=1", async () => {
    await GET(makeReq({ service: "apple", rentbuy: "1" }));
    const { OR } = capturedWhere() as { OR: object[] };
    expect(OR).toContainEqual({ onApple: true });
    expect(OR).toContainEqual({ onApplePay: true });
  });
});

// ── Type filter ───────────────────────────────────────────────────────────────

describe("type filter", () => {
  it("sets no type condition when type=all (default)", async () => {
    await GET(makeReq());
    expect(capturedWhere()).not.toHaveProperty("type");
  });

  it("filters by type=movie", async () => {
    await GET(makeReq({ type: "movie" }));
    expect(capturedWhere()).toMatchObject({ type: "movie" });
  });

  it("filters by type=show", async () => {
    await GET(makeReq({ type: "show" }));
    expect(capturedWhere()).toMatchObject({ type: "show" });
  });
});

// ── Genre filter ──────────────────────────────────────────────────────────────

describe("genre filter", () => {
  it("sets no genre condition when genres param is absent", async () => {
    await GET(makeReq());
    expect(capturedWhere()).not.toHaveProperty("genres");
  });

  it("filters genres using hasSome with a single value", async () => {
    await GET(makeReq({ genres: "Action" }));
    expect(capturedWhere()).toMatchObject({ genres: { hasSome: ["Action"] } });
  });

  it("filters genres using hasSome with multiple comma-separated values", async () => {
    await GET(makeReq({ genres: "Action,Drama" }));
    expect(capturedWhere()).toMatchObject({ genres: { hasSome: ["Action", "Drama"] } });
  });

  it("excludes genres via NOT.hasSome when excludeGenres is set", async () => {
    await GET(makeReq({ excludeGenres: "Horror" }));
    expect(capturedWhere()).toMatchObject({
      NOT: { genres: { hasSome: ["Horror"] } },
    });
  });

  it("can combine include and exclude genres", async () => {
    await GET(makeReq({ genres: "Action", excludeGenres: "Horror" }));
    expect(capturedWhere()).toMatchObject({
      genres: { hasSome: ["Action"] },
      NOT: { genres: { hasSome: ["Horror"] } },
    });
  });
});

// ── Search filter ─────────────────────────────────────────────────────────────

describe("search filter", () => {
  it("sets no title condition when q is absent", async () => {
    await GET(makeReq());
    expect(capturedWhere()).not.toHaveProperty("title");
  });

  it("filters by case-insensitive title contains", async () => {
    await GET(makeReq({ q: "inception" }));
    expect(capturedWhere()).toMatchObject({
      title: { contains: "inception", mode: "insensitive" },
    });
  });
});

// ── Sort ──────────────────────────────────────────────────────────────────────

describe("sort", () => {
  it("defaults to rtScore desc", async () => {
    await GET(makeReq());
    expect(capturedOrderBy()).toEqual({ rtScore: "desc" });
  });

  it("sorts by imdbRating desc when sort=imdbRating", async () => {
    await GET(makeReq({ sort: "imdbRating" }));
    expect(capturedOrderBy()).toEqual({ imdbRating: "desc" });
  });

  it("sorts by year desc when sort=year", async () => {
    await GET(makeReq({ sort: "year" }));
    expect(capturedOrderBy()).toEqual({ year: "desc" });
  });

  it("sorts by title asc when sort=title", async () => {
    await GET(makeReq({ sort: "title" }));
    expect(capturedOrderBy()).toEqual({ title: "asc" });
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe("pagination", () => {
  it("uses page 1 and skip=0 by default", async () => {
    await GET(makeReq());
    expect(mockFindMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 48 });
  });

  it("skips 48 items on page 2", async () => {
    await GET(makeReq({ page: "2" }));
    expect(mockFindMany.mock.calls[0][0]).toMatchObject({ skip: 48, take: 48 });
  });

  it("clamps negative/zero page to page 1", async () => {
    await GET(makeReq({ page: "0" }));
    expect(mockFindMany.mock.calls[0][0]).toMatchObject({ skip: 0 });
  });
});

// ── Response shape ────────────────────────────────────────────────────────────

describe("response shape", () => {
  it("returns titles, total, page, pageSize, totalPages", async () => {
    const fakeTitle = { id: "1", title: "Test" };
    mockCount.mockResolvedValue(100);
    mockFindMany.mockResolvedValue([fakeTitle]);

    const res = await GET(makeReq({ page: "2" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      titles: [fakeTitle],
      total: 100,
      page: 2,
      pageSize: 48,
      totalPages: 3,
    });
  });
});

// ── Combined filters ──────────────────────────────────────────────────────────

describe("combined filters", () => {
  it("applies service + type + genres together", async () => {
    await GET(makeReq({ service: "netflix", type: "movie", genres: "Drama" }));
    expect(capturedWhere()).toMatchObject({
      onNetflix: true,
      type: "movie",
      genres: { hasSome: ["Drama"] },
    });
  });
});
