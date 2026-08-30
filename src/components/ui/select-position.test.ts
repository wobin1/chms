import { describe, expect, it } from "vitest";
import { computeSelectPanelPosition } from "./select-position";

describe("computeSelectPanelPosition", () => {
  const triggerNearBottom = {
    top: 720,
    bottom: 764,
    left: 120,
    width: 280,
  };

  it("opens downward when there is enough space below", () => {
    expect(
      computeSelectPanelPosition({
        triggerRect: { top: 200, bottom: 244, left: 120, width: 280 },
        panelHeight: 120,
        viewportHeight: 900,
      }),
    ).toEqual({
      top: 250,
      left: 120,
      width: 280,
      maxHeight: 240,
      placement: "bottom",
    });
  });

  it("opens upward when the menu would be clipped at the bottom", () => {
    const position = computeSelectPanelPosition({
      triggerRect: triggerNearBottom,
      panelHeight: 120,
      viewportHeight: 800,
    });

    expect(position.placement).toBe("top");
    expect(position.top).toBeLessThan(triggerNearBottom.top);
    expect(position.top + 120).toBeLessThanOrEqual(triggerNearBottom.top - 6);
  });

  it("caps max height to the available viewport space", () => {
    const position = computeSelectPanelPosition({
      triggerRect: { top: 100, bottom: 144, left: 120, width: 280 },
      panelHeight: 400,
      viewportHeight: 180,
    });

    expect(position.maxHeight).toBeLessThan(240);
    expect(position.top).toBeGreaterThanOrEqual(8);
  });
});
