import { ValidationError } from "./errors";

export function assertUniqueAttendanceCategories(categoryIds: string[]) {
  const seen = new Set<string>();
  for (const id of categoryIds) {
    if (seen.has(id)) {
      throw new ValidationError(
        "Each category can have only one count per service",
      );
    }
    seen.add(id);
  }
}
