/**
 * Two languages: Bangla (default) and English.
 * The choice is read once when the app starts, before any content module runs,
 * so module-level text (level content, simulator specs) is built in the right
 * language. Switching saves the choice and reloads.
 */
export type Lang = 'bn' | 'en';
const KEY = 'salg-lang';

function readLang(): Lang {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return v === 'en' ? 'en' : 'bn';
  } catch {
    return 'bn';
  }
}

export const lang: Lang = readLang();
export const isEn = lang === 'en';

/** Pick the text for the current language. */
export const tr = (bn: string, en: string): string => (isEn ? en : bn);

export function switchLang(next: Lang) {
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked: stay as is */ }
  if (typeof location !== 'undefined') location.reload();
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = lang;
  if (isEn) document.title = 'ParcelGo · Learn system design by playing';
}
