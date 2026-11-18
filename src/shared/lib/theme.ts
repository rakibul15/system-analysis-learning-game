/*
 * Light or dark. The learner chooses in the profile: light, dark, or like my phone (the device
 * setting, followed as it changes). The choice puts data-theme on <html>, which swaps the colour
 * tokens (styles.css). index.html does the same before the first paint, so there is no flash.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';

/** Until learners have seen dark mode, it is something they turn on; then "system" becomes the default. */
export const DEFAULT_THEME: ThemeChoice = 'light';

/** The browser bar's colour for each theme (the page ground). */
const BAR = { light: '#16252D', dark: '#0E171C' } as const;

const deviceDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

export function resolveTheme(choice: ThemeChoice | undefined, dark = deviceDark()): 'light' | 'dark' {
  const c = choice ?? DEFAULT_THEME;
  return c === 'system' ? (dark ? 'dark' : 'light') : c;
}

let chosen: ThemeChoice = DEFAULT_THEME;
let following = false;

export function applyTheme(choice: ThemeChoice | undefined) {
  if (typeof document === 'undefined') return;
  chosen = choice ?? DEFAULT_THEME;
  const t = resolveTheme(chosen);
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', BAR[t]));
  // "like my phone" keeps following the device when it switches (e.g. at sunset)
  if (!following && typeof matchMedia === 'function') {
    following = true;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (chosen === 'system') applyTheme('system'); });
  }
}
