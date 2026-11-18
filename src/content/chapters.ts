import { tr } from '@/shared/lib/i18n';
import type { Chapter } from './schema';

/** The game's chapters and the levels in each, in map order. */
export const chapters: Chapter[] = [
  { id: 1, title: tr('শূন্য থেকে লাখো customer', 'From zero to millions'), subtitle: tr('Scale, cache, হিসাব, rate limit', 'Scale, cache, estimation, rate limit'), levels: [1, 2, 3, 4], ground: '#DCEBCB', accent: '#0B8A7A' },
  { id: 2, title: tr('ছড়ানো system-এর ভিত', 'Distributed foundations'), subtitle: 'Hashing, key-value, ID', levels: [5, 6, 7], ground: '#E9E2CC', accent: '#B8730A' },
  { id: 3, title: tr('ParcelGo-র app-গুলো', 'ParcelGo\'s apps'), subtitle: 'Link, crawler, notification, feed, chat, search, video, sync', levels: [8, 9, 10, 11, 12, 13, 14, 15], ground: '#D9E6F2', accent: '#2F6FDE' },
  { id: 4, title: tr('জায়গা আর ঘটনার স্রোত', 'Places and event streams'), subtitle: 'Location, map, queue, metrics, stream', levels: [16, 17, 18, 19, 20, 21], ground: '#E4DDF0', accent: '#6B4D9E' },
  { id: 5, title: tr('টাকা, slot আর গুদাম', 'Money, slots and storage'), subtitle: 'Reservation, email, storage, ranking, payment, wallet, exchange', levels: [22, 23, 24, 25, 26, 27, 28], ground: '#F2DEDA', accent: '#C7372D' },
  { id: 6, title: tr('বড় দিনের প্রস্তুতি', 'Ready for the big day'), subtitle: tr('Resilience আর final interview', 'Resilience and the final interview'), levels: [29, 30], ground: '#F5E7C8', accent: '#16252D' },
  { id: 7, title: tr('বোনাস: DDIA-র গভীরে', 'Bonus: deeper into DDIA'), subtitle: tr('Storage engine, analytics, encoding, consensus', 'Storage engines, analytics, encoding, consensus'), levels: [31, 32, 33, 34], ground: '#E6E0F2', accent: '#4B2F7A', gate: 7 },
];
