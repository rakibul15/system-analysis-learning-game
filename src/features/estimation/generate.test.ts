import { describe, expect, it } from 'vitest';
import { fmtBytes, fmtCount, makeDrill } from './generate';

describe('estimation drill', () => {
  it('formats counts in lakh / crore and bytes in SI units', () => {
    expect(fmtCount(1157)).toBe('১.২ হাজার');
    expect(fmtCount(1_00_00_000)).toBe('১ কোটি');
    expect(fmtCount(50_00_000)).toBe('৫০ লাখ');
    expect(fmtBytes(5e11)).toBe('৫০০ GB');
    expect(fmtBytes(1.825e14)).toBe('১৮৩ TB');
  });

  it('makes distinct options with exactly one right answer', () => {
    for (const q of makeDrill(42, 50)) {
      expect(new Set(q.options).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });

  it('is repeatable for a seed', () => {
    expect(makeDrill(7)).toEqual(makeDrill(7));
  });
});
