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
  fetchProviderTitles: jest.fn(),
  fetchGenreTitles: jest.fn(),
}));

jest.mock("@/lib/justwatch/config", () => ({
  __esModule: true,
  default: { providers: ["netflix", "amazonprimevideo", "appletvplus"] },
}));

import { startSync, runSyncStep } from "./sync";
import { prisma } from "@/lib/prisma";
import { fetchGenres } from "@/lib/justwatch";
import { fetchProviderTitles, fetchGenreTitles } from "@/lib/justwatch/fetchTitles";

const mockUpdateMany = prisma.title.updateMany as jest.Mock;
const mockTitleUpsert = prisma.title.upsert as jest.Mock;
const mockSyncLogCreate = prisma.syncLog.create as jest.Mock;
const mockSyncLogUpdate = prisma.syncLog.update as jest.Mock;
const mockStateUpsert = prisma.syncState.upsert as jest.Mock;
const mockStateFindUnique = prisma.syncState.findUnique as jest.Mock;
const mockStateUpdate = prisma.syncState.update as jest.Mock;
const mockStateDelete = prisma.syncState.delete as jest.Mock;
const mockFetchGenres = fetchGenres as jest.Mock;
const mockFetchProviderTitles = fetchProviderTitles as jest.Mock;
const mockFetchGenreTitles = fetchGenreTitles as jest.Mock;

const SAMPLE_TITLE = {
  jwId: "jw-1", imdbId: "tt1", title: "Movie A", type: "movie",
  year: 2022, genres: ["Action"], posterUrl: null,
  onNetflix: true, onPrime: false, onPrimePay: false,
  onDisney: false, onApple: false, onApplePay: false,
};

const BASE_STATE = {
  id: "singleton",
  syncLogId: "log-1",
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
  mockFetchProviderTitles.mockResolvedValue([SAMPLE_TITLE]);
  mockFetchGenreTitles.mockResolvedValue([SAMPLE_TITLE]);
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

  it("saves SyncState with providers phase at index 0 and fetched genre IDs", async () => {
    mockFetchGenres.mockResolvedValue([{ id: "action" }, { id: "comedy" }]);

    await startSync();

    expect(mockStateUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "singleton" },
        create: expect.objectContaining({
          phase: "providers",
          phaseIndex: 0,
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

  // providers phase ---------------------------------------------------------
  it("fetches and upserts the current provider's titles", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    await runSyncStep();

    expect(mockFetchProviderTitles).toHaveBeenCalledWith("netflix");
    expect(mockTitleUpsert).toHaveBeenCalledTimes(1);
  });

  it("provider upsert update only sets that provider's flags", async () => {
    const netflixTitle = { ...SAMPLE_TITLE, onNetflix: true, onPrime: false };
    mockFetchProviderTitles.mockResolvedValue([netflixTitle]);
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    await runSyncStep();

    const call = mockTitleUpsert.mock.calls[0][0];
    expect(call.update).toHaveProperty("onNetflix", true);
    expect(call.update).not.toHaveProperty("onPrime");
    expect(call.update).not.toHaveProperty("onApple");
  });

  it("advances to the next provider when not the last", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 0 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "providers", phaseIndex: 1 }) })
    );
    expect(result).toEqual({ done: false, phase: "providers[0]=netflix" });
  });

  it("transitions to genres phase after the last provider", async () => {
    // phaseIndex 2 = appletvplus (last of 3 providers)
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "providers", phaseIndex: 2 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "genres", phaseIndex: 0 }) })
    );
    expect(result.done).toBe(false);
  });

  // genres phase ------------------------------------------------------------
  it("fetches and upserts the current genre's titles", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    await runSyncStep();

    expect(mockFetchGenreTitles).toHaveBeenCalledWith("action");
    expect(mockTitleUpsert).toHaveBeenCalledTimes(1);
  });

  it("genre upsert only sets true flags — never writes false", async () => {
    const mixedTitle = { ...SAMPLE_TITLE, onNetflix: true, onPrime: false };
    mockFetchGenreTitles.mockResolvedValue([mixedTitle]);
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    await runSyncStep();

    const call = mockTitleUpsert.mock.calls[0][0];
    expect(call.update).toHaveProperty("onNetflix", true);
    expect(call.update).not.toHaveProperty("onPrime"); // false flag not written
  });

  it("advances to the next genre when not the last", async () => {
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 0 });

    const result = await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "genres", phaseIndex: 1 }) })
    );
    expect(result.done).toBe(false);
  });

  it("transitions to complete phase after the last genre", async () => {
    // phaseIndex 2 = last of 3 genres ["action", "comedy", "drama"]
    mockStateFindUnique.mockResolvedValue({ ...BASE_STATE, phase: "genres", phaseIndex: 2 });

    await runSyncStep();

    expect(mockStateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phase: "complete", phaseIndex: 0 }) })
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
    mockFetchProviderTitles.mockRejectedValue(new Error("API down"));

    await expect(runSyncStep()).rejects.toThrow("API down");

    expect(mockSyncLogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed", error: "API down" }),
      })
    );
    expect(mockStateDelete).toHaveBeenCalledWith({ where: { id: "singleton" } });
  });
});
