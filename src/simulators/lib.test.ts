import { describe, expect, it } from 'vitest';
import { assign, imbalance, movedFraction, strongQuorum, toBase62, unitHash } from './lib';

const keys = Array.from({ length: 2000 }, (_, i) => unitHash(`key-${i}`));
const servers = (n: number) => Array.from({ length: n }, (_, i) => `S${i}`);

describe('simulator maths', () => {
  it('base 62 of the book example', () => {
    expect(toBase62(11157n)).toBe('2TX');
    expect(toBase62(2009215674938n)).toBe('zn9edcu');
  });

  it('modulo hashing moves most keys when a server is added', () => {
    const moved = movedFraction(assign(keys, servers(4), 'modulo', 1), assign(keys, servers(5), 'modulo', 1));
    expect(moved).toBeGreaterThan(0.6);
  });

  it('a ring moves about 1/(n+1) of keys when a server is added', () => {
    const moved = movedFraction(assign(keys, servers(4), 'ring', 150), assign(keys, servers(5), 'ring', 150));
    expect(moved).toBeGreaterThan(0.1);
    expect(moved).toBeLessThan(0.3);
  });

  it('more virtual nodes make the split more even', () => {
    const few = imbalance(assign(keys, servers(5), 'ring', 1), servers(5));
    const many = imbalance(assign(keys, servers(5), 'ring', 200), servers(5));
    expect(many).toBeLessThan(few);
    expect(many).toBeLessThan(0.1);
  });

  it('quorum rule', () => {
    expect(strongQuorum(3, 2, 2)).toBe(true);
    expect(strongQuorum(3, 1, 1)).toBe(false);
  });
});
