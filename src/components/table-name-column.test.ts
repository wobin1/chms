import { describe, expect, it } from "vitest";
import { isNameColumnHeader } from "./table-name-column";

describe("isNameColumnHeader", () => {
  it("matches Name and person name columns", () => {
    expect(isNameColumnHeader("Name")).toBe(true);
    expect(isNameColumnHeader("Last name")).toBe(true);
    expect(isNameColumnHeader("First name")).toBe(true);
    expect(isNameColumnHeader("Status")).toBe(false);
    expect(isNameColumnHeader("Member")).toBe(false);
    expect(isNameColumnHeader(() => "Name")).toBe(false);
  });
});
