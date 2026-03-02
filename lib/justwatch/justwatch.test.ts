/**
 * @jest-environment node
 */

import { fetchAllTitles } from "./justwatch";

type OfferOverride = { technicalName: string; monetizationType?: string };

// Minimal JustWatch node factory — offers default to FLATRATE (subscription included)
function makeNode(overrides: {
  id?: string;
  objectType?: string;
  title?: string;
  year?: number | null;
  posterUrl?: string | null;
  imdbId?: string | null;
  genres?: string[];
  offers?: OfferOverride[];
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
    offers: (overrides.offers ?? []).map((o) => ({
      monetizationType: o.monetizationType ?? "FLATRATE",
      package: { technicalName: o.technicalName },
    })),
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
    mockFetch(makePage([]), makePage([]), makePage([]), makePage([]));
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
      offers: [{ technicalName: "netflix" }],
    });
    mockFetch(makePage([node]));
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
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.type).toBe("show");
  });

  it("builds the full poster URL and replaces {format}", async () => {
    const node = makeNode({ posterUrl: "/poster/123/s166/name.{format}" });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.posterUrl).toBe("https://images.justwatch.com/poster/123/s166/name.jpg");
  });

  it("returns null posterUrl when node has no poster", async () => {
    const node = makeNode({ posterUrl: null });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.posterUrl).toBeNull();
  });

  // ── Subscription (FLATRATE) flags ───────────────────────────────────────────

  it("sets onNetflix=true for a FLATRATE netflix offer", async () => {
    const node = makeNode({ offers: [{ technicalName: "netflix" }] });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onNetflix).toBe(true);
    expect(title.onPrime).toBe(false);
  });

  it("sets onPrime=true for a FLATRATE amazonprimevideo offer", async () => {
    const node = makeNode({ offers: [{ technicalName: "amazonprimevideo" }] });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onPrime).toBe(true);
    expect(title.onNetflix).toBe(false);
  });

  it("sets onDisney=true for a FLATRATE disneyplus offer", async () => {
    const node = makeNode({ offers: [{ technicalName: "disneyplus" }] });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onDisney).toBe(true);
  });

  it("sets onApple=true for a FLATRATE appletvplus offer", async () => {
    const node = makeNode({ offers: [{ technicalName: "appletvplus" }] });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onApple).toBe(true);
  });

  // ── Pay (RENT/BUY) flags ────────────────────────────────────────────────────

  it("sets onPrimePay=true for a RENT amazonprimevideo offer", async () => {
    const node = makeNode({
      offers: [{ technicalName: "amazonprimevideo", monetizationType: "RENT" }],
    });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onPrimePay).toBe(true);
    expect(title.onPrime).toBe(false);
  });

  it("sets onPrimePay=true for a BUY amazonprimevideo offer", async () => {
    const node = makeNode({
      offers: [{ technicalName: "amazonprimevideo", monetizationType: "BUY" }],
    });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onPrimePay).toBe(true);
    expect(title.onPrime).toBe(false);
  });

  it("sets onApplePay=true for a RENT appletvplus offer", async () => {
    const node = makeNode({
      offers: [{ technicalName: "appletvplus", monetizationType: "RENT" }],
    });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onApplePay).toBe(true);
    expect(title.onApple).toBe(false);
  });

  it("does not set onPrime=true for a RENT offer (flatrate only)", async () => {
    const node = makeNode({
      offers: [{ technicalName: "amazonprimevideo", monetizationType: "RENT" }],
    });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onPrime).toBe(false);
  });

  it("sets both onPrime and onPrimePay when title has FLATRATE and RENT offers", async () => {
    const node = makeNode({
      offers: [
        { technicalName: "amazonprimevideo", monetizationType: "FLATRATE" },
        { technicalName: "amazonprimevideo", monetizationType: "RENT" },
      ],
    });
    mockFetch(makePage([node]));
    const [title] = await fetchAllTitles();
    expect(title.onPrime).toBe(true);
    expect(title.onPrimePay).toBe(true);
  });

  // ── Deduplication / flag merging ────────────────────────────────────────────

  it("deduplicates titles across providers and merges flatrate flags", async () => {
    const netflixNode = makeNode({ id: "jw-1", offers: [{ technicalName: "netflix" }] });
    const primeNode = makeNode({ id: "jw-1", offers: [{ technicalName: "amazonprimevideo" }] });
    mockFetch(makePage([netflixNode]), makePage([primeNode]));
    const results = await fetchAllTitles();
    expect(results).toHaveLength(1);
    expect(results[0].onNetflix).toBe(true);
    expect(results[0].onPrime).toBe(true);
  });

  it("merges pay flags on deduplication", async () => {
    const primeNode = makeNode({ id: "jw-1", offers: [{ technicalName: "amazonprimevideo" }] });
    const primePayNode = makeNode({
      id: "jw-1",
      offers: [{ technicalName: "amazonprimevideo", monetizationType: "RENT" }],
    });
    mockFetch(makePage([primeNode]), makePage([primePayNode]));
    const results = await fetchAllTitles();
    expect(results).toHaveLength(1);
    expect(results[0].onPrime).toBe(true);
    expect(results[0].onPrimePay).toBe(true);
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  it("paginates through multiple pages", async () => {
    const node1 = makeNode({ id: "jw-1" });
    const node2 = makeNode({ id: "jw-2" });
    mockFetch(
      makePage([node1], true, "cursor-1"),
      makePage([node2], false),
      makePage([])
    );
    const results = await fetchAllTitles();
    expect(results).toHaveLength(2);
  });

  // ── Error handling ──────────────────────────────────────────────────────────

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
