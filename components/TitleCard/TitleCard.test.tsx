import { render, screen } from "@testing-library/react";
import { TitleCard, rtColor, TitleItem } from "./TitleCard";

// Mock next/link so it renders as a plain <a>
jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: import("react").ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

const baseItem: TitleItem = {
  id: "1",
  jwId: "jw-123",
  imdbId: "tt1234567",
  title: "Test Movie",
  year: 2022,
  type: "movie",
  genres: ["Drama"],
  posterUrl: null,
  imdbRating: 7.5,
  rtScore: 80,
  metacritic: null,
  rated: "PG-13",
  runtime: "120 min",
  plot: "A test plot.",
  director: "Test Director",
  onNetflix: true,
  onPrime: false,
  ratingsUpdatedAt: null,
};

describe("TitleCard", () => {
  it("renders title", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.getByTitle("Test Movie")).toBeInTheDocument();
  });

  it("renders year and runtime", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.getByText("2022 · 120 min")).toBeInTheDocument();
  });

  it("renders rated chip when rated is set", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.getByText("PG-13")).toBeInTheDocument();
  });

  it("does NOT render rated chip when rated is null", () => {
    render(<TitleCard item={{ ...baseItem, rated: null }} />);
    expect(screen.queryByText("PG-13")).not.toBeInTheDocument();
  });

  it("renders Netflix chip when onNetflix=true", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.getByText("Netflix")).toBeInTheDocument();
  });

  it("does NOT render Netflix chip when onNetflix=false", () => {
    render(<TitleCard item={{ ...baseItem, onNetflix: false }} />);
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
  });

  it("renders Prime chip when onPrime=true", () => {
    render(<TitleCard item={{ ...baseItem, onPrime: true }} />);
    expect(screen.getByText("Prime")).toBeInTheDocument();
  });

  it("does NOT render Prime chip when onPrime=false", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.queryByText("Prime")).not.toBeInTheDocument();
  });

  it("renders RT score chip", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("renders 'RT —' when rtScore is null", () => {
    render(<TitleCard item={{ ...baseItem, rtScore: null }} />);
    expect(screen.getByText("RT —")).toBeInTheDocument();
  });

  it("renders IMDb rating chip", () => {
    render(<TitleCard item={baseItem} />);
    expect(screen.getByText("★ 7.5")).toBeInTheDocument();
  });

  it("does NOT render IMDb chip when imdbRating is null", () => {
    render(<TitleCard item={{ ...baseItem, imdbRating: null }} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("card link points to /title/{jwId}", () => {
    render(<TitleCard item={baseItem} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/title/jw-123");
  });

  it("shows placeholder image when posterUrl is null", () => {
    render(<TitleCard item={baseItem} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("placeholder"));
  });

  it("shows poster image when posterUrl is set", () => {
    render(<TitleCard item={{ ...baseItem, posterUrl: "https://example.com/poster.jpg" }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/poster.jpg");
  });
});

describe("rtColor", () => {
  it("returns red for score >= 75", () => {
    expect(rtColor(75)).toBe("#fa320a");
    expect(rtColor(100)).toBe("#fa320a");
  });

  it("returns yellow for score >= 60 and < 75", () => {
    expect(rtColor(60)).toBe("#f5c518");
    expect(rtColor(74)).toBe("#f5c518");
  });

  it("returns grey for score < 60", () => {
    expect(rtColor(59)).toBe("#757575");
    expect(rtColor(0)).toBe("#757575");
  });
});
