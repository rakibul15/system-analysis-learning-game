import { describe, expect, it } from 'vitest';
import { BOOKS } from '@/features/books/catalog';
import { notesMetaById } from '@/content/meta';
import { windowVerdicts } from '@/widgets/note/widgets';
import { levelsForXu, xuById, xuChapters } from './index';
import { xuNotes } from './all';
import type { XuBlock } from './types';

/** Every piece of text a note shows, to check it. */
function texts(b: XuBlock): string[] {
  switch (b.kind) {
    case 'p': case 'h': return [b.text];
    case 'list': case 'mistakes': return b.items;
    case 'table': return [...b.head, ...b.rows.flat()];
    case 'story': return [b.title, ...b.steps, b.fix];
    case 'tip': return [b.title, b.text];
    case 'check': return b.items.flatMap((i) => [i.q, i.a]);
    case 'stages': return b.stages.flatMap((s) => [s.title, s.problem, s.fix, s.cost]);
    case 'seq': return [b.label, ...b.actors, ...b.steps.flatMap((s) => [s.msg, s.note ?? ''])];
    case 'dialog': return b.lines.map((l) => l.text);
    case 'bars': return [b.label, ...b.items.map((i) => i.label), b.note ?? ''];
    default: return [];
  }
}

const MOVES = new Set(['stages', 'seq', 'calc', 'bars', 'dialog', 'widget', 'flow']);

describe('Alex Xu chapter notes', () => {
  it('cover every chapter of both volumes once, with the book\'s own chapter numbers', () => {
    expect(xuChapters.filter((c) => c.book === 'xu1').map((c) => c.chapter)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(xuChapters.filter((c) => c.book === 'xu2').map((c) => c.chapter)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
    for (const c of xuChapters) expect(BOOKS[c.book].chapters[c.chapter], c.id).toBeTruthy();
  });

  it('every written note is listed, and every listed loader has a note', () => {
    expect(xuNotes.map((n) => n.id).sort()).toEqual(xuChapters.filter((c) => c.load).map((c) => c.id).sort());
    for (const n of xuNotes) expect(xuById[n.id], n.id).toBeTruthy();
  });

  it('each note has goals, a check, and pictures that move', () => {
    for (const n of xuNotes) {
      expect(n.goals.length, n.id).toBeGreaterThanOrEqual(2);
      expect(n.blocks.some((b) => b.kind === 'check'), `${n.id} check`).toBe(true);
      expect(n.blocks.filter((b) => MOVES.has(b.kind)).length, `${n.id} moving pictures`).toBeGreaterThanOrEqual(2);
      for (const id of n.related ?? []) expect(notesMetaById[id], `${n.id} related ${id}`).toBeTruthy();
    }
  });

  it('pictures only point at things that exist', () => {
    const crowded: string[] = [];
    for (const n of xuNotes) for (const b of n.blocks) {
      if (b.kind === 'seq') for (const s of b.steps) expect(s.from < b.actors.length && s.to < b.actors.length, `${n.id} ${s.msg}`).toBe(true);
      const pics = b.kind === 'stages' ? b.stages : b.kind === 'flow' ? [b] : [];
      for (const p of pics) {
        const ids = new Set(p.nodes.map((x) => x.id));
        expect(ids.size, `${n.id} duplicate node`).toBe(p.nodes.length);
        for (const l of p.links) expect(ids.has(l.from) && ids.has(l.to), `${n.id} ${l.from}→${l.to}`).toBe(true);
        for (const x of p.nodes) expect(x.x >= 0 && x.x <= 100 && x.y >= 0 && x.y <= ('h' in p && p.h ? p.h : 34), `${n.id} ${x.id} off the picture`).toBe(true);
        // a box is centred on x and 17 wide unless it says otherwise: it must fit inside the picture and not sit on its neighbour
        const span = (x: { x: number; w?: number }) => [x.x - (x.w ?? 17) / 2, x.x + (x.w ?? 17) / 2] as const;
        const bad: string[] = [];
        for (const x of p.nodes) { const [l, r] = span(x); if (l < -1 || r > 101) bad.push(`${x.id} cut off (${l}..${r})`); }
        for (const a of p.nodes) for (const b of p.nodes) {
          if (a.id >= b.id || Math.abs(a.y - b.y) >= 9) continue;
          const [al, ar] = span(a), [bl, br] = span(b);
          if (!(ar <= bl + 0.5 || br <= al + 0.5)) bad.push(`${a.id}/${b.id} overlap`);
        }
        for (const m of bad) crowded.push(`${n.id} "${'label' in p ? p.label.slice(0, 30) : 'title' in p ? p.title : ''}": ${m}`);
      }
    }
    expect(crowded).toEqual([]);
  });

  it('calculators give finite numbers at both ends of every slider', () => {
    for (const n of xuNotes) for (const b of n.blocks) {
      if (b.kind !== 'calc') continue;
      for (const end of ['min', 'max', 'value'] as const) {
        const v = Object.fromEntries(b.inputs.map((i) => [i.id, i[end]]));
        for (const r of b.out(v)) {
          expect(r.value, `${n.id} ${r.label} at ${end}`).not.toMatch(/NaN|Infinity|undefined/);
          if (r.bar !== undefined) expect(Number.isFinite(r.bar), `${n.id} ${r.label} bar`).toBe(true);
        }
      }
    }
  });

  it('are in our own words: no long runs of English that could be lifted from a book', () => {
    for (const n of xuNotes) for (const b of n.blocks) for (const t of texts(b)) {
      const run = t.match(/(?:[A-Za-z][A-Za-z'’-]*[\s,.;:]+){12,}/);
      expect(run?.[0] ?? null, `${n.id}: "${t.slice(0, 60)}…"`).toBeNull();
    }
  });

  it('levels come from the book references of the game', () => {
    expect(levelsForXu({ book: 'xu1', chapter: 4 })).toContain(4);
    expect(levelsForXu({ book: 'xu1', chapter: 1 })).toEqual([1, 2]);
  });
});

describe('the window-edge picture', () => {
  it('lets twice the limit through at a fixed window\'s edge, and never more than the limit with a sliding one', () => {
    const times = [50, 52, 54, 56, 58, 60.5, 62, 64, 66, 68, 75, 90, 105, 112, 116];
    const most = (mode: 'fixed' | 'sliding') => {
      const ok = windowVerdicts(mode, times, 5);
      return Math.max(...times.map((s) => times.filter((p, k) => ok[k] && p > s - 60 && p <= s).length));
    };
    expect(most('fixed')).toBe(10);
    expect(most('sliding')).toBe(5);
  });
});
