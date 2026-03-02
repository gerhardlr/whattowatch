import { render, screen } from "@testing-library/react";
import { TitleDetailClient } from "./TitleDetailClient";
import type { TitleItem } from "@/types";

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: import("react").ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/components/TitleCard", () => ({
  TitleCard: ({ item }: { item: { title: string } }) => (
    <div data-testid="title-card">{item.title}</div>
  ),
  rtColor: (score: number) => (score >= 60 ? "#fa320a" : "#757575"),
}));

const baseItem: TitleItem = {
  id: "1",
  jwId: "jw-123",
  imdbId: "tt1234567",
  title: "Test Movie",
  year: 2021,
  type: "movie",
  genres: ["Action", "Drama"],
  posterUrl: "https://example.com/poster.jpg",
  imdbRating: 7.8,
  rtScore: 85,
  metacritic: 72,
  rated: "PG-13",
  runtime: "110 min",
  plot: "A compelling test plot.",
  director: "Jane Director",
  actors: "Actor One, Actor Two",
  onNetflix: true,
  onPrime: false,
  onPrimePay: false,
  onDisney: false,
  onApple: false,
  onApplePay: false,
  ratingsUpdatedAt: null,
};

const makeSimilar = (id: string, title: string): TitleItem => ({
  ...baseItem,
  id,
  jwId: `jw-${id}`,
  title,
});

// ── Title & meta ──────────────────────────────────────────────────────────────

describe("title and meta", () => {
  it("renders the title", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByRole("heading", { name: "Test Movie" })).toBeInTheDocument();
  });

  it("renders the meta line for a movie", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText("2021 · Movie · PG-13 · 110 min")).toBeInTheDocument();
  });

  it("shows Series in the meta line for type=show", () => {
    render(<TitleDetailClient title={{ ...baseItem, type: "show" }} similar={[]} />);
    expect(screen.getByText(/Series/)).toBeInTheDocument();
  });

  it("omits null meta fields from the meta line", () => {
    render(
      <TitleDetailClient
        title={{ ...baseItem, year: null, rated: null, runtime: null }}
        similar={[]}
      />
    );
    expect(screen.getByText("Movie")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});

// ── Poster ────────────────────────────────────────────────────────────────────

describe("poster", () => {
  it("shows the poster when posterUrl is set", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    const img = screen.getByRole("img", { name: "Test Movie" });
    expect(img).toHaveAttribute("src", "https://example.com/poster.jpg");
  });

  it("shows a placeholder when posterUrl is null", () => {
    render(<TitleDetailClient title={{ ...baseItem, posterUrl: null }} similar={[]} />);
    const img = screen.getByRole("img", { name: "Test Movie" });
    expect(img).toHaveAttribute("src", expect.stringContaining("placeholder"));
  });
});

// ── Genres ────────────────────────────────────────────────────────────────────

describe("genres", () => {
  it("renders a chip for each genre", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
  });

  it("renders no genre chips when genres is empty", () => {
    render(<TitleDetailClient title={{ ...baseItem, genres: [] }} similar={[]} />);
    expect(screen.queryByText("Action")).not.toBeInTheDocument();
  });
});

// ── Ratings ───────────────────────────────────────────────────────────────────

describe("ratings", () => {
  it("shows the RT score chip", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText("🍅 85%")).toBeInTheDocument();
  });

  it("does not show the RT chip when rtScore is null", () => {
    render(<TitleDetailClient title={{ ...baseItem, rtScore: null }} similar={[]} />);
    expect(screen.queryByText(/🍅/)).not.toBeInTheDocument();
  });

  it("shows the IMDb chip with a link when imdbRating and imdbId are set", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText("★ 7.8/10 IMDb")).toBeInTheDocument();
    const imdbChip = screen.getByText("★ 7.8/10 IMDb").closest("a");
    expect(imdbChip).toHaveAttribute("href", "https://www.imdb.com/title/tt1234567");
  });

  it("does not show the IMDb chip when imdbRating is null", () => {
    render(<TitleDetailClient title={{ ...baseItem, imdbRating: null }} similar={[]} />);
    expect(screen.queryByText(/IMDb/)).not.toBeInTheDocument();
  });

  it("does not show the IMDb chip when imdbId is null", () => {
    render(<TitleDetailClient title={{ ...baseItem, imdbId: null }} similar={[]} />);
    expect(screen.queryByText(/IMDb/)).not.toBeInTheDocument();
  });

  it("shows the Metacritic chip", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText("MC 72")).toBeInTheDocument();
  });

  it("does not show the Metacritic chip when metacritic is null", () => {
    render(<TitleDetailClient title={{ ...baseItem, metacritic: null }} similar={[]} />);
    expect(screen.queryByText(/MC/)).not.toBeInTheDocument();
  });
});

