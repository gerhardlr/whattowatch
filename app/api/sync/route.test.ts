/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    syncLog: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/sync", () => ({
  syncTitles: jest.fn(),
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { syncTitles } from "@/lib/sync";

const mockFindMany = prisma.syncLog.findMany as jest.Mock;
const mockSyncTitles = syncTitles as jest.Mock;

const SECRET = "test-secret";

function makeReq(method: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL("http://localhost/api/sync"), { method, headers });
}

describe("GET /api/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SYNC_SECRET = SECRET;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  afterEach(() => { delete process.env.SYNC_SECRET; });

  it("returns recent sync logs when no auth header", async () => {
    const fakeLogs = [{ id: "1", status: "completed" }];
    mockFindMany.mockResolvedValue(fakeLogs);

    const res = await GET(makeReq("GET"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(fakeLogs);
  });

  it("delegates to POST when cron Authorization header matches", async () => {
    mockSyncTitles.mockResolvedValue({ titlesSynced: 0, syncId: "sync-1" });

    const res = await GET(makeReq("GET", { authorization: `Bearer ${SECRET}` }));
    const data = await res.json();

    expect(data.ok).toBe(true);
  });
});

describe("POST /api/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SYNC_SECRET = SECRET;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  afterEach(() => { delete process.env.SYNC_SECRET; });

  it("returns 401 when no secret header provided", async () => {
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong secret provided", async () => {
    const res = await POST(makeReq("POST", { "x-sync-secret": "wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with ok/titlesSynced/syncId on success", async () => {
    mockSyncTitles.mockResolvedValue({ titlesSynced: 42, syncId: "sync-1" });

    const res = await POST(makeReq("POST", { "x-sync-secret": SECRET }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true, titlesSynced: 42, syncId: "sync-1" });
  });

  it("returns 409 when syncTitles throws ALREADY_RUNNING", async () => {
    const err = Object.assign(new Error("Sync already in progress"), {
      code: "ALREADY_RUNNING",
      syncId: "running-1",
    });
    mockSyncTitles.mockRejectedValue(err);

    const res = await POST(makeReq("POST", { "x-sync-secret": SECRET }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already in progress/i);
    expect(data.syncId).toBe("running-1");
  });

  it("returns 500 when syncTitles throws a generic error", async () => {
    mockSyncTitles.mockRejectedValue(new Error("Network failure"));

    const res = await POST(makeReq("POST", { "x-sync-secret": SECRET }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Network failure");
  });

  it("accepts secret via Authorization Bearer header", async () => {
    mockSyncTitles.mockResolvedValue({ titlesSynced: 0, syncId: "sync-1" });

    const res = await POST(makeReq("POST", { authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
  });
});
