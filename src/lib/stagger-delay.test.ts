import { describe, expect, it } from "vitest";
import { computeStaggerDelay, STAGGER_WINDOW_MS } from "./stagger-delay";

describe("computeStaggerDelay", () => {
  it("returns zero for a single row", () => {
    expect(computeStaggerDelay(0, 1)).toBe(0);
  });

  it("staggers the first and last row across the full window", () => {
    expect(computeStaggerDelay(0, 10)).toBe(0);
    expect(computeStaggerDelay(9, 10)).toBe(STAGGER_WINDOW_MS);
  });

  it("distributes delays evenly for every row on the page", () => {
    const delays = Array.from({ length: 50 }, (_, index) =>
      computeStaggerDelay(index, 50),
    );

    expect(delays[0]).toBe(0);
    expect(delays[49]).toBe(STAGGER_WINDOW_MS);
    expect(new Set(delays).size).toBe(50);
  });

  it("clamps out-of-range indexes", () => {
    expect(computeStaggerDelay(12, 10)).toBe(STAGGER_WINDOW_MS);
  });
});
