import { challenges, type Challenge } from '@/features/builder/model';
import { REBUILD_DAYS, type ProgressData } from '@/entities/progress/store';
import { DAY_MS, PASS_MARK } from '@/shared/lib/scoring';

export interface RebuildDue { challenge: Challenge; due: number; box: number; first: boolean }

/**
 * Builder challenges whose level you have passed come back to be redrawn from memory:
 * the first time a day after passing, then further apart each time you get it fully right.
 */
export function rebuildQueue(p: ProgressData): RebuildDue[] {
  const out: RebuildDue[] = [];
  for (const c of challenges) {
    const lvl = p.levels[c.level];
    if (!lvl || lvl.best < PASS_MARK) continue;
    const rec = p.rebuilds?.[c.id];
    const due = rec ? rec.due : Date.parse(lvl.lastPlayedAt) + REBUILD_DAYS[0] * DAY_MS;
    out.push({ challenge: c, due, box: rec?.box ?? 0, first: !rec });
  }
  return out.sort((a, b) => a.due - b.due);
}

export const dueRebuilds = (p: ProgressData, now = Date.now()) => rebuildQueue(p).filter((r) => r.due <= now);
