/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/enrich", () => ({
  enrichTitles: jest.fn(),
}));

import { GET, POST } from "./route";
import { enrichTitles } from "@/lib/enrich";

const mockEnrichTitles = enrichTitles as jest.Mock;

const SECRET = "test-secret";

function makeReq(method: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL("http://localhost/api/enrich"), { method, headers });
}

describe("GET /api/enrich", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SYNC_SECRET = SECRET;
  });

  afterEach(() => { delete process.env.SYNC_SECRET; });

  it("delegates GET to POST handler", async () => {
    mockEnrichTitles.mockResolvedValue({ enriched: 0, failed: 0, remaining: 0 });

    const res = await GET(makeReq("GET", { "x-sync-secret": SECRET }));
    const data = await res.json();

    expect(data.ok).toBe(true);
  });
});

describe("POST /api/enrich", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SYNC_SECRET = SECRET;
  });

  afterEach(() => { delete process.env.SYNC_SECRET; });

  it("returns 401 when not authorized", async () => {
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong secret", async () => {
    const res = await POST(makeReq("POST", { "x-sync-secret": "bad" }));
    expect(res.status).toBe(401);
  });

  it("accepts Authorization Bearer header", async () => {
    mockEnrichTitles.mockResolvedValue({ enriched: 0, failed: 0, remaining: 0 });

    const res = await POST(makeReq("POST", { authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
  });

  it("returns ok/enriched/failed/remaining on success", async () => {
    mockEnrichTitles.mockResolvedValue({ enriched: 5, failed: 1, remaining: 10 });

    const res = await POST(makeReq("POST", { "x-sync-secret": SECRET }));
    const data = await res.json();

    expect(data).toEqual({ ok: true, enriched: 5, failed: 1, remaining: 10 });
  });
});
