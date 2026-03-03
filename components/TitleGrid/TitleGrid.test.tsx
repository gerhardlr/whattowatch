import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TitleGrid from "./TitleGrid";
import type { TitleItem } from "@/types";

jest.mock("@/lib/features", () => ({ DISNEY_ENABLED: false }));

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: import("react").ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

const mockPush = jest.fn();

// Use a mutable holder so per-test searchParams can be changed via closure reference
const searchParamsHolder = { value: new URLSearchParams() };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => searchParamsHolder.value,
  usePathname: () => "/browse",
}));

const makeTitle = (overrides: Partial<TitleItem> = {}): TitleItem => ({
  id: "1",
  jwId: "jw-1",
  imdbId: null,
  title: "Test Movie",
  year: 2023,
  type: "movie",
  genres: ["Action"],
  posterUrl: null,
  imdbRating: null,
  rtScore: null,
  metacritic: null,
  rated: null,
  runtime: null,
  plot: null,
  director: null,
  actors: null,
  onNetflix: true,
  onPrime: false,
  onPrimePay: false,
  onDisney: false,
  onApple: false,
  onApplePay: false,
  ratingsUpdatedAt: null,
  ...overrides,
});

const baseProps = {
  titles: [],
  total: 0,
  page: 1,
  totalPages: 1,
  availableGenres: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  searchParamsHolder.value = new URLSearchParams();
});

describe("TitleGrid", () => {
  it("shows empty state when there are no titles", () => {
    render(<TitleGrid {...baseProps} />);
    expect(screen.getByText(/no titles found/i)).toBeInTheDocument();
  });

  it("renders a card for each title", () => {
    const titles = [
      makeTitle({ id: "1", jwId: "jw-1", title: "Movie One" }),
      makeTitle({ id: "2", jwId: "jw-2", title: "Movie Two" }),
    ];
    render(<TitleGrid {...baseProps} titles={titles} total={2} />);
    expect(screen.getByTitle("Movie One")).toBeInTheDocument();
    expect(screen.getByTitle("Movie Two")).toBeInTheDocument();
  });

  it("does not show pagination when totalPages is 1", () => {
    render(<TitleGrid {...baseProps} totalPages={1} />);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("shows pagination when totalPages > 1", () => {
    render(<TitleGrid {...baseProps} total={100} totalPages={3} />);
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
  });

  it("calls router.push with page param when a pagination button is clicked", async () => {
    render(<TitleGrid {...baseProps} total={100} totalPages={3} page={1} />);
    await userEvent.click(screen.getByRole("button", { name: /go to page 2/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("resets to page=1 and sets sort param when sort changes", () => {
    render(<TitleGrid {...baseProps} sort="rtScore" page={3} totalPages={5} total={200} />);
    fireEvent.mouseDown(screen.getByText("Rotten Tomatoes"));
    fireEvent.click(screen.getByText("Year (newest)"));
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("sort=year");
    expect(calledUrl).toContain("page=1");
  });

  it("clears rentbuy param when switching away from a rentbuy service", () => {
    searchParamsHolder.value = new URLSearchParams("service=prime&rentbuy=1");
    render(<TitleGrid {...baseProps} service="prime" />);
    // "Prime Video" is the currently displayed value for the service select
    fireEvent.mouseDown(screen.getByText("Prime Video"));
    fireEvent.click(screen.getByText("Netflix"));
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("service=netflix");
    expect(calledUrl).not.toContain("rentbuy");
  });
});
