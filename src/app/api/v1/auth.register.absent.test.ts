import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public registration", () => {
  it("has no register route handler", () => {
    const routeFile = path.join(__dirname, "auth", "register", "route.ts");
    expect(existsSync(routeFile)).toBe(false);
  });
});
