const NAME_COLUMN_HEADERS = new Set(["Name", "Last name", "First name"]);

/** Name-related columns open the row detail when clicked. */
export function isNameColumnHeader(header: unknown): boolean {
  return typeof header === "string" && NAME_COLUMN_HEADERS.has(header);
}
