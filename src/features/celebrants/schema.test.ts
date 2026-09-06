import { describe, expect, it } from "vitest";
import { celebrantQuerySchema } from "./schema";

describe("celebrant query schema", () => {
  it("defaults to the month period", () => {
    expect(celebrantQuerySchema.parse({})).toEqual({ period: "month" });
  });

  it("accepts month, week, or day with an optional ISO date", () => {
    expect(
      celebrantQuerySchema.parse({ period: "week", on: "2026-09-06" }),
    ).toEqual({ period: "week", on: "2026-09-06" });
    expect(celebrantQuerySchema.parse({ period: "day" }).period).toBe("day");
  });

  it("rejects an invalid period or date", () => {
    expect(() => celebrantQuerySchema.parse({ period: "year" })).toThrow();
    expect(() =>
      celebrantQuerySchema.parse({ period: "month", on: "09/06/2026" }),
    ).toThrow();
  });
});
