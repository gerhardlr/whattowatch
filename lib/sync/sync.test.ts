/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    title: {
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    syncLog: {
      create: jest.fn(),
      update: jest.fn(),
    },
    syncState: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/justwatch", () => ({
  fetchGenres: jest.fn(),
}));

jest.mock("@/lib/justwatch/fetchTitles", () => ({
  fetchProviderPage: jest.fn(),
  fetchGenrePage: jest.fn(),
}));

jest.mock("@/lib/justwatch/config", () => ({
  __esModule: true,
  default: { providers: ["netflix", "amazonprimevideo", "appletvplus"] },
}));

import { startSync, runSyncStep } from "./sync";
import { prisma } from "@/lib/prisma";
import { fetchGenres } from "@/lib/justwatch";
import { fetchProviderPage, fetchGenrePage } from "@/lib/justwatch/fetchTitles";

const mockUpdateMany = prisma.title.updateMany as jest.Mock;
const mockTitleUpsert = prisma.title.upsert as jest.Mock;
const mockSyncLogCreate = prisma.syncLog.create as jest.Mock;
const mockSyncLogUpdate = prisma.syncLog.update as jest.Mock;
const mockStateUpsert = prisma.syncState.upsert as jest.Mock;
const mockStateFindUnique = prisma.syncState.findUnique as jest.Mock;
const mockStateUpdate = prisma.syncState.update as jest.Mock;
const mockStateDelete = prisma.syncState.delete as jest.Mock;
const mockFetchGenres = fetchGenres as jest.Mock;
const mockFetchProviderPage = fetchProviderPage as jest.Mock;
const mockFetchGenrePage = fetchGenrePage as jest.Mock;

const SAMPLE_TITLE = {
  jwId: "jw-1", imdbId: "tt1", title: "Movie A", type: "movie",
  year: 2022, genres: ["Action"], posterUrl: null,
  onNetflix: true, onPrime: false, onPrimePay: false,
  onDisney: false, onApple: false, onApplePay: false,
};

// Default fetchProviderPage result: one page, no more pages
const PAGE_DONE = { titles: [SAMPLE_TITLE], nextCursor: null, hasMore: false };
// fetchProviderPage result when more pages remain
const PAGE_MORE = { titles: [SAMPLE_TITLE], nextCursor: "cursor-abc", hasMore: true };

const BASE_STATE = {
  id: "singleton",
  syncLogId: "log-1",
  cursor: null,
  titlesSynced: 0,
  genres: ["action", "comedy", "drama"],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTitleUpsert.mockResolvedValue({});
  mockUpdateMany.mockResolvedValue({});
  mockSyncLogCreate.mockResolvedValue({ id: "log-1" });
  mockSyncLogUpdate.mockResolvedValue({});
  mockStateUpsert.mockResolvedValue({});
  mockStateUpdate.mockResolvedValue({});
  mockStateDelete.mockResolvedValue({});
  mockFetchGenres.mockResolvedValue([{ id: "action" }, { id: "comedy" }]);
  mockFetchProviderPage.mockResolvedValue(PAGE_DONE);
  mockFetchGenrePage.mockResolvedValue(PAGE_DONE);
});

