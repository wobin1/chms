import { describe, expect, it } from "vitest";
import { FAMILIES_OF_THE_WEEK_GRID_CLASS } from "./families-of-the-week";

describe("families of the week dashboard grid", () => {
  it("lays out featured families in a responsive card grid", () => {
    const classes = FAMILIES_OF_THE_WEEK_GRID_CLASS.split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining([
        "grid",
        "gap-5",
        "sm:grid-cols-2",
        "xl:grid-cols-4",
      ]),
    );
  });
});
