/**
 * @jest-environment node
 */

import { syncCatalog, fetchTotalTitles, enrichRatings } from "./syncClient";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("syncCatalog", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns titlesSynced on success", async () => {
    mockFetch.mockReturnValue(mockResponse({ titlesSynced: 42 }));

    const result = await syncCatalog();

    expect(result).toEqual({ titlesSynced: 42 });
    expect(mockFetch).toHaveBeenCalledWith("/api/sync", { method: "POST" });
  });

  it("throws with server error message on non-ok response", async () => {
    mockFetch.mockReturnValue(mockResponse({ error: "Sync failed" }, false));

    await expect(syncCatalog()).rejects.toThrow("Sync failed");
  });

  it("throws fallback message when server error is missing", async () => {
    mockFetch.mockReturnValue(mockResponse({}, false));

    await expect(syncCatalog()).rejects.toThrow("Sync failed");
  });
});

describe("fetchTotalTitles", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns total from API response", async () => {
    mockFetch.mockReturnValue(mockResponse({ total: 100, items: [] }));

    const total = await fetchTotalTitles();

    expect(total).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith("/api/titles?page=1&service=all");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockReturnValue(mockResponse({}, false));

    await expect(fetchTotalTitles()).rejects.toThrow("Failed to fetch stats");
  });
});

describe("enrichRatings", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns enriched and remaining on success", async () => {
    mockFetch.mockReturnValue(mockResponse({ enriched: 10, remaining: 5 }));

    const result = await enrichRatings();

    expect(result).toEqual({ enriched: 10, remaining: 5 });
    expect(mockFetch).toHaveBeenCalledWith("/api/enrich", { method: "POST" });
  });

  it("throws with server error message on non-ok response", async () => {
    mockFetch.mockReturnValue(mockResponse({ error: "Enrich failed" }, false));

    await expect(enrichRatings()).rejects.toThrow("Enrich failed");
  });

  it("throws fallback message when server error is missing", async () => {
    mockFetch.mockReturnValue(mockResponse({}, false));

    await expect(enrichRatings()).rejects.toThrow("Enrich failed");
  });
});
