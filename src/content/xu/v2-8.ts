import { bytes, num } from './fmt';
import type { XuNote } from './types';

/** Vol 2, chapter 8 (Distributed Email Server), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v2-8',
  goals: [
    'SMTP, IMAP আর POP কোনটা কী করে বলতে পারবেন, আর একটা email পাঠানো থেকে পৌঁছানো পর্যন্ত পথ আঁকতে পারবেন।',
    'Email-এর metadata, attachment আর বডি আলাদা কেন রাখা হয়, আর কোথায় রাখা হয় বলতে পারবেন।',
    'Spam আর deliverability (SPF, DKIM) কেন লাগে, আর storage কত লাগবে হিসাব করতে পারবেন।',
  ],
  related: ['storage', 'replication', 'sharding'],
  blocks: [
    { kind: 'p', text: 'Gmail-এর মতো email service: পাঠানো, পাওয়া, খোঁজা, label আর spam আলাদা। ParcelGo-র উদাহরণ: প্রতিটা order-এর রসিদ আর customer-এর সাথে চিঠি। Email পুরোনো, কিন্তু নকশায় শিক্ষা অনেক: বহু কোটি user, প্রতিটা বছরের পর বছর চিঠি রাখে; আর কোনো চিঠি হারালে ক্ষমা নেই।' },
    { kind: 'list', items: [
      'পাঠানো, পাওয়া, folder আর label, খোঁজা (পুরো লেখায়), attachment (ছবি, PDF)।',
      'কোটি user; নির্ভরযোগ্যতা সবার ওপরে: চিঠি হারায় না।',
      'Spam আর ভাইরাস ছাঁকা, নইলে inbox ভরে।',
      'কত বড় চিঠি: attachment সহ কয়েক MB।',
    ] },
    { kind: 'calc', label: 'অনুমান: storage', inputs: [
      { id: 'u', label: 'User', min: 1, max: 1000, step: 10, value: 100, unit: 'M' },
      { id: 'r', label: 'দিনে প্রতি user পায়', min: 1, max: 200, step: 1, value: 40 },
      { id: 'kb', label: 'চিঠির গড় আকার', min: 10, max: 500, step: 10, value: 75, unit: 'KB' },
      { id: 'att', label: 'কতটা চিঠিতে attachment', min: 0, max: 50, step: 5, value: 20, unit: '%' },
      { id: 'amb', label: 'attachment গড়', min: 100, max: 5000, step: 100, value: 500, unit: 'KB' },
    ], out: (v) => {
      const perDay = (v.u! * 1e6 * v.r!) / 86400;
      const body = v.u! * 1e6 * v.r! * v.kb! * 1e3;
      const att = v.u! * 1e6 * v.r! * (v.att! / 100) * v.amb! * 1e3;
      return [
        { label: 'পাওয়া চিঠি প্রতি সেকেন্ডে', value: num(Math.round(perDay)), how: `${num(v.u!)}M × ${num(v.r!)} ÷ ৮৬,৪০০`, bar: Math.min(1, perDay / 100_000) },
        { label: 'দিনে বডি-র জমা', value: bytes(body), how: 'চিঠির লেখা ও metadata' },
        { label: 'দিনে attachment-এর জমা', value: bytes(att), how: `${num(v.att!)}% চিঠিতে`, tone: 'bad' },
        { label: 'বছরে মোট', value: bytes((body + att) * 365), how: 'এক কপি; কপি আর backup আলাদা', tone: 'bad' },
      ];
    } },

    { kind: 'h', text: 'প্রোটোকল: তিন নাম' },
    { kind: 'table', head: ['নাম', 'কাজ', 'মনে রাখার উপায়'], rows: [
      ['SMTP', 'চিঠি পাঠানো: আপনার server থেকে অন্য server-এ, এক দিকে', 'ডাকবাক্সে ফেলা'],
      ['POP', 'চিঠি নামানো: নামিয়ে ফেললে server থেকে মোছে', 'বাড়ি নিয়ে যাওয়া'],
      ['IMAP', 'চিঠি দেখা: server-এ থাকে, একাধিক device-এ একই অবস্থা', 'ডাকঘরে বসে পড়া'],
      ['HTTP', 'Webmail: Gmail-এর ওয়েব পাতা', 'ব্রাউজারে সব'],
    ] },
    { kind: 'p', text: 'আজকে বেশিরভাগ ব্যবহারকারী IMAP বা web দিয়ে: অনেক device-এ একই inbox। POP প্রায় অচল।' },

    { kind: 'h', text: 'এক চিঠির পথ' },
    { kind: 'seq', label: 'রিয়া ParcelGo-র ঠিকানা থেকে করিমকে লিখল (অন্য কোম্পানির server)', actors: ['রিয়ার app', 'আমাদের mail server', 'DNS', 'করিমের mail server', 'করিমের inbox'], steps: [
      { from: 0, to: 1, msg: 'চিঠি পাঠাও: করিম@other.com' },
      { from: 1, to: 1, msg: 'ছাঁকা: ভাইরাস, spam, আকার', note: 'বাইরে যাওয়া চিঠিও ছাঁকা: যেন আমাদের server spam-এর আখড়া না হয়।' },
      { from: 1, to: 2, msg: 'other.com-এর mail server কোথায়? (MX record)' },
      { from: 2, to: 1, msg: 'mail.other.com', tone: 'ok' },
      { from: 1, to: 3, msg: 'SMTP: চিঠি নাও (সাথে SPF/DKIM পরিচয়)', note: 'পরিচয় ছাড়া অন্য server ধরে নেয় ভুয়া।' },
      { from: 3, to: 3, msg: 'পরিচয় যাচাই, spam ছাঁকা', tone: 'ok' },
      { from: 3, to: 4, msg: 'করিমের inbox-এ রাখো', tone: 'ok', note: 'সংরক্ষণ, তারপর তার ফোনে push।' },
    ] },
    { kind: 'list', items: [
      'বাইরে যাওয়া queue: অন্য server ডাউন হলে চিঠি জমে, বিরতি দিয়ে বারবার চেষ্টা (v1-10-এর মতো)। কয়েক দিন পরেও না গেলে ফেরত।',
      'ভেতরে আসা: বাইরের server আমাদের MX-এ নামায়। তারপর ছাঁকা, তারপর inbox।',
      'ছাঁকনি আলাদা service: spam, ভাইরাস, আকার। চিঠির ঝড় এলে queue-তে জমে।',
    ] },

    { kind: 'h', text: 'ডেটা: কোথায় কী' },
    { kind: 'table', head: ['কী', 'কোথায়', 'কেন'], rows: [
      ['Metadata (প্রেরক, বিষয়, সময়, label, পড়া হয়েছে কিনা)', 'Database, user ID ধরে ভাগ', 'ছোট, বেশি খোঁজা, বারবার বদলায় (পড়া হলো, label লাগল)'],
      ['চিঠির বডি', 'Database বা blob store', 'মাঝারি, একবার লেখা, পড়া বেশি'],
      ['Attachment', 'Object storage (S3-র মতো, v2-9)', 'বড়; ডেটাবেসে রাখলে ধীর আর ব্যয়বহুল'],
      ['খোঁজার index', 'আলাদা search engine', 'পুরো লেখায় খোঁজা'],
    ] },
    { kind: 'list', items: [
      'user ID ধরে ভাগ (sharding): একজনের সব চিঠি একই জায়গায়, তাই inbox দ্রুত, আর ভাগ ঠিকঠাক ছড়ায়।',
      'Folder-এর "পড়া হয়নি" সংখ্যা: প্রতিবার সব গুনলে ধীর। আলাদা counter রাখা।',
      'একই চিঠি লাখ জনকে (newsletter): সবার জন্য পূর্ণ কপি নয়; বডি একবার, প্রতি user-এর metadata আলাদা।',
      'ডেটা আলাদা অঞ্চলে কপি: এক জায়গা পুড়লেও চিঠি থাকে।',
    ] },

    { kind: 'h', text: 'খোঁজা' },
    { kind: 'p', text: 'Email-এ খোঁজা সবার জানা: "গত বছরের রসিদ"। সাধারণ খোঁজা (বিষয়, প্রেরক) metadata-তে, সহজ। চিঠির ভেতরের শব্দে খোঁজা পুরো লেখায়: একটা inverted index। কিন্তু email-এর খোঁজার ধরন আলাদা: প্রতি user শুধু নিজের চিঠিতে খোঁজে, আর লেখা অনেক বেশি (প্রতিটা চিঠি index)।' },
    { kind: 'table', head: ['পথ', 'কীভাবে', 'ভালো', 'সমস্যা'], rows: [
      ['Elasticsearch-ধাঁচের', 'একটা বড় search cluster, user ID দিয়ে ছাঁকা', 'পূর্ণ শক্তি, নানা ফিচার', 'নতুন চিঠি index-এ ঢোকাতে দেরি; cluster ভারী, দামি'],
      ['নিজের index (user-ভিত্তিক)', 'প্রতি user-এর আলাদা ছোট index, তার চিঠির কাছেই', 'ছোট, দ্রুত, লেখা সহজ', 'নিজে বানাতে হয়, সময় লাগে'],
    ] },

    { kind: 'h', text: 'নকশা' },
    { kind: 'flow', label: 'ভেতরে আসা চিঠি: ছাঁকনি → inbox, আর সাথে index আর push', nodes: [
      { id: 'in', label: 'বাইরের server', x: 8, y: 17, w: 18 },
      { id: 'sm', label: 'SMTP server', x: 30, y: 17, w: 16 },
      { id: 'fl', label: 'ছাঁকনি', sub: 'spam, ভাইরাস', x: 54, y: 17, w: 16 },
      { id: 'st', label: 'Mail storage', sub: 'metadata+বডি', x: 80, y: 6, w: 20 },
      { id: 'ob', label: 'Attachment store', x: 80, y: 28, w: 22 },
      { id: 'ix', label: 'Search index', x: 92, y: 17, w: 16 },
    ], links: [
      { from: 'in', to: 'sm', rate: 3 }, { from: 'sm', to: 'fl', rate: 3 }, { from: 'fl', to: 'st', rate: 2.2, drop: 0.25 }, { from: 'fl', to: 'ob', rate: 1 }, { from: 'st', to: 'ix', rate: 1.6 },
    ], h: 36 },
    { kind: 'list', items: [
      'Spam কমানো: প্রেরকের IP আর domain-এর সুনাম, বিষয়ের ধরন, আর শেখা-মডেল (user "spam" চিহ্নিত করলে মডেল শেখে)।',
      'পরিচয়: SPF (এই IP থেকে চিঠি পাঠানো যায়, domain-এর DNS-এ লেখা), DKIM (চিঠিতে সই), DMARC (না মিললে কী করবে)। নিজের domain থেকে চিঠি পাঠাতে এসব ঠিক না থাকলে সব spam-এ যায়।',
      'Bounce: ঠিকানা ভুল বা বক্স ভরা: ফেরত চিঠি, তা থেকে তালিকা পরিষ্কার।',
    ] },

    { kind: 'story', title: 'রসিদ spam-এ যাচ্ছে', steps: [
      'ParcelGo নতুন domain থেকে অর্ডারের রসিদ পাঠাতে শুরু করল।',
      'বেশিরভাগ customer inbox-এ পেল না: Gmail সেগুলো spam-এ ফেলছিল।',
      'কারণ: domain-এ SPF আর DKIM ছিল না, আর একসাথে শত শত চিঠি পাঠানো নতুন IP থেকে।',
    ], fix: 'DNS-এ SPF, DKIM, DMARC বসানো; নতুন IP ধীরে ধীরে গরম করা (warm-up: প্রথমে অল্প, তারপর বাড়ানো); আর bounce আর অভিযোগের হার নজরে রাখা।' },

    { kind: 'mistakes', items: [
      'Attachment ডেটাবেসে ঢেলে রাখা।',
      'বাইরের server-এ পাঠানোর সময় ব্যর্থ হলে চিঠি ফেলে দেওয়া: queue আর retry লাগে।',
      'Domain-এ SPF/DKIM ছাড়া চিঠি পাঠানো।',
      'এক user-এর চিঠি অনেক shard-এ ছড়ানো: inbox ধীর।',
      'ছাঁকনি ছাড়া আসা চিঠি সরাসরি inbox-এ।',
    ] },
    { kind: 'check', items: [
      { q: 'SMTP, IMAP আর POP-এর কাজ?', a: 'SMTP চিঠি পাঠায় (এক server থেকে আরেক server-এ)। IMAP server-এ রেখে একাধিক device-এ দেখায়। POP নামিয়ে ফেলে।' },
      { q: 'Attachment কোথায়, কেন?', a: 'Object storage-এ। বড় ফাইল, একবার লেখা: ডেটাবেসে রাখলে ধীর আর ব্যয়বহুল। Metadata আলাদা, ছোট, দ্রুত database-এ।' },
      { q: 'Email-এর database ভাগ কীভাবে?', a: 'User ID ধরে: একজনের সব চিঠি এক জায়গায়, inbox ও খোঁজা দ্রুত, আর ভিড় সমানভাবে ছড়ায়।' },
      { q: 'নিজের domain-এর চিঠি spam-এ গেলে কী দেখবেন?', a: 'SPF, DKIM আর DMARC ঠিক আছে কিনা, IP-র সুনাম, আর একসাথে অতিরিক্ত পাঠানো হচ্ছে কিনা।' },
    ] },
  ],
};