// ── Plot, director, cast ──────────────────────────────────────────────────────

describe("plot, director, cast", () => {
  it("shows the plot", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText("A compelling test plot.")).toBeInTheDocument();
  });

  it("does not show plot when null", () => {
    render(<TitleDetailClient title={{ ...baseItem, plot: null }} similar={[]} />);
    expect(screen.queryByText("A compelling test plot.")).not.toBeInTheDocument();
  });

  it("shows the director", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText(/Jane Director/)).toBeInTheDocument();
  });

  it("does not show director section when null", () => {
    render(<TitleDetailClient title={{ ...baseItem, director: null }} similar={[]} />);
    expect(screen.queryByText(/Jane Director/)).not.toBeInTheDocument();
  });

  it("shows the cast", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByText(/Actor One, Actor Two/)).toBeInTheDocument();
  });

  it("does not show cast section when null", () => {
    render(<TitleDetailClient title={{ ...baseItem, actors: null }} similar={[]} />);
    expect(screen.queryByText(/Actor One/)).not.toBeInTheDocument();
  });
});

// ── Watch buttons ─────────────────────────────────────────────────────────────

describe("watch buttons", () => {
  it("shows Watch on Netflix button when onNetflix=true", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.getByRole("link", { name: "Watch on Netflix" })).toBeInTheDocument();
  });

  it("does not show Watch on Netflix when onNetflix=false", () => {
    render(<TitleDetailClient title={{ ...baseItem, onNetflix: false }} similar={[]} />);
    expect(screen.queryByRole("link", { name: "Watch on Netflix" })).not.toBeInTheDocument();
  });

  it("shows Watch on Prime Video when onPrime=true", () => {
    render(<TitleDetailClient title={{ ...baseItem, onPrime: true }} similar={[]} />);
    expect(screen.getByRole("link", { name: "Watch on Prime Video" })).toBeInTheDocument();
  });

  it("does not show Watch on Prime Video when onPrime=false", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.queryByRole("link", { name: "Watch on Prime Video" })).not.toBeInTheDocument();
  });

  it("shows no watch buttons when neither onNetflix nor onPrime", () => {
    render(
      <TitleDetailClient title={{ ...baseItem, onNetflix: false, onPrime: false }} similar={[]} />
    );
    expect(screen.queryByRole("link", { name: /Watch on/ })).not.toBeInTheDocument();
  });

  it("Netflix button links to netflix search for the title", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    const btn = screen.getByRole("link", { name: "Watch on Netflix" });
    expect(btn).toHaveAttribute("href", expect.stringContaining("netflix.com"));
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe("navigation", () => {
  it("back button links to /browse", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    const backLink = screen.getByRole("link", { name: /Browse/ });
    expect(backLink).toHaveAttribute("href", "/browse");
  });
});

// ── Similar titles ────────────────────────────────────────────────────────────

describe("similar titles", () => {
  it("renders a TitleCard for each similar title", () => {
    const similar = [makeSimilar("2", "Similar A"), makeSimilar("3", "Similar B")];
    render(<TitleDetailClient title={baseItem} similar={similar} />);
    expect(screen.getByText("Similar Titles")).toBeInTheDocument();
    expect(screen.getAllByTestId("title-card")).toHaveLength(2);
    expect(screen.getByText("Similar A")).toBeInTheDocument();
    expect(screen.getByText("Similar B")).toBeInTheDocument();
  });

  it("does not render the Similar Titles section when similar is empty", () => {
    render(<TitleDetailClient title={baseItem} similar={[]} />);
    expect(screen.queryByText("Similar Titles")).not.toBeInTheDocument();
    expect(screen.queryByTestId("title-card")).not.toBeInTheDocument();
  });
});
