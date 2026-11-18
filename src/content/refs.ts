import { tr } from '@/shared/lib/i18n';

/** The study notes each level links to; they ship inside the app under public/study and open in the in-app reader. */
export const refs = {
  p1: { label: tr('Part ১', 'Part 1') + ' · Vol 1 ch 1–4', url: './#/study/p1' },
  p2: { label: tr('Part ২', 'Part 2') + ' · Vol 1 ch 5–7', url: './#/study/p2' },
  p3: { label: tr('Part ৩', 'Part 3') + ' · Vol 1 ch 8–11', url: './#/study/p3' },
  p4: { label: tr('Part ৪', 'Part 4') + ' · Vol 1 ch 12–15', url: './#/study/p4' },
  p5: { label: tr('Part ৫', 'Part 5') + ' · Vol 2 ch 1–6', url: './#/study/p5' },
  p6: { label: tr('Part ৬', 'Part 6') + ' · Vol 2 ch 7–13', url: './#/study/p6' },
  p7: { label: tr('Part ৭', 'Part 7') + ' · Architecture guide', url: './#/study/p7' },
  hub: { label: tr('Hub ও cheat sheet', 'Hub and cheat sheet'), url: './#/study/hub' },
  // our new chapter notes (src/content/xu), which replace the parts above chapter by chapter
  v1_1: { label: 'Vol 1 ch 1 · ' + tr('শূন্য থেকে লাখো user', 'From zero to millions'), url: './#/xu/v1-1' },
  v1_2: { label: 'Vol 1 ch 2 · ' + tr('মুখে মুখে হিসাব', 'Back-of-the-envelope'), url: './#/xu/v1-2' },
  v1_4: { label: 'Vol 1 ch 4 · Rate limiter', url: './#/xu/v1-4' },
} as const;
