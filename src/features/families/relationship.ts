export const FAMILY_RELATIONSHIP_PRESETS = ["Head", "Spouse", "Child"] as const;

export type FamilyRelationshipPreset =
  (typeof FAMILY_RELATIONSHIP_PRESETS)[number];

export const FAMILY_RELATIONSHIP_OTHER = "Other";

export type FamilyRelationshipSelection =
  | FamilyRelationshipPreset
  | typeof FAMILY_RELATIONSHIP_OTHER
  | "";

export function relationshipPresetFromValue(
  value: string,
): FamilyRelationshipSelection {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed === "Head" ||
    trimmed === "Spouse" ||
    trimmed === "Child"
  ) {
    return trimmed;
  }
  return FAMILY_RELATIONSHIP_OTHER;
}

export function relationshipValueFromPreset(
  preset: FamilyRelationshipSelection,
  otherText: string,
): string {
  if (preset === "Head" || preset === "Spouse" || preset === "Child") {
    return preset;
  }
  if (preset === FAMILY_RELATIONSHIP_OTHER) {
    return otherText.trim();
  }
  return "";
}
