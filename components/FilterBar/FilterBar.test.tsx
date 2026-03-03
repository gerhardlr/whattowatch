import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./FilterBar";

jest.mock("@/lib/features", () => ({ DISNEY_ENABLED: false }));

const GENRES = ["Action", "Comedy", "Drama"];

const baseProps = {
  availableGenres: GENRES,
  total: 42,
  onParamChange: jest.fn(),
  onSaChange: jest.fn(),
  onIncludeRentBuyChange: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("FilterBar", () => {
  it("renders without crashing", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByText("42 titles")).toBeInTheDocument();
  });

  it("displays total count with locale formatting", () => {
    render(<FilterBar {...baseProps} total={1234} />);
    expect(screen.getByText("1,234 titles")).toBeInTheDocument();
  });

  it("shows 'All Genres' when no genres prop is provided", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByText("All Genres")).toBeInTheDocument();
  });

  it("shows singular genre count when one genre is selected", () => {
    render(<FilterBar {...baseProps} genres={["Action"]} />);
    expect(screen.getByText("1 genre")).toBeInTheDocument();
  });

  it("shows plural genre count for multiple selected genres", () => {
    render(<FilterBar {...baseProps} genres={["Action", "Comedy"]} />);
    expect(screen.getByText("2 genres")).toBeInTheDocument();
  });

  it("shows 'None' in exclude genre select by default", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("shows singular excluded count for one excluded genre", () => {
    render(<FilterBar {...baseProps} excludeGenres={["Drama"]} />);
    expect(screen.getByText("1 excluded")).toBeInTheDocument();
  });

  it("shows plural excluded count for multiple excluded genres", () => {
    render(<FilterBar {...baseProps} excludeGenres={["Action", "Comedy"]} />);
    expect(screen.getByText("2 excluded")).toBeInTheDocument();
  });

  it("renders the SA toggle label", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByText("Available in SA")).toBeInTheDocument();
  });

  it("SA toggle is checked when saOnly is true", () => {
    render(<FilterBar {...baseProps} saOnly={true} />);
    // MUI Switch renders an <input type="checkbox">; use querySelector since it may be aria-hidden
    const input = document.querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(input?.checked).toBe(true);
  });

  it("SA toggle is unchecked when saOnly is false", () => {
    render(<FilterBar {...baseProps} saOnly={false} />);
    const input = document.querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(input?.checked).toBe(false);
  });

  it("calls onSaChange when SA toggle label is clicked", async () => {
    render(<FilterBar {...baseProps} saOnly={false} />);
    // Clicking the FormControlLabel's text triggers the switch
    await userEvent.click(screen.getByText("Available in SA"));
    expect(baseProps.onSaChange).toHaveBeenCalledWith(true);
  });

  it("does not show Rent/Buy toggle for non-rentbuy services", () => {
    render(<FilterBar {...baseProps} service="netflix" />);
    expect(screen.queryByText(/include rent/i)).not.toBeInTheDocument();
  });

  it("shows Rent/Buy toggle for Prime Video", () => {
    render(<FilterBar {...baseProps} service="prime" />);
    expect(screen.getByText(/include rent/i)).toBeInTheDocument();
  });

  it("shows Rent/Buy toggle for Apple TV+", () => {
    render(<FilterBar {...baseProps} service="apple" />);
    expect(screen.getByText(/include rent/i)).toBeInTheDocument();
  });

  it("hides Type select when fixedType is set", () => {
    render(<FilterBar {...baseProps} fixedType="movie" />);
    // "Type" text appears in both InputLabel and the notched outline legend; when hidden, neither exist
    expect(screen.queryAllByText(/^Type$/i)).toHaveLength(0);
  });

  it("shows Type select when fixedType is not set", () => {
    render(<FilterBar {...baseProps} />);
    // InputLabel + notched outline legend both render "Type"
    expect(screen.queryAllByText(/^Type$/i).length).toBeGreaterThan(0);
  });

  it("calls onParamChange when sort selection changes", () => {
    render(<FilterBar {...baseProps} sort="rtScore" />);
    // MUI Select: mouseDown on displayed value opens the dropdown
    fireEvent.mouseDown(screen.getByText("Rotten Tomatoes"));
    fireEvent.click(screen.getByText("Year (newest)"));
    expect(baseProps.onParamChange).toHaveBeenCalledWith("sort", "year");
  });

  it("renders Director and Actor text fields", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByLabelText(/director/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/actor/i)).toBeInTheDocument();
  });

  it("calls onParamChange for director on Enter", async () => {
    render(<FilterBar {...baseProps} />);
    const directorInput = screen.getByLabelText(/director/i);
    await userEvent.type(directorInput, "Nolan{Enter}");
    expect(baseProps.onParamChange).toHaveBeenCalledWith("director", "Nolan");
  });
});
