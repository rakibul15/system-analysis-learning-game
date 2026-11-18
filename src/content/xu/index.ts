import { levelRefs } from '@/features/books/catalog';
import type { XuNote } from './types';

/*
 * Every chapter of Alex Xu's two volumes, with our title and one-line gist for lists and
 * links. A chapter with `load` has our new note; the rest still open in the older study
 * pages (`part`) until they are rewritten.
 */
export interface XuMeta {
  id: string;
  book: 'xu1' | 'xu2';
  chapter: number;
  title: string;
  gist: string;
  /** The older study page that covers this chapter. */
  part: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
  load?: () => Promise<XuNote>;
}

const v1 = (chapter: number, part: XuMeta['part'], title: string, gist: string, load?: XuMeta['load']): XuMeta => ({ id: `v1-${chapter}`, book: 'xu1', chapter, part, title, gist, load });
const v2 = (chapter: number, part: XuMeta['part'], title: string, gist: string, load?: XuMeta['load']): XuMeta => ({ id: `v2-${chapter}`, book: 'xu2', chapter, part, title, gist, load });

export const xuChapters: XuMeta[] = [
  v1(1, 'p1', 'শূন্য থেকে লাখো user', 'এক server থেকে শুরু; প্রতিবার কিছু ভাঙলে একটা নতুন অংশ যোগ, আর প্রতিটা অংশ নিজের নতুন ঝামেলা আনে।', () => import('./v1-1').then((m) => m.note)),
  v1(2, 'p1', 'মুখে মুখে হিসাব', 'QPS, storage আর server সংখ্যা মোটামুটি বের করা: সংখ্যা round করুন, assumption আর unit লিখুন।', () => import('./v1-2').then((m) => m.note)),
  v1(3, 'p1', 'Interview-এর চার ধাপ', 'বুঝে নেওয়া, খসড়া design, গভীরে যাওয়া, গুছিয়ে শেষ: ৪৫ মিনিট কোথায় কত খরচ করবেন।', () => import('./v1-3').then((m) => m.note)),
  v1(4, 'p1', 'Rate limiter', 'কে কত request পাঠাতে পারবে তা ঠিক করা: পাঁচটা algorithm, Redis-এ counter, আর অনেক server-এ গোনার ঝামেলা।', () => import('./v1-4').then((m) => m.note)),
  v1(5, 'p2', 'Consistent hashing', 'Server যোগ বা বাদ দিলে যেন অল্প কিছু key-ই জায়গা বদলায়।'),
  v1(6, 'p2', 'Key-value store', 'Data ভাগ, কপি, quorum, আর ভাঙা node সামলানো।'),
  v1(7, 'p2', 'অনেক server-এ unique ID', 'একসাথে অনেক machine-এ এমন ID বানানো যা কখনো মেলে না, আর সময়ের ক্রমে সাজে।'),
  v1(8, 'p3', 'URL shortener', 'লম্বা link থেকে ছোট code, আর সেখান থেকে দ্রুত redirect।'),
  v1(9, 'p3', 'Web crawler', 'কোটি পাতা ঘুরে আনা: ভদ্রভাবে, একই পাতা দুবার না নিয়ে।'),
  v1(10, 'p3', 'Notification system', 'SMS, email, push: হারিয়ে না যায়, দুবার না যায়।'),
  v1(11, 'p3', 'News feed', 'Post ছড়ানো (fanout) আর feed জোড়া দেওয়া; celebrity-র সমস্যা।'),
  v1(12, 'p4', 'Chat system', 'সাথে সাথে বার্তা, online দেখানো, আর অনেক device-এ মিল রাখা।'),
  v1(13, 'p4', 'Search autocomplete', 'টাইপ করতে করতে সেরা মিলগুলো দেখানো, milliseconds-এ।'),
  v1(14, 'p4', 'YouTube', 'Video upload, encode করা, আর সারা পৃথিবীতে দ্রুত চালানো।'),
  v1(15, 'p4', 'Google Drive', 'File ভাগ করে রাখা, অনেক device-এ sync, আর conflict।'),
  v2(1, 'p5', 'কাছের দোকান খোঁজা', 'Location দিয়ে খোঁজার index: geohash, quadtree।'),
  v2(2, 'p5', 'কাছের বন্ধু', 'চলন্ত মানুষের location অনেককে সাথে সাথে জানানো।'),
  v2(3, 'p5', 'Google Maps', 'Map tile, রাস্তা খোঁজা আর পৌঁছানোর সময়ের হিসাব।'),
  v2(4, 'p5', 'Message queue', 'Producer, consumer, partition, আর message না হারানোর নিশ্চয়তা।'),
  v2(5, 'p5', 'Metrics ও alert', 'লাখো সংখ্যা জমানো, খোঁজা আর বিপদে ডাকা।'),
  v2(6, 'p5', 'Ad click গোনা', 'Click-এর স্রোত থেকে মিনিটে মিনিটে ঠিক হিসাব।'),
  v2(7, 'p6', 'Hotel booking', 'একই ঘর দুজনকে না দেওয়া: lock, transaction, idempotency।'),
  v2(8, 'p6', 'Email service', 'কোটি inbox, খোঁজা, আর spam।'),
  v2(9, 'p6', 'S3-র মতো object storage', 'বড় file টুকরো করে রাখা, কপি আর erasure coding।'),
  v2(10, 'p6', 'খেলার leaderboard', 'লাখো player-এর মধ্যে আমি কত নম্বরে: sorted set।'),
  v2(11, 'p6', 'Payment system', 'টাকা ঠিক একবার: idempotency, reconciliation।'),
  v2(12, 'p6', 'Digital wallet', 'এক account থেকে আরেকটায় টাকা, হাজার হাজার বার সেকেন্ডে, হিসাব না মিলিয়ে নয়।'),
  v2(13, 'p6', 'Stock exchange', 'Order মেলানো microsecond-এ, ক্রম ঠিক রেখে।'),
];

export const xuById: Record<string, XuMeta> = Object.fromEntries(xuChapters.map((c) => [c.id, c]));

/** The game levels that point to this chapter. */
export const levelsForXu = (c: Pick<XuMeta, 'book' | 'chapter'>) =>
  Object.entries(levelRefs).filter(([, rs]) => rs.some((r) => r.book === c.book && r.chapter === c.chapter && !r.section)).map(([l]) => Number(l));

/** The note, or undefined for an unknown chapter or one not rewritten yet. */
export const loadXu = (id: string): Promise<{ meta: XuMeta; note: XuNote } | undefined> => {
  const meta = xuById[id];
  return meta?.load ? meta.load().then((note) => ({ meta, note })) : Promise.resolve(undefined);
};
export type { XuNote, XuBlock } from './types';
