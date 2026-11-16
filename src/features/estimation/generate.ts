import { mulberry32 } from '@/simulators/traffic';

/** Back-of-the-envelope drill: the skill is the order of magnitude, so options differ ×10. */

export interface DrillQuestion { prompt: string; options: string[]; answer: number; explain: string }

const DIG = '০১২৩৪৫৬৭৮৯';
const toBn = (s: string) => s.replace(/\d/g, (d) => DIG[Number(d)]!);

function sig2(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString('en-US');
  if (n >= 10) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

/** 12,00,000 → "১২ লাখ"; 3,50,00,000 → "৩.৫ কোটি". */
export function fmtCount(n: number): string {
  if (n >= 1e7) return toBn(`${sig2(n / 1e7)} কোটি`);
  if (n >= 1e5) return toBn(`${sig2(n / 1e5)} লাখ`);
  if (n >= 1e3) return toBn(`${sig2(n / 1e3)} হাজার`);
  return toBn(sig2(n));
}

export function fmtBytes(b: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let u = 0;
  while (b >= 1000 && u < units.length - 1) { b /= 1000; u++; }
  return toBn(`${sig2(b)} ${units[u]}`);
}

type Gen = (r: () => number) => { prompt: string; value: number; fmt: (n: number) => string; explain: string };
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;

const gens: Gen[] = [
  (r) => {
    const dau = pick(r, [1e6, 5e6, 1e7, 5e7, 1e8, 2e8]);
    const per = pick(r, [2, 5, 10, 20, 50]);
    return { prompt: `DAU ${fmtCount(dau)}, প্রতিজন দিনে ${toBn(String(per))}টা request। গড় QPS কত?`, value: (dau * per) / 86400, fmt: fmtCount, explain: `${fmtCount(dau)} × ${toBn(String(per))} ÷ ~১ লাখ সেকেন্ড` };
  },
  (r) => {
    const avg = pick(r, [1200, 3500, 12000, 40000]);
    return { prompt: `গড় QPS ${fmtCount(avg)}। Peak QPS কত ধরবেন?`, value: avg * 2, fmt: fmtCount, explain: 'Peak ≈ গড়ের ২ গুণ' };
  },
  (r) => {
    const items = pick(r, [1e6, 1e7, 1e8]);
    const size = pick(r, [1e3, 1e4, 1e5, 5e5, 2e6]);
    return { prompt: `দিনে ${fmtCount(items)} নতুন জিনিস, প্রতিটা গড়ে ${fmtBytes(size)}। দিনে কত storage?`, value: items * size, fmt: fmtBytes, explain: `${fmtCount(items)} × ${fmtBytes(size)}` };
  },
  (r) => {
    const perDay = pick(r, [1e10, 1e11, 5e11, 1e12]);
    const years = pick(r, [1, 5, 10]);
    return { prompt: `দিনে ${fmtBytes(perDay)} নতুন data। ${toBn(String(years))} বছরে মোট?`, value: perDay * 365 * years, fmt: fmtBytes, explain: `${fmtBytes(perDay)} × ৩৬৫ × ${toBn(String(years))}` };
  },
  (r) => {
    const peak = pick(r, [5000, 20000, 100000, 400000]);
    const perServer = pick(r, [500, 1000, 2000]);
    return { prompt: `Peak QPS ${fmtCount(peak)}, একটা server সামলায় ${fmtCount(perServer)} QPS। কতগুলো server?`, value: peak / perServer, fmt: fmtCount, explain: `${fmtCount(peak)} ÷ ${fmtCount(perServer)}` };
  },
];

export function makeDrill(seed: number, count = 10): DrillQuestion[] {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const g = pick(r, gens)(r);
    const factors = [1, 10, 0.1, 100];
    const opts = factors.map((f) => g.fmt(g.value * f));
    // shuffle, remembering where the right one went
    const order = [0, 1, 2, 3].sort(() => r() - 0.5);
    return { prompt: g.prompt, options: order.map((i) => opts[i]!), answer: order.indexOf(0), explain: `${g.explain} ≈ ${g.fmt(g.value)}` };
  });
}
