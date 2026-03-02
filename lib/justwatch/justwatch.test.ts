/**
 * @jest-environment node
 */

import { fetchAllTitles } from "./justwatch";

// Minimal JustWatch node factory
function makeNode(overrides: {
  id?: string;
  objectType?: string;
  title?: string;
  year?: number | null;
  posterUrl?: string | null;
  imdbId?: string | null;
  genres?: string[];
  offers?: Array<{ package: { technicalName: string } }>;
}) {
  return {
    id: overrides.id ?? "jw-1",
    objectType: overrides.objectType ?? "MOVIE",
    content: {
      title: overrides.title ?? "Test Title",
      originalReleaseYear: overrides.year ?? 2022,
      posterUrl: overrides.posterUrl ?? null,
      genres: (overrides.genres ?? []).map((g) => ({ translation: g })),
      externalIds: { imdbId: overrides.imdbId ?? null },
    },
    offers: overrides.offers ?? [],
  };
}

function makePage(
  nodes: ReturnType<typeof makeNode>[],
  hasNextPage = false,
  endCursor: string | null = null
) {
  return {
    data: {
      popularTitles: {
        edges: nodes.map((node) => ({ node })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  };
}

function mockFetch(...pages: ReturnType<typeof makePage>[]) {
  let call = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const body = pages[call++] ?? makePage([]);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  }) as jest.Mock;
}

describe("fetchAllTitles", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns an empty array when no titles exist", async () => {
    // Two providers, each with an empty page
    mockFetch(makePage([]), makePage([]));
    const result = await fetchAllTitles();
    expect(result).toEqual([]);
  });

  it("maps a movie node to a JWTitle", async () => {
    const node = makeNode({
      id: "jw-99",
      objectType: "MOVIE",
      title: "Inception",
      year: 2010,
      imdbId: "tt1375666",
      genres: ["Science-Fiction", "Action"],
      offers: [{ package: { technicalName: "netflix" } }],
    });
    mockFetch(makePage([node]), makePage([]));
    const [title] = await fetchAllTitles();
    expect(title).toMatchObject({
      jwId: "jw-99",
      title: "Inception",
      year: 2010,
      type: "movie",
      imdbId: "tt1375666",
      genres: ["Science-Fiction", "Action"],
      onNetflix: true,
      onPrime: false,
    });
  });

  it("maps a SHOW node to type='show'", async () => {
    const node = makeNode({ objectType: "SHOW" });
    mockFetch(makePage([node]), makePage([]));
    const [title] = await fetchAllTitles();
    expect(title.type).toBe("show");
  });

  it("builds the full poster URL and replaces {format}", async () => {
    const node = makeNode({ posterUrl: "/poster/123/s166/name.{format}" });
    mockFetch(makePage([node]), makePage([]));
    const [title] = await fetchAllTitles();
    expect(title.posterUrl).toBe("https://images.justwatch.com/poster/123/s166/name.jpg");
  });

  it("returns null posterUrl when node has no poster", async () => {
    const node = makeNode({ posterUrl: null });
    mockFetch(makePage([node]), makePage([]));
    const [title] = await fetchAllTitles();
    expect(title.posterUrl).toBeNull();
  });

  it("derives onNetflix from ZA offers, not query loop", async () => {
    const node = makeNode({ offers: [{ package: { technicalName: "netflix" } }] });
    mockFetch(makePage([node]), makePage([]));
    const [title] = await fetchAllTitles();
    expect(title.onNetflix).toBe(true);
    expect(title.onPrime).toBe(false);
  });

  it("derives onPrime from ZA offers", async () => {
    const node = makeNode({ offers: [{ package: { technicalName: "amazonprimevideo" } }] });
    mockFetch(makePage([node]), makePage([]));
    const [title] = await fetchAllTitles();
    expect(title.onPrime).toBe(true);
    expect(title.onNetflix).toBe(false);
  });

  it("deduplicates titles that appear on both providers and merges flags", async () => {
    const netflixNode = makeNode({ id: "jw-1", offers: [{ package: { technicalName: "netflix" } }] });
    const primeNode = makeNode({ id: "jw-1", offers: [{ package: { technicalName: "amazonprimevideo" } }] });
    // First provider page returns Netflix node, second returns Prime node for same id
    mockFetch(makePage([netflixNode]), makePage([primeNode]));
    const results = await fetchAllTitles();
    expect(results).toHaveLength(1);
    expect(results[0].onNetflix).toBe(true);
    expect(results[0].onPrime).toBe(true);
  });

  it("paginates through multiple pages", async () => {
    const node1 = makeNode({ id: "jw-1" });
    const node2 = makeNode({ id: "jw-2" });
    // Netflix: 2 pages; Prime: 1 empty page
    mockFetch(
      makePage([node1], true, "cursor-1"),
      makePage([node2], false),
      makePage([])
    );
    const results = await fetchAllTitles();
    expect(results).toHaveLength(2);
  });

  it("throws when the API returns an HTTP error", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" }) as jest.Mock;
    await expect(fetchAllTitles()).rejects.toThrow("JustWatch API error");
  });

  it("throws when the API returns GraphQL errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errors: [{ message: "Some GQL error" }] }),
    }) as jest.Mock;
    await expect(fetchAllTitles()).rejects.toThrow("JustWatch GraphQL error");
  });
});
