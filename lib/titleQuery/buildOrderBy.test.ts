/**
 * @jest-environment node
 */

import { buildOrderBy } from "./buildOrderBy";

describe("buildOrderBy", () => {
  it("defaults to rtScore desc for unknown/default sort", () => {
    expect(buildOrderBy("rtScore")).toEqual({ rtScore: "desc" });
    expect(buildOrderBy("unknown")).toEqual({ rtScore: "desc" });
  });

  it("sorts by imdbRating desc", () => {
    expect(buildOrderBy("imdbRating")).toEqual({ imdbRating: "desc" });
  });

  it("sorts by metacritic desc", () => {
    expect(buildOrderBy("metacritic")).toEqual({ metacritic: "desc" });
  });

  it("sorts by year desc", () => {
    expect(buildOrderBy("year")).toEqual({ year: "desc" });
  });

  it("sorts by title asc", () => {
    expect(buildOrderBy("title")).toEqual({ title: "asc" });
  });
});
