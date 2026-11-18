import { addCrash, type CrashWhere } from './outbox';

/*
 * When something in the app breaks, a short report goes to the admin (crashes/ in Firestore,
 * through the outbox, so it waits offline or until sign-in like answers do). It holds what broke
 * and where, never what the learner typed: the error's message and the first lines of its stack,
 * the screen (the URL's hash), the build, and the browser.
 */

/** The build this report came from (vite.config.ts: the commit on Vercel, else the build date). */
export const BUILD: string = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

const MAX_PER_SESSION = 10;
const seen = new Set<string>();

/** A message and a stack out of whatever was thrown. */
export function describeError(err: unknown): { msg: string; stack: string } {
  if (err instanceof Error) return { msg: `${err.name}: ${err.message}`, stack: err.stack ?? '' };
  if (typeof err === 'string') return { msg: err, stack: '' };
  try { return { msg: JSON.stringify(err) ?? String(err), stack: '' }; } catch { return { msg: String(err), stack: '' }; }
}

/**
 * Not ours or not a bug: browser noise, browser extensions, scripts from other sites, a request
 * the app itself cancelled, and a download that failed for want of network (the screen already
 * says so and offers a retry).
 */
export function isNoise(msg: string, stack: string): boolean {
  const all = `${msg}\n${stack}`;
  return /ResizeObserver loop|^Script error\.?$|(chrome|moz|safari(-web)?)-extension:/im.test(all)
    || /AbortError|aborted a request/i.test(msg)
    || /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch|NetworkError|Load failed|ChunkLoadError/i.test(msg);
}

/** The first lines of a stack, without the site's address and file hashes' query strings. */
export function trimStack(stack: string, origin = typeof location !== 'undefined' ? location.origin : ''): string {
  return stack.split('\n').slice(0, 14)
    .map((l) => (origin ? l.split(origin).join('') : l).replace(/\?[^\s:)]*/g, '').slice(0, 200))
    .join('\n').slice(0, 2000);
}

/** Queues a report, once per kind of error per session, at most ten a session. */
export function reportCrash(err: unknown, where: CrashWhere, componentStack = '') {
  try {
    const { msg, stack } = describeError(err);
    if (isNoise(msg, stack)) return;
    const key = `${where}|${msg}`;
    if (seen.has(key) || seen.size >= MAX_PER_SESSION) return;
    seen.add(key);
    addCrash({
      msg: msg.slice(0, 300),
      stack: trimStack(componentStack ? `${stack}\n--- component\n${componentStack.trim()}` : stack),
      where,
      route: typeof location !== 'undefined' ? location.hash.slice(0, 120) : '',
      ver: BUILD,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    });
  } catch { /* reporting must never break anything itself */ }
}

/** For tests: forget which errors this session already reported. */
export const resetCrashSession = () => seen.clear();

/** Errors nothing else caught: thrown in a handler or a timer, or a promise rejected with no one waiting. */
export function installCrashHandlers() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => reportCrash(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportCrash(e.reason, 'promise'));
}
