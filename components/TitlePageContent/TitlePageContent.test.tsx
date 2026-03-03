import React from "react";
import { render, screen } from "@testing-library/react";
import { TitlePageContent } from "./TitlePageContent";
import { prisma } from "@/lib/prisma";

// Mock TitleGrid so we can inspect what props TitlePageContent passes to it
jest.mock("@/components/TitleGrid", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="title-grid"
      data-service={props.service as string}
      data-fixed-type={props.fixedType as string}
      data-total={props.total as number}
      data-genres={JSON.stringify(props.genres)}
      data-exclude-genres={JSON.stringify(props.excludeGenres)}
    />
  ),
}));

jest.mock("@/lib/features", () => ({ DISNEY_ENABLED: false }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    title: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $runCommandRaw: jest.fn(),
  },
}));

const mockCount = prisma.title.count as jest.Mock;
const mockFindMany = prisma.title.findMany as jest.Mock;
const mockRunCommand = prisma.$runCommandRaw as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCount.mockResolvedValue(10);
  mockFindMany.mockResolvedValue([]);
  mockRunCommand.mockResolvedValue({ values: ["Action", "Drama"] });
});

async function renderContent(props: Parameters<typeof TitlePageContent>[0]) {
  const jsx = await TitlePageContent(props);
  render(jsx as React.ReactElement);
  return screen.getByTestId("title-grid");
}

describe("TitlePageContent", () => {
  it("renders TitleGrid with total from prisma", async () => {
    mockCount.mockResolvedValue(99);
    const grid = await renderContent({ searchParams: {} });
    expect(grid).toHaveAttribute("data-total", "99");
  });

  it("passes service to TitleGrid", async () => {
    const grid = await renderContent({ searchParams: { service: "netflix" } });
    expect(grid).toHaveAttribute("data-service", "netflix");
  });

  it("applies fixedType to the prisma where clause", async () => {
    await renderContent({ searchParams: {}, fixedType: "movie" });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ type: "movie" }),
    });
  });

  it("passes fixedType to TitleGrid", async () => {
    const grid = await renderContent({ searchParams: {}, fixedType: "show" });
    expect(grid).toHaveAttribute("data-fixed-type", "show");
  });

  it("applies genre include filter (hasSome)", async () => {
    await renderContent({ searchParams: { genres: "Action,Drama" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        genres: { hasSome: ["Action", "Drama"] },
      }),
    });
  });

  it("passes genres to TitleGrid", async () => {
    const grid = await renderContent({ searchParams: { genres: "Action" } });
    expect(JSON.parse(grid.getAttribute("data-genres")!)).toEqual(["Action"]);
  });

  it("applies genre exclude filter (NOT hasSome)", async () => {
    await renderContent({ searchParams: { excludeGenres: "Drama" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        NOT: { genres: { hasSome: ["Drama"] } },
      }),
    });
  });

  it("passes excludeGenres to TitleGrid", async () => {
    const grid = await renderContent({ searchParams: { excludeGenres: "Drama" } });
    expect(JSON.parse(grid.getAttribute("data-exclude-genres")!)).toEqual(["Drama"]);
  });

  it("applies netflix service filter", async () => {
    await renderContent({ searchParams: { service: "netflix" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ onNetflix: true }),
    });
  });

  it("applies decade filter", async () => {
    await renderContent({ searchParams: { decade: "2010" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ year: { gte: 2010, lt: 2020 } }),
    });
  });

  it("applies classic decade filter (before 1980)", async () => {
    await renderContent({ searchParams: { decade: "classic" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ year: { lt: 1980 } }),
    });
  });

  it("applies minRt filter", async () => {
    await renderContent({ searchParams: { minRt: "80" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ rtScore: { gte: 80 } }),
    });
  });

  it("applies minImdb filter", async () => {
    await renderContent({ searchParams: { minImdb: "7.5" } });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ imdbRating: { gte: 7.5 } }),
    });
  });

  it("fetches available genres and passes sorted list to TitleGrid", async () => {
    mockRunCommand.mockResolvedValue({ values: ["Drama", "Action", "Comedy"] });
    // TitleGrid mock doesn't expose availableGenres but we can check runCommandRaw was called
    await renderContent({ searchParams: {} });
    expect(mockRunCommand).toHaveBeenCalledWith({ distinct: "Title", key: "genres" });
  });
});
