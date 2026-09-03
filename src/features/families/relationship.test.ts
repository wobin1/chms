import { describe, expect, it } from "vitest";
import {
  FAMILY_RELATIONSHIP_OTHER,
  FAMILY_RELATIONSHIP_PRESETS,
  relationshipPresetFromValue,
  relationshipValueFromPreset,
} from "./relationship";

describe("family relationship", () => {
  it("offers Head, Spouse, Child, and Other", () => {
    expect(FAMILY_RELATIONSHIP_PRESETS).toEqual(["Head", "Spouse", "Child"]);
    expect(FAMILY_RELATIONSHIP_OTHER).toBe("Other");
  });

  it("keeps preset values as-is", () => {
    expect(relationshipPresetFromValue("Head")).toBe("Head");
    expect(relationshipValueFromPreset("Spouse", "ignored")).toBe("Spouse");
  });

  it("treats any other text as Other", () => {
    expect(relationshipPresetFromValue("Uncle")).toBe("Other");
    expect(relationshipValueFromPreset("Other", "  Grandparent ")).toBe(
      "Grandparent",
    );
  });

  it("does not submit Other without custom text", () => {
    expect(relationshipValueFromPreset("Other", "   ")).toBe("");
    expect(relationshipValueFromPreset("", "Uncle")).toBe("");
  });
});
