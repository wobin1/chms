import { describe, expect, it, vi } from "vitest";
import { pickDialogInitialFocus } from "./dialog-focus";

describe("pickDialogInitialFocus", () => {
  it("prefers the first enabled text field over Cancel", () => {
    const field = { id: "zoneName" } as HTMLElement;
    const cancel = { id: "cancel" } as HTMLElement;
    const root = {
      querySelector: vi.fn((selector: string) => {
        if (selector.startsWith("input")) return field;
        if (selector.startsWith("button")) return cancel;
        return null;
      }),
    };

    expect(pickDialogInitialFocus(root)?.id).toBe("zoneName");
    expect(root.querySelector).toHaveBeenCalledWith(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    );
  });

  it("falls back to the first enabled button when there is no field", () => {
    const cancel = { id: "cancel" } as HTMLElement;
    const root = {
      querySelector: vi.fn((selector: string) => {
        if (selector.startsWith("button")) return cancel;
        return null;
      }),
    };

    expect(pickDialogInitialFocus(root)?.id).toBe("cancel");
  });
});
