import { bn } from '@/shared/lib/bn';

/*
 * Number formats for the notes' calculators: rounded the way one would say them in an
 * interview (2.3M, 116, 73 TB), in Bangla digits like the rest of the app.
 */

const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};
/** bn() rounds numbers to whole ones; decimals go through as text. */
const b = (x: number) => (Number.isInteger(x) ? bn(x) : bn(String(x)));

/** 1,234 → ১,২৩৪ · 2,300,000 → ২.৩M · 4.2e9 → ৪.২B */
export function num(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `${b(round(n / 1e9))}B`;
  if (a >= 1e6) return `${b(round(n / 1e6))}M`;
  if (a >= 100) return bn(Math.round(n));
  return b(round(n, a >= 10 ? 0 : 1));
}

/** Bytes in the unit one would say: 512 KB, 3.4 GB, 73 TB. (Powers of 1000, as estimates go.) */
export function bytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let u = 0;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return `${b(n >= 100 ? Math.round(n) : round(n))} ${units[u]}`;
}

/** Seconds as a person would say them: ৮.৬ সেকেন্ড, ৫২.৬ মিনিট, ৮.৮ ঘণ্টা, ৩.৭ দিন. */
export function dur(s: number): string {
  if (s < 1) return `${bn(Math.round(s * 1000))} ms`;
  if (s < 60) return `${b(round(s))} সেকেন্ড`;
  if (s < 3600) return `${b(round(s / 60))} মিনিট`;
  if (s < 2 * 86400) return `${b(round(s / 3600))} ঘণ্টা`;
  return `${b(round(s / 86400))} দিন`;
}

/** 0.999 → 99.9% (as many nines as it has) */
export function pct(a: number): string {
  const s = (a * 100).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return `${bn(s)}%`;
}
