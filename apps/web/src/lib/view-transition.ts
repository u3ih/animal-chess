import { flushSync } from "react-dom";

/**
 * Run a screen-changing state update inside a View Transition (crossfade) where supported, else apply
 * it directly. `flushSync` is required: React 19 batches updates past the snapshot callback, which
 * would make the transition capture identical before/after frames. Keep non-DOM side effects (socket
 * emits) OUTSIDE the callback. Skipped under prefers-reduced-motion.
 */
export function withViewTransition(update: () => void): void {
  const doc =
    typeof document !== "undefined"
      ? (document as Document & { startViewTransition?: (callback: () => void) => void })
      : undefined;
  if (
    !doc ||
    typeof doc.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  doc.startViewTransition(() => {
    flushSync(update);
  });
}
