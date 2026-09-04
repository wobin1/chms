import { describe, expect, it } from "vitest";
import {
  buildFamilyChildGuardians,
  familyAddChildFormReady,
} from "./add-child-form";

describe("family add-child form", () => {
  it("omits guardians without a member id", () => {
    expect(
      buildFamilyChildGuardians([
        { memberId: "m1", relationship: "Mother" },
        { memberId: "", relationship: "Father" },
        { memberId: "  ", relationship: "Aunt" },
      ]),
    ).toEqual([{ memberId: "m1", relationship: "Mother" }]);
  });

  it("requires first and last name before submit", () => {
    expect(familyAddChildFormReady("", "Ade")).toBe(false);
    expect(familyAddChildFormReady("Chioma", "")).toBe(false);
    expect(familyAddChildFormReady("  ", "Ade")).toBe(false);
    expect(familyAddChildFormReady("Chioma", "Ade")).toBe(true);
  });
});
