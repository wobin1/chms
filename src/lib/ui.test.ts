import { describe, expect, it } from "vitest";
import { formatApiErrorBody } from "./ui";

describe("formatApiErrorBody", () => {
  it("uses the top-level error when there are no field details", () => {
    expect(formatApiErrorBody({ error: "Unable to save member" }, "fallback")).toBe(
      "Unable to save member",
    );
  });

  it("surfaces Zod field errors instead of a generic Validation failed", () => {
    expect(
      formatApiErrorBody(
        {
          error: "Validation failed",
          details: {
            fieldErrors: {
              membershipStatusId: ["Invalid uuid"],
            },
            formErrors: [],
          },
        },
        "Unable to save member",
      ),
    ).toBe("membershipStatusId: Invalid uuid");
  });

  it("falls back when the body is empty", () => {
    expect(formatApiErrorBody(null, "Unable to save member")).toBe(
      "Unable to save member",
    );
  });
});
