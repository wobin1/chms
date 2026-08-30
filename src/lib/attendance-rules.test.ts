import { describe, expect, it } from "vitest";
import { assertUniqueAttendanceCategories } from "@/lib/attendance-rules";
import { ValidationError } from "@/lib/errors";

describe("assertUniqueAttendanceCategories", () => {
  it("allows one row per category", () => {
    expect(() =>
      assertUniqueAttendanceCategories([
        "cat-adults",
        "cat-children",
      ]),
    ).not.toThrow();
  });

  it("rejects two counts for the same category", () => {
    expect(() =>
      assertUniqueAttendanceCategories(["cat-adults", "cat-adults"]),
    ).toThrow(ValidationError);
  });
});
