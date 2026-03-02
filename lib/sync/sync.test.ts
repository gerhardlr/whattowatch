/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    syncLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    title: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/lib/justwatch", () => ({
  fetchAllTitles: jest.fn(),
}));

import { syncTitles } from "./sync";
import { prisma } from "@/lib/prisma";
import { fetchAllTitles } from "@/lib/justwatch";

const mockFindFirst = prisma.syncLog.findFirst as jest.Mock;
const mockCreate = prisma.syncLog.create as jest.Mock;
const mockUpdate = prisma.syncLog.update as jest.Mock;
const mockUpsert = prisma.title.upsert as jest.Mock;
const mockFetchAllTitles = fetchAllTitles as jest.Mock;

const SAMPLE_TITLE = {
  jwId: "jw-1", imdbId: "tt1", title: "Movie A", type: "movie",
  genres: [], onNetflix: true, onPrime: false, year: 2022, posterUrl: null,
};

describe("syncTitles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns titlesSynced and syncId on success", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "sync-1" });
    mockUpdate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({});
    mockFetchAllTitles.mockResolvedValue([SAMPLE_TITLE]);

    const result = await syncTitles();

    expect(result).toEqual({ titlesSynced: 1, syncId: "sync-1" });
  });

  it("throws with code ALREADY_RUNNING when a sync is in progress", async () => {
    mockFindFirst.mockResolvedValue({ id: "running-1", status: "running" });

    await expect(syncTitles()).rejects.toMatchObject({
      message: "Sync already in progress",
      code: "ALREADY_RUNNING",
      syncId: "running-1",
    });
  });

  it("updates syncLog to 'completed' on success", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "sync-1" });
    mockUpdate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({});
    mockFetchAllTitles.mockResolvedValue([SAMPLE_TITLE]);

    await syncTitles();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sync-1" },
        data: expect.objectContaining({ status: "completed", titlesSynced: 1 }),
      })
    );
  });

  it("updates syncLog to 'failed' and rethrows when fetchAllTitles throws", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "sync-1" });
    mockUpdate.mockResolvedValue({});
    mockFetchAllTitles.mockRejectedValue(new Error("Network failure"));

    await expect(syncTitles()).rejects.toThrow("Network failure");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed", error: "Network failure" }),
      })
    );
  });

  it("upserts each title individually", async () => {
    const titles = [
      { ...SAMPLE_TITLE, jwId: "jw-1" },
      { ...SAMPLE_TITLE, jwId: "jw-2", onNetflix: false, onPrime: true },
    ];
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "sync-1" });
    mockUpdate.mockResolvedValue({});
    mockUpsert.mockResolvedValue({});
    mockFetchAllTitles.mockResolvedValue(titles);

    const result = await syncTitles();

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(result.titlesSynced).toBe(2);
  });
});
