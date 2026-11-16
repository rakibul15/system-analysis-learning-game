import { isEn } from './i18n';

const DIGITS = '০১২৩৪৫৬৭৮৯';

/** 1240 → "১,২৪০" in Bangla mode, "1,240" in English mode. */
export function bn(value: number | string, { grouping = true } = {}): string {
  const text =
    typeof value === 'number' && grouping ? Math.round(value).toLocaleString('en-US') : String(value);
  return isEn ? text : text.replace(/\d/g, (d) => DIGITS[Number(d)]!);
}

/** Overshooting ease-out (easeOutBack), for pops. */
export function easeBack(x: number): number {
  const y = Math.max(0, Math.min(1, x)) - 1;
  return 1 + 2.70158 * y * y * y + 1.70158 * y * y;
}
