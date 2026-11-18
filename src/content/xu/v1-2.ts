import { bytes, dur, num, pct } from './fmt';
import type { XuNote } from './types';

const YEAR = 365.25 * 86400;

/** Vol 1, chapter 2 (Back-of-the-envelope Estimation), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-2',
  goals: [
    'কোন কাজ কত ধীর (memory, disk, network) তার অনুপাত মাথায় রেখে design-এর সিদ্ধান্ত নিতে পারবেন।',
    'Availability-র "কয়টা nine" থেকে বছরে কত বন্ধ থাকা চলে বের করতে পারবেন।',
    'DAU থেকে QPS, peak QPS, storage আর server সংখ্যা দুই মিনিটে হিসাব করতে পারবেন, assumption লিখে।',
  ],
  blocks: [
    { kind: 'p', text: 'Interview-এ নিখুঁত সংখ্যা কেউ চায় না; চায় ঠিক মাপ। "দিনে ১০ লাখ request" শুনে যদি বলতে পারেন "মানে সেকেন্ডে মোটে বারোটা, একটা server-ই যথেষ্ট", তাহলে design-এর অর্ধেক সিদ্ধান্ত হয়ে গেল। তিনটা জিনিস মাথায় রাখলেই চলে: ২-এর ঘাত, latency-র অনুপাত, আর availability-র nine।' },

    { kind: 'h', text: '২-এর ঘাতের সিঁড়ি' },
    { kind: 'table', head: ['ঘাত', 'মোটামুটি', 'নাম', 'এক ধাপ মানে'], rows: [
      ['2¹⁰', 'হাজার', 'KB', '১০০০ গুণ বড়'],
      ['2²⁰', '১০ লাখ (million)', 'MB', '১০০০ KB'],
      ['2³⁰', '১০০ কোটি (billion)', 'GB', '১০০০ MB'],
      ['2⁴⁰', 'লাখ কোটি (trillion)', 'TB', '১০০০ GB'],
      ['2⁵⁰', 'হাজার লাখ কোটি', 'PB', '১০০০ TB'],
    ] },
    { kind: 'p', text: 'হিসাবের সময় এই সিঁড়িতে ওঠানামা করুন: ৩০,০০০ MB মানে ৩০ GB; ৫৫,০০০ TB মানে প্রায় ৫৫ PB। ইংরেজি অক্ষর ১ byte, কিন্তু বাংলা অক্ষর UTF-8-এ সাধারণত ৩ byte: বাংলা ঠিকানা আর নাম রাখলে storage তিন গুণ ধরুন।' },

    { kind: 'h', text: 'Latency: কোনটা কত ধীর' },
    { kind: 'bars', label: 'একেকটা কাজে কত সময় (log scale: প্রতি ঘর আগের চেয়ে বহু গুণ)', scale: 'log', note: 'সংখ্যাগুলো Google-এর Jeff Dean-এর ২০১০ সালের বহুল প্রচলিত তালিকা থেকে। আজ machine দ্রুত, কিন্তু অনুপাতটা প্রায় একই আছে। মানুষের মাপে: RAM থেকে পড়া যদি ১ সেকেন্ড হয়, disk seek প্রায় ২৮ ঘণ্টা, আর মহাদেশ পেরিয়ে packet ঘুরে আসা প্রায় ১৭ দিন।', items: [
      { label: 'CPU-র L1 cache থেকে পড়া', value: 0.5, show: '0.5 ns', tone: 'ok' },
      { label: 'RAM থেকে পড়া', value: 100, show: '100 ns', tone: 'ok' },
      { label: '১ KB compress করা', value: 10_000, show: '10 µs', tone: 'ok' },
      { label: 'একই data center-এ ঘুরে আসা', value: 500_000, show: '0.5 ms', tone: 'warn' },
      { label: 'Disk-এ একবার খোঁজা (seek)', value: 10_000_000, show: '10 ms', tone: 'bad' },
      { label: 'Disk থেকে ১ MB পরপর পড়া', value: 30_000_000, show: '30 ms', tone: 'bad' },
      { label: 'আমেরিকা থেকে ইউরোপ ঘুরে আসা', value: 150_000_000, show: '150 ms', tone: 'bad' },
    ] },
    { kind: 'table', head: ['যা শিখবেন', 'Design-এ কোথায় লাগে'], rows: [
      ['Memory দ্রুত, disk ধীর', 'বারবার পড়া জিনিস cache-এ (অধ্যায় ১)'],
      ['Disk-এ খোঁজা এড়ান', 'পরপর লেখা আর পড়া (log), ঠিক index'],
      ['Compress করা প্রায় বিনা খরচে', 'Network-এ পাঠানোর আগে gzip বা brotli'],
      ['Data center-গুলো দূরে', 'User-এর কাছে CDN বা region; ঢাকার user-কে আমেরিকা থেকে serve করলে প্রতি round trip-এ শত ms বাড়তি'],
    ] },

    { kind: 'h', text: 'Availability: কয়টা nine' },
    { kind: 'p', text: 'Availability মানে system কত শতাংশ সময় চালু। প্রতিটা বাড়তি nine-এ বন্ধ থাকার সময় দশ ভাগের এক ভাগ হয়। Cloud provider-রা সাধারণত ৯৯.৯% বা তার বেশি কথা দেয় (SLA)। নিচে nine বদলে দেখুন, আর দেখুন পরপর নির্ভরশীল service বাড়লে কী হয়।' },
    { kind: 'calc', label: 'কয়টা nine, আর পরপর কয়টা service', inputs: [
      { id: 'n', label: 'Availability', min: 1, max: 6, step: 1, value: 3, show: (n) => pct(1 - 10 ** -n) },
      { id: 'k', label: 'পরপর নির্ভরশীল service', min: 1, max: 6, step: 1, value: 1, unit: 'টা' },
    ], out: (v) => {
      const a = 1 - 10 ** -v.n!;
      const chain = a ** v.k!;
      return [
        { label: 'বছরে বন্ধ থাকা চলে', value: dur((1 - a) * YEAR), how: `বছরে ৮,৭৬৬ ঘণ্টা × ${pct(1 - a)}` },
        { label: 'মাসে', value: dur(((1 - a) * YEAR) / 12) },
        { label: 'দিনে', value: dur((1 - a) * 86400) },
        { label: `${num(v.k!)}টা service পরপর থাকলে পুরো system`, value: pct(Math.floor(chain * 1e5) / 1e5), how: v.k! > 1 ? `${pct(a)} কে ${num(v.k!)} বার গুণ: বছরে ${dur((1 - chain) * YEAR)} বন্ধ` : 'একটাই service', tone: v.k! > 1 ? 'bad' : undefined },
      ];
    } },
    { kind: 'tip', title: 'নির্ভরশীল অংশ যত, availability তত কম', text: 'তিনটা service পরপর, প্রতিটা ৯৯.৯%: পুরোটা প্রায় ৯৯.৭%। একটা আরেকটার উপর নির্ভর করলে availability গুণ হয়। এজন্যই প্রতিটা স্তরে বিকল্প (redundancy) লাগে।' },

    { kind: 'h', text: 'ParcelGo-র হিসাব নিজে করুন' },
    { kind: 'p', text: 'নিচে ParcelGo-র tracking-এর হিসাব। প্রতিটা slider একটা assumption। বদলে দেখুন কোনটা ফলকে সবচেয়ে বেশি নাড়ায়।' },
    { kind: 'calc', label: 'DAU থেকে QPS, server আর storage', inputs: [
      { id: 'dau', label: 'প্রতিদিন ব্যবহারকারী (DAU)', min: 100_000, max: 20_000_000, step: 100_000, value: 2_000_000, show: num },
      { id: 'req', label: 'জনপ্রতি দিনে request', min: 1, max: 30, step: 1, value: 5 },
      { id: 'peak', label: 'Peak, গড়ের কত গুণ', min: 1, max: 10, step: 0.5, value: 2, show: (x) => `${num(x)} গুণ` },
      { id: 'per', label: 'এক server সেকেন্ডে সামলায়', min: 200, max: 5000, step: 100, value: 1000, unit: 'QPS' },
      { id: 'parcels', label: 'দিনে নতুন parcel', min: 10_000, max: 2_000_000, step: 10_000, value: 300_000, show: num },
      { id: 'kb', label: 'প্রতিটা parcel-এর data (ঘটনার ইতিহাস সহ)', min: 1, max: 50, step: 1, value: 5, unit: 'KB' },
      { id: 'years', label: 'কত বছর রাখবেন', min: 1, max: 10, step: 1, value: 5, unit: 'বছর' },
    ], out: (v) => {
      const avg = (v.dau! * v.req!) / 86400;
      const peak = avg * v.peak!;
      const servers = Math.ceil((peak / v.per!) * 1.3);
      const perYear = v.parcels! * v.kb! * 1000 * 365;
      return [
        { label: 'গড় QPS', value: num(avg), how: `${num(v.dau!)} × ${num(v.req!)} ÷ ৮৬,৪০০ সেকেন্ড` },
        { label: 'Peak QPS', value: num(peak), how: `গড় × ${num(v.peak!)}` },
        { label: 'Server লাগবে', value: `${num(Math.max(1, servers))}টা`, how: 'peak ÷ এক server-এর ক্ষমতা, তারপর ৩০% বাড়তি', bar: Math.min(1, servers / 50) },
        { label: 'বছরে storage', value: bytes(perYear), how: `${num(v.parcels!)} × ${num(v.kb!)} KB × ৩৬৫` },
        { label: `${num(v.years!)} বছরে, ৩টা কপি সহ`, value: bytes(perYear * v.years! * 3), how: 'replication-এ প্রতিটা data তিন জায়গায়', tone: 'bad' },
      ];
    } },

    { kind: 'h', text: 'মুখে কীভাবে বলবেন' },
    { kind: 'dialog', label: 'Interview-এ হিসাবটা যেভাবে শোনায়', lines: [
      { who: 'q', text: 'ParcelGo-র tracking-এ কত QPS ধরবেন?' },
      { who: 'a', text: 'ধরে নিচ্ছি প্রতিদিন ২০ লাখ মানুষ ব্যবহার করেন, প্রত্যেকে দিনে গড়ে ৫ বার দেখেন। এটা লিখে রাখছি।' },
      { who: 'a', text: 'তাহলে দিনে ১ কোটি request। দিনে প্রায় এক লাখ সেকেন্ড, তাই গড়ে সেকেন্ডে ১০০-র মতো।' },
      { who: 'tip', text: '৮৬,৪০০-কে এক লাখ ধরে নেওয়া চলে। ঠিক ভাগ (১১৬) লাগলে পরে বলবেন।' },
      { who: 'a', text: 'সন্ধ্যায় ভিড় গড়ের দুই গুণ ধরলে peak ২০০-র মতো। একটা server-ই পারবে, তবে বসে গেলে যেন না থামে তাই অন্তত দুটো।' },
      { who: 'q', text: 'ঈদের সময়?' },
      { who: 'a', text: 'তখন peak দশ গুণও হতে পারে, মানে ২,০০০-এর মতো। তাহলে load balancer আর autoscaling লাগবে, আর cache, কারণ বেশিরভাগ request একই কয়েকটা parcel-এর।' },
      { who: 'tip', text: 'সংখ্যা থেকে সরাসরি design-এর সিদ্ধান্ত: এটাই interviewer শুনতে চান।' },
    ] },

    { kind: 'h', text: 'হিসাবের নিয়ম' },
    { kind: 'table', head: ['নিয়ম', 'উদাহরণ'], rows: [
      ['Round করুন', '৯৯,৯৮৭ ÷ ৯.১ → ১,০০,০০০ ÷ ১০ = ১০,০০০'],
      ['Assumption লিখে রাখুন', '"DAU ধরলাম MAU-র অর্ধেক": পরে এখানে ফিরে আসতে পারবেন'],
      ['Unit লিখুন', '"৫" নয়, "৫ MB"। না লিখলে KB আর MB গুলিয়ে হাজার গুণ ভুল'],
      ['যা বেশি জিজ্ঞেস হয়', 'QPS, peak QPS, storage, cache কত বড়, কয়টা server'],
    ] },
    { kind: 'list', items: [
      'হাতের কাছে রাখুন: ১ দিন = ৮৬,৪০০ সেকেন্ড, মোটামুটি ১০⁵।',
      'দিনে ১০ লাখ request মানে সেকেন্ডে প্রায় ১২টা; দিনে ১০ কোটি মানে প্রায় ১,১৬০টা।',
      'এক মাস মোটামুটি ২৫ লাখ সেকেন্ড।',
      'Server সংখ্যা = peak QPS ÷ এক server-এর QPS, তারপর ২০–৩০% বাড়তি।',
    ] },

    { kind: 'mistakes', items: [
      'Unit না লেখা, তারপর KB আর MB গুলিয়ে ফেলা।',
      'শুধু গড় ধরে server গোনা, peak ভুলে যাওয়া।',
      'Storage-এ কপির কথা ভুলে যাওয়া: replication-এ data তিন গুণ।',
      'নির্ভুল ভাগের পেছনে তিন মিনিট নষ্ট করা।',
      'হিসাব করে design-এ তার কোনো ব্যবহার না করা।',
    ] },
    { kind: 'check', items: [
      { q: 'তিনটা service পরপর, প্রতিটা ৯৯.৯%। পুরো system কত?', a: '০.৯৯৯ × ০.৯৯৯ × ০.৯৯৯ ≈ ৯৯.৭%। বছরে প্রায় ২৬ ঘণ্টা বন্ধ, যেখানে একটার জন্য প্রায় ৯ ঘণ্টা।' },
      { q: '৯৯.৯৯% মানে বছরে কতক্ষণ বন্ধ থাকা চলে?', a: 'প্রায় ৫২ মিনিট। (বছরে প্রায় ৫ লাখ ২৬ হাজার মিনিট × ০.০০০১)' },
      { q: 'দিনে ১০ লাখ নতুন parcel, প্রতিটার সাথে ২০০ KB-র একটা ছবি। বছরে ছবির storage কত?', a: '১০ লাখ × ২০০ KB = ২০০ GB দিনে; × ৩৬৫ ≈ ৭৩ TB বছরে। কপি সহ তার তিন গুণ।' },
      { q: 'Disk seek এড়াতে চান কেন, এক কথায়?', a: 'Memory থেকে পড়ার চেয়ে প্রায় এক লাখ গুণ ধীর। তাই বারবার লাগা data memory-তে (cache), আর disk-এ পরপর লেখা-পড়া।' },
    ] },
  ],
};
