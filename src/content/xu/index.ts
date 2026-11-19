import { levelRefs } from '@/features/books/catalog';
import type { XuNote } from './types';

/*
 * Every chapter of Alex Xu's two volumes, with our title and one-line gist for lists and
 * links. A chapter with `load` has our new note; the rest still open in the older study
 * pages (`part`) until they are rewritten.
 */
export interface XuMeta {
  id: string;
  book: 'xu1' | 'xu2' | 'ddia2';
  chapter: number;
  title: string;
  gist: string;
  /** The older study page that covers this chapter. */
  part?: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';
  load?: () => Promise<XuNote>;
}

const v1 = (chapter: number, part: XuMeta['part'], title: string, gist: string, load?: XuMeta['load']): XuMeta => ({ id: `v1-${chapter}`, book: 'xu1', chapter, part, title, gist, load });
const v2 = (chapter: number, part: XuMeta['part'], title: string, gist: string, load?: XuMeta['load']): XuMeta => ({ id: `v2-${chapter}`, book: 'xu2', chapter, part, title, gist, load });

const dd = (chapter: number, title: string, gist: string, load?: XuMeta['load']): XuMeta => ({ id: `d-${chapter}`, book: 'ddia2', chapter, title, gist, load });

export const xuChapters: XuMeta[] = [
  v1(1, 'p1', 'শূন্য থেকে লাখো user', 'এক server থেকে শুরু; প্রতিবার কিছু ভাঙলে একটা নতুন অংশ যোগ, আর প্রতিটা অংশ নিজের নতুন ঝামেলা আনে।', () => import('./v1-1').then((m) => m.note)),
  v1(2, 'p1', 'মুখে মুখে হিসাব', 'QPS, storage আর server সংখ্যা মোটামুটি বের করা: সংখ্যা round করুন, assumption আর unit লিখুন।', () => import('./v1-2').then((m) => m.note)),
  v1(3, 'p1', 'Interview-এর চার ধাপ', 'বুঝে নেওয়া, খসড়া design, গভীরে যাওয়া, গুছিয়ে শেষ: ৪৫ মিনিট কোথায় কত খরচ করবেন।', () => import('./v1-3').then((m) => m.note)),
  v1(4, 'p1', 'Rate limiter', 'কে কত request পাঠাতে পারবে তা ঠিক করা: পাঁচটা algorithm, Redis-এ counter, আর অনেক server-এ গোনার ঝামেলা।', () => import('./v1-4').then((m) => m.note)),
  v1(5, 'p2', 'Consistent hashing', 'Server যোগ বা বাদ দিলে যেন অল্প কিছু key-ই জায়গা বদলায়।', () => import('./v1-5').then((m) => m.note)),
  v1(6, 'p2', 'Key-value store', 'Data ভাগ, কপি, quorum, আর ভাঙা node সামলানো।', () => import('./v1-6').then((m) => m.note)),
  v1(7, 'p2', 'অনেক server-এ unique ID', 'একসাথে অনেক machine-এ এমন ID বানানো যা কখনো মেলে না, আর সময়ের ক্রমে সাজে।', () => import('./v1-7').then((m) => m.note)),
  v1(8, 'p3', 'URL shortener', 'লম্বা link থেকে ছোট code, আর সেখান থেকে দ্রুত redirect।', () => import('./v1-8').then((m) => m.note)),
  v1(9, 'p3', 'Web crawler', 'কোটি পাতা ঘুরে আনা: ভদ্রভাবে, একই পাতা দুবার না নিয়ে।', () => import('./v1-9').then((m) => m.note)),
  v1(10, 'p3', 'Notification system', 'SMS, email, push: হারিয়ে না যায়, দুবার না যায়।', () => import('./v1-10').then((m) => m.note)),
  v1(11, 'p3', 'News feed', 'Post ছড়ানো (fanout) আর feed জোড়া দেওয়া; celebrity-র সমস্যা।', () => import('./v1-11').then((m) => m.note)),
  v1(12, 'p4', 'Chat system', 'সাথে সাথে বার্তা, online দেখানো, আর অনেক device-এ মিল রাখা।', () => import('./v1-12').then((m) => m.note)),
  v1(13, 'p4', 'Search autocomplete', 'টাইপ করতে করতে সেরা মিলগুলো দেখানো, milliseconds-এ।', () => import('./v1-13').then((m) => m.note)),
  v1(14, 'p4', 'YouTube', 'Video upload, encode করা, আর সারা পৃথিবীতে দ্রুত চালানো।', () => import('./v1-14').then((m) => m.note)),
  v1(15, 'p4', 'Google Drive', 'File ভাগ করে রাখা, অনেক device-এ sync, আর conflict।', () => import('./v1-15').then((m) => m.note)),
  v2(1, 'p5', 'কাছের দোকান খোঁজা', 'Location দিয়ে খোঁজার index: geohash, quadtree।', () => import('./v2-1').then((m) => m.note)),
  v2(2, 'p5', 'কাছের বন্ধু', 'চলন্ত মানুষের location অনেককে সাথে সাথে জানানো।', () => import('./v2-2').then((m) => m.note)),
  v2(3, 'p5', 'Google Maps', 'Map tile, রাস্তা খোঁজা আর পৌঁছানোর সময়ের হিসাব।', () => import('./v2-3').then((m) => m.note)),
  v2(4, 'p5', 'Message queue', 'Producer, consumer, partition, আর message না হারানোর নিশ্চয়তা।', () => import('./v2-4').then((m) => m.note)),
  v2(5, 'p5', 'Metrics ও alert', 'লাখো সংখ্যা জমানো, খোঁজা আর বিপদে ডাকা।', () => import('./v2-5').then((m) => m.note)),
  v2(6, 'p5', 'Ad click গোনা', 'Click-এর স্রোত থেকে মিনিটে মিনিটে ঠিক হিসাব।', () => import('./v2-6').then((m) => m.note)),
  v2(7, 'p6', 'Hotel booking', 'একই ঘর দুজনকে না দেওয়া: lock, transaction, idempotency।', () => import('./v2-7').then((m) => m.note)),
  v2(8, 'p6', 'Email service', 'কোটি inbox, খোঁজা, আর spam।', () => import('./v2-8').then((m) => m.note)),
  v2(9, 'p6', 'S3-র মতো object storage', 'বড় file টুকরো করে রাখা, কপি আর erasure coding।', () => import('./v2-9').then((m) => m.note)),
  v2(10, 'p6', 'খেলার leaderboard', 'লাখো player-এর মধ্যে আমি কত নম্বরে: sorted set।', () => import('./v2-10').then((m) => m.note)),
  v2(11, 'p6', 'Payment system', 'টাকা ঠিক একবার: idempotency, reconciliation।', () => import('./v2-11').then((m) => m.note)),
  v2(12, 'p6', 'Digital wallet', 'এক account থেকে আরেকটায় টাকা, হাজার হাজার বার সেকেন্ডে, হিসাব না মিলিয়ে নয়।', () => import('./v2-12').then((m) => m.note)),
  v2(13, 'p6', 'Stock exchange', 'Order মেলানো microsecond-এ, ক্রম ঠিক রেখে।', () => import('./v2-13').then((m) => m.note)),
  dd(1, 'Trade-off-এর চোখ', 'OLTP আর analytics, cloud আর নিজের machine, এক machine আর অনেক: প্রতিটা বাছাইয়ে কী পাওয়া যায়, কী ছাড়তে হয়।', () => import('./d-1').then((m) => m.note)),
  dd(2, 'Requirement সংখ্যায় বলা', 'Percentile, availability-র "নাইন", load, scalability আর maintainability: ভালো চলা মানে কী তা মাপা।', () => import('./d-2').then((m) => m.note)),
  dd(3, 'Data model আর query', 'Relational, document, graph আর event sourcing: কোন data কোন ছাঁদে ভাবলে কাজ সহজ।', () => import('./d-3').then((m) => m.note)),
  dd(4, 'Storage আর খোঁজা', 'LSM-tree, B-tree, index, column store: ভেতরে data কীভাবে রাখা হয় আর খোঁজা হয়।', () => import('./d-4').then((m) => m.note)),
  dd(5, 'Encoding আর evolution', 'JSON, Protobuf, Avro আর সংস্করণ বদলে কোড পুরোনো-নতুন data পড়তে পারা।', () => import('./d-5').then((m) => m.note)),
  dd(6, 'Replication', 'Single-leader, multi-leader, leaderless: কপি রাখা, lag আর conflict সামলানো।', () => import('./d-6').then((m) => m.note)),
  dd(7, 'Sharding', 'Data ভাগ করা: key-range বনাম hash, hot spot, rebalance আর secondary index।', () => import('./d-7').then((m) => m.note)),
  dd(8, 'Transaction', 'ACID, isolation-এর স্তর, write skew, serializability আর two-phase commit।', () => import('./d-8').then((m) => m.note)),
  dd(9, 'Distributed system-এর ঝামেলা', 'Network, ঘড়ি আর process pause: অনেক machine-এ কী কী ভুল হতে পারে।', () => import('./d-9').then((m) => m.note)),
  dd(10, 'Consistency আর consensus', 'Linearizability, logical clock, consensus আর coordination service।', () => import('./d-10').then((m) => m.note)),
  dd(11, 'Batch processing', 'Unix থেকে MapReduce আর dataflow engine: বড় data-র ওপর বড় কাজ।', () => import('./d-11').then((m) => m.note)),
  dd(12, 'Stream processing', 'Event stream, log-ভিত্তিক broker, CDC, window আর exactly-once।', () => import('./d-12').then((m) => m.note)),
  dd(13, 'Streaming-এর দর্শন', 'Derived data জোড়া, end-to-end সঠিকতা, timeliness বনাম integrity আর যাচাই।', () => import('./d-13').then((m) => m.note)),
  dd(14, 'ঠিক কাজটা করা', 'পক্ষপাত, feedback loop, privacy আর data-র দায়িত্ব।', () => import('./d-14').then((m) => m.note)),
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
