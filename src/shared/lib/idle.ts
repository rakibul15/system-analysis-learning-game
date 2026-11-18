/**
 * Runs `fn` when the browser has a free moment (requestIdleCallback; Safari has none, so a short
 * timeout there). Returns a function that cancels it. For work the learner should not wait on,
 * such as fetching the content they are likely to open next.
 */
export function whenIdle(fn: () => void, timeout = 2000): () => void {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 300);
  return () => window.clearTimeout(id);
}
