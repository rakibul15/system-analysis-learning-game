import { describe, expect, it } from 'vitest';
import { BOOKS } from '@/features/books/catalog';
import { notes } from './all';

describe('study notes', () => {
  it('have unique ids, real chapters, sane pages, and figure pages inside the chapter', () => {
    expect(new Set(notes.map((n) => n.id)).size).toBe(notes.length);
    for (const n of notes) {
      expect(n.blocks.length, n.id).toBeGreaterThan(5);
      for (const r of [...n.refs, ...n.chapters]) {
        expect(BOOKS[r.book].chapters[r.chapter], `${n.id} ${r.book} ${r.chapter}`).toBeTruthy();
        if (r.pages) expect(r.pages[0]).toBeLessThanOrEqual(r.pages[1]);
      }
      const ch = Object.fromEntries(n.chapters.filter((c) => c.book === 'ddia2' && c.pages).map((c) => [c.chapter, c.pages!]));
      for (const b of n.blocks) {
        if (b.kind !== 'figs') continue;
        const range = ch[b.chapter];
        for (const f of b.items) {
          expect(f.n.startsWith(`${b.chapter}-`), `${n.id} fig ${f.n}`).toBe(true);
          if (range) expect(f.page >= range[0] && f.page <= range[1], `${n.id} fig ${f.n} p${f.page}`).toBe(true);
        }
      }
    }
  });
  it('every chapter of the game has at least one note somewhere', () => {
    const covered = new Set(notes.flatMap((n) => n.levels));
    expect(covered.size).toBeGreaterThanOrEqual(20);
  });
});
