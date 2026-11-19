import { num } from './fmt';
import type { XuNote } from './types';

/** DDIA 2nd edition, chapter 1 (Trade-Offs in Data Systems Architecture), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'd-1',
  goals: [
    'OLTP আর analytics-এর কাজ কীভাবে আলাদা, আর কেন তাদের জন্য আলাদা জায়গা লাগে বলতে পারবেন।',
    'System of record আর derived data আলাদা করে চিনতে পারবেন: কোনটা হারালে ফেরত পাওয়া যায়, কোনটা যায় না।',
    'Cloud বনাম নিজের machine, একা machine বনাম অনেক machine: প্রতিটা বাছাইয়ের লাভ-ক্ষতি নিজের ভাষায় বলতে পারবেন।',
  ],
  related: ['storage', 'caching'],
  blocks: [
    { kind: 'p', text: 'এই অধ্যায়ে কোনো algorithm নেই। আছে প্রশ্ন করার অভ্যাস: কোন কাজের জন্য কোন যন্ত্র? "সবচেয়ে ভালো database" বলে কিছু নেই, প্রতিটা বাছাইয়ে কিছু পাওয়া যায়, কিছু ছাড়তে হয়। বইয়ের বাকি অংশ পড়ার সময় এই চোখটাই কাজে লাগবে।' },

    { kind: 'h', text: 'OLTP আর analytics: দুটো আলাদা কাজ' },
    { kind: 'p', text: 'ParcelGo-র app একটা parcel-এর অবস্থা বদলায়, এক সারি পড়ে বা লেখে, আর উত্তর চায় মুহূর্তে। এটা operational কাজ (OLTP)। আবার ম্যানেজার জানতে চান গত তিন মাসে কোন zone-এ কত parcel দেরি হয়েছে। এটা লাখো সারি ছুঁয়ে যোগফল বের করার কাজ, analytics। দুটোর চেহারা এত আলাদা যে একই database-এ চালালে একটা অন্যটাকে ধীর করে দেয়।' },
    { kind: 'table', head: ['', 'Operational (OLTP)', 'Analytics (OLAP)'], rows: [
      ['কে চালায়', 'App-এর user, প্রতি সেকেন্ডে হাজার হাজার', 'Analyst বা dashboard, মাঝে মাঝে'],
      ['প্রতি query কত সারি', 'অল্প কয়েকটা, key দিয়ে খোঁজা', 'লাখো বা কোটি, বেশিরভাগ column-এ যোগ-গড়'],
      ['লেখা আসে', 'ছোট, এলোমেলো, তৎক্ষণাৎ', 'বড় batch বা স্রোত, একসাথে'],
      ['কী চাই', 'দ্রুত উত্তর, ঠিক data', 'বড় স্ক্যান দ্রুত, পুরোনো ইতিহাসসহ'],
    ] },
    { kind: 'flow', label: 'অপারেশনাল data analytics-এ যায়: কাজ আলাদা, তাই জায়গাও আলাদা', nodes: [
      { id: 'app', label: 'App', x: 10, y: 9 },
      { id: 'db', label: 'Orders DB', sub: 'OLTP', x: 40, y: 9, w: 19 },
      { id: 'etl', label: 'ETL', sub: 'পরিষ্কার করা', x: 68, y: 9, w: 17 },
      { id: 'wh', label: 'Warehouse', sub: 'analytics', x: 88, y: 25, w: 20 },
      { id: 'bi', label: 'Dashboard', x: 40, y: 25, w: 19 },
    ], links: [
      { from: 'app', to: 'db', rate: 6 },
      { from: 'db', to: 'etl', rate: 2 },
      { from: 'etl', to: 'wh', rate: 2 },
      { from: 'wh', to: 'bi', rate: 1 },
    ], h: 34 },
    { kind: 'p', text: 'ETL মানে data বের করা (extract), বদলে গুছিয়ে নেওয়া (transform), আর warehouse-এ ভরা (load)। Warehouse-এ analyst যত ভারী query চালান, app-এর database ধীর হয় না। দাম: warehouse-এর data কিছুটা পুরোনো, কারণ সেটা একটু পরপর আসে।' },

    { kind: 'h', text: 'System of record আর derived data' },
    { kind: 'p', text: 'System of record হলো সত্যের উৎস: কোনো তথ্য প্রথম যেখানে লেখা হয়। বাকি যা কিছু সেই তথ্য থেকে বানানো (cache, search index, warehouse, recommendation) তা derived data। Derived data হারালে মূল থেকে আবার বানানো যায়। মূল হারালে আর ফেরত নেই।' },
    { kind: 'seq', label: 'একটা parcel-এর অবস্থা বদলাল: সত্য আর তার ছায়া', actors: ['Orders DB (উৎস)', 'Cache', 'Search index'], steps: [
      { from: 0, to: 0, msg: 'অবস্থা = "পৌঁছেছে" লেখা হলো', tone: 'ok', note: 'এই লেখাই সত্য। এখানে না থাকলে কোথাও নেই।' },
      { from: 0, to: 1, msg: 'cache-এর পুরোনো মান বাতিল' },
      { from: 0, to: 2, msg: 'index-এ নতুন অবস্থা পাঠাও', note: 'এখানে একটু দেরি হতেই পারে।' },
      { from: 2, to: 2, msg: 'কিছুক্ষণ index এখনো "পথে" বলছে', tone: 'bad', note: 'Derived data একটু পিছিয়ে থাকা স্বাভাবিক। সমস্যা তখন, যখন কেউ index-কে সত্য ধরে নেয়।' },
    ] },

    { kind: 'h', text: 'Cloud না নিজের machine' },
    { kind: 'p', text: 'Cloud-এ দরকার মতো নিন, না লাগলে ছেড়ে দিন। নিজের machine-এ কেনা থাকে, আগে থেকে টাকা যায়, কিন্তু একই কাজে ব্যবহার বাড়লে প্রতি একক খরচ কমে। আর ঝামেলাও আছে: cloud-এ আপনার কাজ অন্যের ব্যবস্থার উপর ঝুলে, নিজের machine-এ রাখা-চালানো আপনারই ঘাড়ে।' },
    { kind: 'calc', label: 'কোন লোডে নিজের machine সস্তা হতে শুরু করে (মোটা হিসাব)', inputs: [
      { id: 'load', label: 'মাসে কাজের পরিমাণ', min: 1, max: 100, step: 1, value: 20, unit: 'একক' },
      { id: 'cloud', label: 'Cloud-এ প্রতি একক খরচ', min: 100, max: 2000, step: 50, value: 600, unit: '$' },
      { id: 'fixed', label: 'নিজের: মাসে স্থির খরচ (machine + জায়গা + লোক)', min: 1000, max: 30000, step: 500, value: 9000, unit: '$' },
    ], out: (v) => {
      const cloud = v.load! * v.cloud!;
      const own = v.fixed!;
      const be = v.fixed! / v.cloud!;
      return [
        { label: 'Cloud-এ মাসে', value: `$${num(cloud)}`, bar: Math.min(1, cloud / Math.max(cloud, own)), how: `${num(v.load!)} × $${num(v.cloud!)}` },
        { label: 'নিজের machine-এ মাসে', value: `$${num(own)}`, bar: Math.min(1, own / Math.max(cloud, own)), how: 'ধরা হলো কাজ যত বাড়ুক, এই স্থির খরচে কুলায়' },
        { label: 'সমান সমান হয়', value: `${num(be)} এককে`, tone: v.load! > be ? 'bad' : 'ok', how: 'এর নিচে cloud সস্তা, এর উপরে নিজের' },
      ];
    } },
    { kind: 'tip', title: 'সংখ্যা ছাড়াও দেখুন', text: 'দামের বাইরে দুটো প্রশ্ন: লোক কত, আর চাপ কত হঠাৎ বাড়ে? ছোট দল আর ওঠানামা করা চাপে cloud-এর নমনীয়তা প্রায় সবসময় জেতে। স্থির, অনুমানযোগ্য, বিশাল কাজে নিজের machine ভাবার মতো।' },

    { kind: 'h', text: 'একা machine না অনেক machine' },
    { kind: 'p', text: 'অনেক machine মানে বেশি ক্ষমতা আর একটা ভাঙলে বাকিরা চলে। কিন্তু নেটওয়ার্ক ধীর, বার্তা হারায় বা দেরিতে আসে, আর কোন machine ঠিক আছে তা ঠিকমতো জানা কঠিন। তাই এক machine-এ কুলালে সেটাই সবচেয়ে সরল পথ। আধুনিক একটা machine-এ অবাক করা পরিমাণ কাজ ধরে। বহু machine তখনই, যখন সত্যিই দরকার: কাজ এক machine-এ ধরে না, বা কিছু ভাঙলেও চলা চাই, বা user দূরে দূরে।' },
    { kind: 'list', items: [
      'Microservice মূলত মানুষের সংগঠনের সমাধান: কয়েকটা দল স্বাধীনভাবে কাজ করবে। ছোট দলে এটা শুধু জটিলতা বাড়ায়।',
      'Serverless-এ machine চালানো অন্যের হাতে, আপনি শুধু কাজ লেখেন। সুবিধা: ব্যবহার অনুযায়ী দাম। অসুবিধা: কম নিয়ন্ত্রণ, আটকে যাওয়ার ঝুঁকি।',
      'Supercomputer আর cloud আলাদা: প্রথমটায় ভাঙা মানে পুরো কাজ থামিয়ে আবার শুরু, দ্বিতীয়টায় ভাঙা নিত্যদিনের ঘটনা বলে software তা সামলায়।',
    ] },

    { kind: 'h', text: 'Data, আইন আর সমাজ' },
    { kind: 'p', text: 'Data মানুষের তথ্য। তাই কী জমাবেন, কতদিন রাখবেন, কে দেখবে, তার উপর আইন আছে (যেমন ইউরোপের GDPR)। কেউ তার data মুছে দিতে বললে সেটা শুধু মূল database থেকে নয়, cache, backup, warehouse, search index, সব derived কপি থেকেও মুছতে হয়। তাই শুরুতেই ভাবুন data কোথায় কোথায় যায়। এই ভাবনা না থাকলে পরে মুছতে গিয়ে নাকানিচোবানি।' },

    { kind: 'story', title: 'ভারী report আর সকালের ভিড়', steps: [
      'ParcelGo-র ম্যানেজার প্রতিদিন সকাল ৯টায় বড় একটা report চালান, সরাসরি orders database-এ।',
      'একই সময় merchant-রা parcel তুলছেন। Report লাখো সারি স্ক্যান করে database-কে ব্যস্ত রাখে।',
      'Parcel তোলা ধীর, কিছু request timeout।',
    ], fix: 'Analytics আলাদা warehouse-এ নিন, ETL দিয়ে data পাঠান। Report যত ভারীই হোক, app-এর database ছোঁয় না। আর মনে রাখুন warehouse একটু পিছিয়ে থাকবে।' },

    { kind: 'mistakes', items: [
      'Analytics আর operational কাজ একই database-এ চালানো, তারপর ধীর হওয়া নিয়ে অবাক হওয়া।',
      'Derived data (cache, index) কে সত্য ধরা। সত্য শুধু system of record-এ।',
      'দল ছোট, তবু শুরু থেকেই বহু microservice আর বহু machine: জটিলতা আসে, লাভ আসে না।',
      'Data কোথায় কোথায় কপি হচ্ছে না ভেবে রাখা, তারপর মুছে ফেলার অনুরোধ এলে দিশেহারা হওয়া।',
    ] },
    { kind: 'check', items: [
      { q: 'OLTP আর analytics query-র প্রধান তফাত কী?', a: 'OLTP অল্প কয়েকটা সারি key ধরে পড়ে-লেখে আর মুহূর্তে উত্তর চায়। Analytics লাখো সারি ঘেঁটে যোগ-গড় বের করে, বড় স্ক্যান দ্রুত হওয়া চাই।' },
      { q: 'কেন analytics আলাদা warehouse-এ চালানো হয়?', a: 'যাতে ভারী query app-এর database-কে ধীর না করে। বদলে warehouse-এর data কিছুটা পুরোনো থাকে।' },
      { q: 'System of record আর derived data-র তফাত?', a: 'Record হলো তথ্যের প্রথম আর আসল ঠিকানা। Derived হলো তা থেকে বানানো কপি বা হিসাব (cache, index)। Derived হারালে আবার বানানো যায়, record হারালে যায় না।' },
      { q: 'কখন এক machine-ই যথেষ্ট ভাবা উচিত?', a: 'যখন কাজ এক machine-এ ধরে আর সাময়িক বন্ধ থাকা সইতে পারেন। অনেক machine নেটওয়ার্ক আর আংশিক ভাঙার জটিলতা আনে, তাই সত্যিকারের দরকার ছাড়া সেদিকে না যাওয়া।' },
    ] },
  ],
};
