/**
 * Prefer the first editable field so typing works immediately.
 * Fall back to the first enabled button (e.g. Cancel on confirm dialogs).
 */
export function pickDialogInitialFocus(root: {
  querySelector: (selectors: string) => HTMLElement | null;
}): HTMLElement | null {
  const field = root.querySelector(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
  );
  if (field) return field;
  return root.querySelector("button:not([disabled])");
}
