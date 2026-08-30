export const SELECT_PANEL_GAP = 6;
export const SELECT_PANEL_MAX_HEIGHT = 240;
export const SELECT_VIEWPORT_MARGIN = 8;

export type SelectPanelPlacement = "top" | "bottom";

export type SelectPanelPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: SelectPanelPlacement;
};

type ComputeSelectPanelPositionInput = {
  triggerRect: Pick<DOMRect, "top" | "bottom" | "left" | "width">;
  panelHeight: number;
  viewportHeight: number;
  gap?: number;
  maxHeight?: number;
  viewportMargin?: number;
};

export function computeSelectPanelPosition(
  input: ComputeSelectPanelPositionInput,
): SelectPanelPosition {
  const gap = input.gap ?? SELECT_PANEL_GAP;
  const maxHeightCap = input.maxHeight ?? SELECT_PANEL_MAX_HEIGHT;
  const viewportMargin = input.viewportMargin ?? SELECT_VIEWPORT_MARGIN;

  const spaceBelow = Math.max(
    0,
    input.viewportHeight - input.triggerRect.bottom - gap - viewportMargin,
  );
  const spaceAbove = Math.max(0, input.triggerRect.top - gap - viewportMargin);
  const naturalHeight = Math.min(input.panelHeight, maxHeightCap);
  const openUp = spaceBelow < naturalHeight && spaceAbove > spaceBelow;

  if (openUp) {
    const maxHeight = Math.min(maxHeightCap, spaceAbove);
    const height = Math.min(input.panelHeight, maxHeight);
    return {
      top: input.triggerRect.top - gap - height,
      left: input.triggerRect.left,
      width: input.triggerRect.width,
      maxHeight,
      placement: "top",
    };
  }

  return {
    top: input.triggerRect.bottom + gap,
    left: input.triggerRect.left,
    width: input.triggerRect.width,
    maxHeight: Math.min(maxHeightCap, spaceBelow),
    placement: "bottom",
  };
}
