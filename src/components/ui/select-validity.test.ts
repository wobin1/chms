import { describe, expect, it } from "vitest";
import { messageForRequiredSelect } from "./select-validity";

describe("messageForRequiredSelect", () => {
  it("names the field when a label is provided", () => {
    expect(messageForRequiredSelect("membership status")).toBe(
      "Choose a membership status.",
    );
  });

  it("falls back to a generic select message", () => {
    expect(messageForRequiredSelect()).toBe("Please select an option.");
  });
});