// ---------------------------------------------------------------------------
describe("startSync", () => {
  it("resets all provider flags on all titles", async () => {
    await startSync();

    expect(mockUpdateMany).toHaveBeenCalledWith({
      data: {
        onNetflix: false, onPrime: false, onPrimePay: false,
        onDisney: false, onApple: false, onApplePay: false,
      },
    });
  });

  it("creates a SyncLog with status 'running'", async () => {
    await startSync();
    expect(mockSyncLogCreate).toHaveBeenCalledWith({ data: { status: "running" } });
  });

  it("saves SyncState with providers phase at index 0, cursor null, and fetched genre IDs", async () => {
    mockFetchGenres.mockResolvedValue([{ id: "action" }, { id: "comedy" }]);

    await startSync();

    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "singleton" },
        create: expect.objectContaining({
          phase: "providers",
          phaseIndex: 0,
          cursor: null,
          genres: ["action", "comedy"],
          syncLogId: "log-1",
          titlesSynced: 0,
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
describe("runSyncStep", () => {
  it("returns done=true when no SyncState exists", async () => {
    mockStateFindUnique.mockResolvedValue(null);

    const result = await runSyncStep();
    expect(result).toEqual({ done: true, phase: "none" });
  });

  // providers phase — single page chunk -------------------------------------
  it("calls fetchProviderPage with the provider, current cursor, and page limit", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    await runSyncStep();

    expect(mockFetchProviderPage).toHaveBeenCalledWith("netflix", null, expect.any(Number));
    expect(mockTitleUpsert).toHaveBeenCalledTimes(1);
  });

  it("provider upsert update only sets that provider's flags", async () => {
    const netflixTitle = { ...SAMPLE_TITLE, onNetflix: true, onPrime: false };
    mockFetchProviderPage.mockResolvedValue({ titles: [netflixTitle], nextCursor: null, hasMore: false });
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    await runSyncStep();

    const call = mockTitleUpsert.mock.calls[0][0];
    expect(call.update).toHaveProperty("onNetflix", true);
    expect(call.update).not.toHaveProperty("onPrime");
    expect(call.update).not.toHaveProperty("onApple");
  });

  it("advances to the next provider when all pages are done", async () => {
    mockFetchProviderPage.mockResolvedValue(PAGE_DONE);
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "providers", phaseIndex: 1, cursor: null }) })
    );
    expect(result).toEqual({ done: false, phase: "providers[0]=netflix" });
  });

  it("stays on same provider and saves next cursor when more pages remain", async () => {
    mockFetchProviderPage.mockResolvedValue(PAGE_MORE);
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cursor: "cursor-abc" }) })
    );
    // phaseIndex should NOT have advanced
    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ phaseIndex: 1 }) })
    );
    expect(result.done).toBe(false);
  });

  it("passes saved cursor to fetchProviderPage on continuation steps", async () => {
    mockStateFindUnique.mockResolvedValue({
      ...BASE_STATE, phase: "providers", phaseIndex: 0, cursor: "cursor-abc",
    });

    await runSyncStep();

    expect(mockFetchProviderPage).toHaveBeenCalledWith("netflix", "cursor-abc", expect.any(Number));
  });

  it("transitions to genres phase after the last provider's last page", async () => {
    mockFetchProviderPage.mockResolvedValue(PAGE_DONE);
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 2 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "genres", phaseIndex: 0, cursor: null }) })
    );
    expect(result.done).toBe(false);
  });

  // genres phase ------------------------------------------------------------
  it("calls fetchGenrePage with the genre, current cursor, and page limit", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    await runSyncStep();

    expect(mockFetchGenrePage).toHaveBeenCalledWith("action", null, expect.any(Number));
    expect(mockTitleUpsert).toHaveBeenCalledTimes(1);
  });

  it("genre upsert only sets true flags — never writes false", async () => {
    const mixedTitle = { ...SAMPLE_TITLE, onNetflix: true, onPrime: false };
    mockFetchGenrePage.mockResolvedValue({ titles: [mixedTitle], nextCursor: null, hasMore: false });
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    await runSyncStep();

    const call = mockTitleUpsert.mock.calls[0][0];
    expect(call.update).toHaveProperty("onNetflix", true);
    expect(call.update).not.toHaveProperty("onPrime");
  });

  it("stays on same genre and saves cursor when more pages remain", async () => {
    mockFetchGenrePage.mockResolvedValue(PAGE_MORE);
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cursor: "cursor-abc" }) })
    );
    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ phaseIndex: 1 }) })
    );
    expect(result.done).toBe(false);
  });

  it("passes saved cursor to fetchGenrePage on continuation steps", async () => {
    mockStateFindUnique.mockResolvedValue({
      ...BASE_STATE, phase: "genres", phaseIndex: 0, cursor: "cursor-xyz",
    });

    await runSyncStep();

    expect(mockFetchGenrePage).toHaveBeenCalledWith("action", "cursor-xyz", expect.any(Number));
  });

  it("advances to the next genre when all pages are done", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "genres", phaseIndex: 1, cursor: null }) })
    );
    expect(result.done).toBe(false);
  });

  it("transitions to complete phase after the last genre's last page", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 2 });

    await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "complete", phaseIndex: 0, cursor: null }) })
    );
  });

  // complete phase ----------------------------------------------------------
  it("marks SyncLog completed and deletes SyncState on complete phase", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "complete", phaseIndex: 0, titlesSynced: 42 });

    const result = await runSyncStep();

    expect(mockSyncLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log-1" },
        data: expect.objectContaining({ status: "completed", titlesSynced: 42 }),
      })
    );
    expect(mockStateDelete).toHaveBeenCalledWith({ where: { id: "singleton" } });
    expect(result).toEqual({ done: true, phase: "complete" });
  });

  // error handling ----------------------------------------------------------
  it("marks SyncLog as failed and deletes SyncState when a step throws", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });
    mockFetchProviderPage.mockRejectedValue(new Error("API down"));

    await expect(runSyncStep()).rejects.toThrow("API down");

    expect(mockSyncLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed", error: "API down" }),
      })
    );
    expect(mockStateDelete).toHaveBeenCalledWith({ where: { id: "singleton" } });
  });
});
