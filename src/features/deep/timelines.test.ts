import { describe, expect, it } from 'vitest';
import { notesById } from '@/content/notes';
import { timelines } from './timelines';

describe('deep-dive timelines', () => {
  it('are well formed: lanes exist, predictions have four distinct options, notes exist', () => {
    expect(timelines.length).toBeGreaterThanOrEqual(10);
    expect(new Set(timelines.map((t) => t.id)).size).toBe(timelines.length);
    for (const t of timelines) {
      const lanes = new Set(t.lanes.map((l) => l.id));
      expect(t.steps.length, t.id).toBeGreaterThanOrEqual(4);
      expect(t.steps.some((s) => s.predict), `${t.id} has a prediction`).toBe(true);
      if (t.note) expect(notesById[t.note], t.note).toBeTruthy();
      for (const s of t.steps) {
        expect(s.ev.length, `${t.id}: ${s.text}`).toBeGreaterThan(0);
        for (const e of s.ev) {
          if (e.kind === 'msg') { expect(lanes.has(e.from) && lanes.has(e.to), `${t.id} ${e.from}→${e.to}`).toBe(true); expect(e.from).not.toBe(e.to); }
          else expect(lanes.has(e.lane), `${t.id} ${e.lane}`).toBe(true);
        }
        if (s.predict) { expect(s.predict.options).toHaveLength(4); expect(new Set(s.predict.options).size).toBe(4); }
      }
    }
  });
});
