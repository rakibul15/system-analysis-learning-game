import { levelSchema, type Chapter, type Level, type Question } from '../schema';
import { l1, l2, l3, l4 } from './ch1';
import { l5, l6, l7 } from './ch2';
import { l8, l9, l10, l11, l12, l13, l14, l15 } from './ch3';
import { l16, l17, l18, l19, l20, l21 } from './ch4';
import { l22, l23, l24, l25, l26, l27, l28 } from './ch5';
import { l29, l30 } from './ch6';

const all = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23, l24, l25, l26, l27, l28, l29, l30];

/** Every level, checked against the schema when the app loads. */
export const levelsById: Record<number, Level> = Object.fromEntries(all.map((l) => [l.id, levelSchema.parse(l)]));
export const levelList: Level[] = all.map((l) => levelsById[l.id]!);

export const chapters: Chapter[] = [
  { id: 1, title: 'শূন্য থেকে লাখো customer', subtitle: 'Scale, cache, হিসাব, rate limit', levels: [1, 2, 3, 4], ground: '#DCEBCB', accent: '#0B8A7A' },
  { id: 2, title: 'ছড়ানো system-এর ভিত', subtitle: 'Hashing, key-value, ID', levels: [5, 6, 7], ground: '#E9E2CC', accent: '#B8730A' },
  { id: 3, title: 'ParcelGo-র app-গুলো', subtitle: 'Link, crawler, notification, feed, chat, search, video, sync', levels: [8, 9, 10, 11, 12, 13, 14, 15], ground: '#D9E6F2', accent: '#2F6FDE' },
  { id: 4, title: 'জায়গা আর ঘটনার স্রোত', subtitle: 'Location, map, queue, metrics, stream', levels: [16, 17, 18, 19, 20, 21], ground: '#E4DDF0', accent: '#6B4D9E' },
  { id: 5, title: 'টাকা, slot আর গুদাম', subtitle: 'Reservation, email, storage, ranking, payment, wallet, exchange', levels: [22, 23, 24, 25, 26, 27, 28], ground: '#F2DEDA', accent: '#C7372D' },
  { id: 6, title: 'বড় দিনের প্রস্তুতি', subtitle: 'Resilience আর final interview', levels: [29, 30], ground: '#F5E7C8', accent: '#16252D' },
];

/** Every scored question by id: lesson checkpoints, missions and boss. */
export const questionsById: Record<string, { q: Question; levelId: number }> = {};
for (const l of levelList) {
  const scored = [
    ...l.steps.flatMap((s) => (s.ask ? [s.ask] : [])),
    ...(l.play.kind === 'missions' ? l.play.missions : []),
    ...l.boss,
  ];
  for (const q of scored) questionsById[q.id] = { q, levelId: l.id };
}
