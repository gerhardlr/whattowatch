import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar, FilterBarProps } from "./FilterBar";

// MUI Select renders as a div with role="combobox", not a native <select>.
// TextField renders as <input> with role="textbox".
// We use getByRole("textbox") for text fields and label text checks for selects.

const defaultProps: FilterBarProps = {
  total: 120,
  availableGenres: ["Drama", "Comedy", "Horror"],
  onParamChange: jest.fn(),
  onSaChange: jest.fn(),
};

function renderFilterBar(overrides: Partial<FilterBarProps> = {}) {
  return render(<FilterBar {...defaultProps} {...overrides} />);
}

// Helper: find a label element by exact text
function getLabel(text: string) {
  return screen.getByText(text, { selector: "label" });
}
function queryLabel(text: string) {
  return screen.queryByText(text, { selector: "label" });
}

describe("FilterBar — presence", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders Search input", () => {
    renderFilterBar();
    expect(screen.getByRole("textbox", { name: /search/i })).toBeInTheDocument();
  });

  it("renders Service label", () => {
    renderFilterBar();
    expect(getLabel("Service")).toBeInTheDocument();
  });

  it("renders Sort by label", () => {
    renderFilterBar();
    expect(getLabel("Sort by")).toBeInTheDocument();
  });

  it("renders Type label when fixedType is not set", () => {
    renderFilterBar({ fixedType: undefined });
    expect(getLabel("Type")).toBeInTheDocument();
  });

  it("does NOT render Type label when fixedType is set", () => {
    renderFilterBar({ fixedType: "movie" });
    expect(queryLabel("Type")).not.toBeInTheDocument();
  });

  it("renders Genre label when availableGenres is non-empty", () => {
    renderFilterBar();
    expect(getLabel("Genre")).toBeInTheDocument();
  });

  it("does NOT render Genre label when availableGenres is empty", () => {
    renderFilterBar({ availableGenres: [] });
    expect(queryLabel("Genre")).not.toBeInTheDocument();
  });

  it("renders Decade label", () => {
    renderFilterBar();
    expect(getLabel("Decade")).toBeInTheDocument();
  });

  it("renders Min RT label", () => {
    renderFilterBar();
    expect(getLabel("Min RT")).toBeInTheDocument();
  });

  it("renders Min IMDb label", () => {
    renderFilterBar();
    expect(getLabel("Min IMDb")).toBeInTheDocument();
  });

  it("renders Director input", () => {
    renderFilterBar();
    expect(screen.getByRole("textbox", { name: /director/i })).toBeInTheDocument();
  });

  it("renders Actor input", () => {
    renderFilterBar();
    expect(screen.getByRole("textbox", { name: /actor/i })).toBeInTheDocument();
  });

  it("shows title count", () => {
    renderFilterBar({ total: 42 });
    expect(screen.getByText("42 titles")).toBeInTheDocument();
  });

  it("renders SA toggle switch", () => {
    renderFilterBar();
    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
  });

  it("SA toggle reflects saOnly=true", () => {
    renderFilterBar({ saOnly: true });
    const toggle = screen.getByRole("switch") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it("SA toggle reflects saOnly=false (default)", () => {
    renderFilterBar({ saOnly: false });
    const toggle = screen.getByRole("switch") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });
});

describe("FilterBar — behaviour", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls onSaChange(true) when toggle is clicked", () => {
    const onSaChange = jest.fn();
    renderFilterBar({ onSaChange, saOnly: false });
    fireEvent.click(screen.getByRole("switch"));
    expect(onSaChange).toHaveBeenCalledWith(true);
  });

  it("calls onParamChange with search value on Enter", () => {
    const onParamChange = jest.fn();
    renderFilterBar({ onParamChange });
    const input = screen.getByRole("textbox", { name: /search/i });
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Inception" } });
    expect(onParamChange).toHaveBeenCalledWith("q", "Inception");
  });

  it("calls onParamChange with director value on Enter", () => {
    const onParamChange = jest.fn();
    renderFilterBar({ onParamChange });
    const input = screen.getByRole("textbox", { name: /director/i });
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Nolan" } });
    expect(onParamChange).toHaveBeenCalledWith("director", "Nolan");
  });

  it("calls onParamChange with actor value on Enter", () => {
    const onParamChange = jest.fn();
    renderFilterBar({ onParamChange });
    const input = screen.getByRole("textbox", { name: /actor/i });
    fireEvent.keyDown(input, { key: "Enter", target: { value: "DiCaprio" } });
    expect(onParamChange).toHaveBeenCalledWith("actor", "DiCaprio");
  });

  it("does NOT call onParamChange on non-Enter key", () => {
    const onParamChange = jest.fn();
    renderFilterBar({ onParamChange });
    const input = screen.getByRole("textbox", { name: /search/i });
    fireEvent.keyDown(input, { key: "a", target: { value: "a" } });
    expect(onParamChange).not.toHaveBeenCalled();
  });
});
