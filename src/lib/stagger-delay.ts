/** Total time window for the last row's entrance delay (Material / WCAG-friendly). */
export const STAGGER_WINDOW_MS = 500;

export function computeStaggerDelay(
  index: number,
  total: number,
  windowMs = STAGGER_WINDOW_MS,
): number {
  if (total <= 1 || index <= 0) return 0;
  if (index >= total) return windowMs;
  return Math.round((index / (total - 1)) * windowMs);
}
