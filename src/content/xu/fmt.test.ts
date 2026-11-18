import { describe, expect, it } from 'vitest';
import { bytes, dur, num, pct } from './fmt';

describe('note number formats', () => {
  it('say numbers the way an estimate does', () => {
    expect(num(115.7)).toBe('১১৬');
    expect(num(2_300_000)).toBe('২.৩M');
    expect(num(4.2e9)).toBe('৪.২B');
    expect(num(7.25)).toBe('৭.৩');
    expect(bytes(73e12)).toBe('৭৩ TB');
    expect(bytes(512_000)).toBe('৫১২ KB');
    expect(dur(31_557.6)).toBe('৮.৮ ঘণ্টা');
    expect(dur(3155.76)).toBe('৫২.৬ মিনিট');
    expect(pct(0.999)).toBe('৯৯.৯%');
    expect(pct(0.99999)).toBe('৯৯.৯৯৯%');
  });
});
