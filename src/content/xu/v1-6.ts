import { num } from './fmt';
import type { XuNote } from './types';

/** Vol 1, chapter 6 (Design A Key-value Store), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-6',
  goals: [
    'CAP-এ কেন network ভাঙলে consistency আর availability একসাথে মেলে না, আর কোন system কোনটা বেছে নেয় বলতে পারবেন।',
    'N, W, R দিয়ে quorum-এর হিসাব করে বলতে পারবেন কোনটায় জোরালো consistency, কোনটায় গতি।',
    'Write আর read কোন কোন ধাপ পার হয় (log, memory table, SSTable, Bloom filter) তা আঁকতে পারবেন।',
    'Node ভাঙলে system কীভাবে টের পায় আর সারায় (gossip, hinted handoff, Merkle tree) বলতে পারবেন।',
  ],
  related: ['replication', 'sharding', 'storage', 'consensus'],
  blocks: [
    { kind: 'p', text: 'Key-value store একটা বিশাল হিসাবের খাতা: key দিয়ে মান লেখা আর পড়া, আর কিছু না। কিন্তু একটা machine-এ না, শত শত machine-এ ছড়িয়ে, যেন বড় হয় আর কয়েকটা machine বসে গেলেও চলে। এই অধ্যায় আসলে দেখায় বহু ধারণা একসাথে জুড়লে একটা পূর্ণ system কীভাবে দাঁড়ায়।' },
    { kind: 'list', items: [
      'ছোট মান (সাধারণত ১০ KB-র নিচে), বিশাল data, আর খুব দ্রুত read আর write।',
      'বাড়ানো সহজ (scale), সবসময় চালু থাকা (availability), আর consistency-র মাত্রা বাছতে পারা।',
      'ParcelGo-র উদাহরণ: প্রতিটা parcel-এর বর্তমান অবস্থা, key "PG-4821", মান "hub-এ পৌঁছেছে"।',
    ] },

    { kind: 'h', text: 'CAP: network ভাঙলে কী ছাড়বেন' },
    { kind: 'p', text: 'তিনটা চাওয়া: সব node একই data দেখুক (consistency), প্রতিটা request উত্তর পাক (availability), আর node-দের মাঝে network কেটে গেলেও system চলুক (partition tolerance)। Network কাটা বাস্তবে হয়ই, তাই আসল বাছাই দুটোর মধ্যে: network কাটলে consistency রাখবেন, নাকি availability।' },
    { kind: 'seq', label: 'দুই replica-র মাঝে network কাটল: CP বনাম AP', actors: ['Client', 'Replica ক', 'Replica খ'], steps: [
      { from: 0, to: 1, msg: 'লেখো: PG-4821 = "বিতরণে"' },
      { from: 1, to: 1, msg: 'ক-তে লেখা হলো, কিন্তু খ-কে জানানো গেল না: network কাটা', tone: 'bad', note: 'এখন ক আর খ দুজনের দুই রকম মান।' },
      { from: 0, to: 2, msg: 'পড়ো: PG-4821?' },
      { from: 2, to: 0, msg: 'CP বাছলে: "উত্তর দিতে পারছি না" (error)', tone: 'ok', note: 'পুরোনো মান না দেওয়ার জন্য উত্তরই বন্ধ। Bank-জাতীয় কাজে এটাই ঠিক।' },
      { from: 2, to: 0, msg: 'AP বাছলে: পুরোনো মান "hub-এ", পরে মিলিয়ে নেব', tone: 'bad', note: 'উত্তর পাওয়া গেল, কিন্তু একটু পুরোনো। Tracking, cart, feed-এ এটা সহ্য হয়।' },
    ] },
    { kind: 'table', head: ['ধরন', 'কী বাছে', 'উদাহরণ', 'ParcelGo-তে কোথায়'], rows: [
      ['CP', 'Consistency, আর কখনো উত্তর বন্ধ', 'HBase, ও bank-ধাঁচের store', 'Merchant-এর wallet balance'],
      ['AP', 'Availability, আর পরে মেলানো', 'Cassandra, Dynamo-ধাঁচের store', 'Parcel tracking-এর অবস্থা, cart'],
    ] },

    { kind: 'h', text: 'ভাগ আর কপি' },
    { kind: 'p', text: 'Data-কে অনেক node-এ ভাগ করতে আগের অধ্যায়ের consistent hashing। একটা key-র কপি রাখা হয় বৃত্তে কাঁটার দিকে পরের N টা আলাদা server-এ। সবচেয়ে সাধারণ N হলো ৩। কপিগুলো যেন একই machine-এর ভিন্ন virtual node না হয়, আর সম্ভব হলে আলাদা rack বা data center-এ থাকে, যাতে একটা ঘরে আগুন লাগলে সব কপি একসাথে না যায়।' },

    { kind: 'h', text: 'Quorum: কতজনের সায় লাগবে' },
    { kind: 'p', text: 'তিনটা সংখ্যা: N কপি আছে। লেখা সফল ধরতে W কপির সায় লাগে। পড়তে R কপির কাছে জিজ্ঞেস করতে হয়। যদি W + R > N হয়, তাহলে যে R জনের কাছে পড়ছেন তাদের অন্তত একজন শেষ লেখাটা পেয়েছে, তাই জোরালো consistency। নিচে বদলে দেখুন।' },
    { kind: 'calc', label: 'Quorum: N, W, R বদলে দেখুন', inputs: [
      { id: 'n', label: 'কপি (N)', min: 1, max: 7, step: 1, value: 3 },
      { id: 'w', label: 'লেখায় সায় (W)', min: 1, max: 7, step: 1, value: 2 },
      { id: 'r', label: 'পড়ায় সায় (R)', min: 1, max: 7, step: 1, value: 2 },
    ], out: (v) => {
      const n = v.n!, w = Math.min(v.w!, n), r = Math.min(v.r!, n);
      const strong = w + r > n;
      return [
        { label: 'W + R > N ?', value: strong ? `হ্যাঁ (${num(w + r)} > ${num(n)}): জোরালো consistency` : `না (${num(w + r)} ≤ ${num(n)}): পড়া পুরোনো হতে পারে`, tone: strong ? 'ok' : 'bad' },
        { label: 'লেখা চলে, ভাঙা node সর্বোচ্চ', value: `${num(n - w)}টা`, how: `${num(n)} − W(${num(w)})`, bar: (n - w) / n },
        { label: 'পড়া চলে, ভাঙা node সর্বোচ্চ', value: `${num(n - r)}টা`, how: `${num(n)} − R(${num(r)})`, bar: (n - r) / n },
        { label: 'ধরন', value: r === 1 && w === n ? 'পড়া দ্রুত, লেখা ধীর' : w === 1 && r === n ? 'লেখা দ্রুত, পড়া ধীর' : w === 1 || r === 1 ? 'এক দিকে খুব দ্রুত' : 'মাঝামাঝি', how: 'R বা W যত ছোট, তত দ্রুত; যত বড়, তত নিরাপদ কিন্তু ধীর' },
      ];
    } },
    { kind: 'p', text: 'বেশিরভাগ system তিন কপির সাথে W = ২, R = ২ ধরে চলে। লেখা বেশি আর পড়া কম হলে R বাড়ানো হয়, উল্টোটা হলে W।' },

    { kind: 'h', text: 'একই key-র দুই মান: version আর conflict' },
    { kind: 'p', text: 'AP system-এ দুই replica-য় একই key দুই রকম লেখা হতে পারে। কোনটা ঠিক? ঘড়ি দেখে ঠিক করা বিপজ্জনক (ঘড়ি মেলে না)। বদলে প্রতিটা মানের সাথে একটা vector clock রাখা হয়: কোন node কতবার বদলেছে তার তালিকা। দুটো মানের মধ্যে একটা অন্যটার উত্তরসূরি হলে পুরোনোটা বাদ। কেউ কারও উত্তরসূরি না হলে এটা সত্যিকারের conflict, আর client বা application ঠিক করে কীভাবে জুড়বে।' },
    { kind: 'table', head: ['মান ১', 'মান ২', 'সিদ্ধান্ত'], rows: [
      ['[ক:২, খ:১]', '[ক:১, খ:১]', 'প্রথমটা নতুন, দ্বিতীয়টা বাদ'],
      ['[ক:২, খ:১]', '[ক:১, খ:২]', 'কেউ কারও চেয়ে নতুন না: conflict, জুড়তে হবে'],
    ] },
    { kind: 'tip', title: 'Conflict জোড়ার সহজ নিয়ম', text: 'Cart-এর মতো জিনিসে দুটো মানের union নেওয়া যায় (দুটোতেই যা আছে সব রাখা)। Wallet-এর মতো জিনিসে এভাবে চলে না, সেজন্য সেখানে CP আর আলাদা নকশা (v2-12)।' },

    { kind: 'h', text: 'ভাঙা node টের পাওয়া আর সারানো' },
    { kind: 'p', text: 'একজন বললেই কাউকে মৃত ধরা যায় না, কারণ সে হয়ত শুধু ওই একজনের কাছ থেকে দূরে। তাই gossip: প্রতিটা node প্রতি সেকেন্ডে কয়েকটা এলোমেলো node-কে নিজের heartbeat-এর তালিকা পাঠায়। অনেকদিন যার heartbeat বাড়ে না, বেশ কয়েকজন একমত হলে তাকে মৃত ধরা হয়।' },
    { kind: 'flow', label: 'Gossip: প্রতিটা node এলোমেলো প্রতিবেশীকে তালিকা দেয়, খবর কয়েক ঘুরেই সবার কাছে পৌঁছায়', nodes: [
      { id: 'a', label: 'ক', x: 16, y: 7 }, { id: 'b', label: 'খ', x: 50, y: 7 }, { id: 'c', label: 'গ', x: 84, y: 7 },
      { id: 'd', label: 'ঘ', x: 16, y: 27, tone: 'down', sub: 'heartbeat থেমেছে' }, { id: 'e', label: 'ঙ', x: 50, y: 27 }, { id: 'f', label: 'চ', x: 84, y: 27 },
    ], links: [
      { from: 'a', to: 'b', rate: 1.4 }, { from: 'b', to: 'c', rate: 1.4 }, { from: 'c', to: 'f', rate: 1.4 },
      { from: 'f', to: 'e', rate: 1.4 }, { from: 'e', to: 'a', rate: 1.4 }, { from: 'b', to: 'e', rate: 1.4 },
    ], h: 34 },
    { kind: 'list', items: [
      'সাময়িক ভাঙা (sloppy quorum + hinted handoff): লক্ষ্য node নেই, তাই অন্য একটা সুস্থ node লেখাটা নেয় আর একটা "ফেরত দিও" চিরকুট রাখে। মূল node ফিরলে লেখা তার হাতে চলে যায়।',
      'স্থায়ী গরমিল (anti-entropy): দুই replica-র data মেলাতে সব data তুলনা না করে Merkle tree: data-র hash-এর গাছ। মূল hash মিললে সব মিলেছে; না মিললে নিচে নেমে খুঁজে বের করুন কোন অংশে ফারাক, শুধু সেটুকু আনুন।',
      'পুরো data center গেলে: কপি আগে থেকেই একাধিক data center-এ রাখা।',
    ] },

    { kind: 'h', text: 'একটা node-এর ভেতরে: write আর read' },
    { kind: 'seq', label: 'Write: দ্রুত লেখার জন্য শুধু পরপর লেখা, বাকিটা পরে', actors: ['Client', 'Commit log', 'Memory table', 'SSTable (disk)'], steps: [
      { from: 0, to: 1, msg: 'আগে log-এ লেখো (শুধু শেষে জোড়া)', note: 'পরপর লেখা disk-এ দ্রুত। Machine বসে গেলেও log থেকে সব ফেরত আনা যায়।' },
      { from: 0, to: 2, msg: 'তারপর memory table-এ বসাও (সাজানো)', tone: 'ok', note: 'এই পর্যন্ত এসে client-কে "হয়েছে" বলা যায়। পুরোটাই memory আর এক লাইনের disk লেখা।' },
      { from: 2, to: 2, msg: 'ভরে গেলে (বা সময় হলে)', note: 'Memory table-এর আকার একটা সীমায় পৌঁছায়।' },
      { from: 2, to: 3, msg: 'পুরোটা সাজানো অবস্থায় disk-এ একটা নতুন file (SSTable)', tone: 'ok', note: 'পরে file-গুলো একসাথে জুড়ে (compaction) পুরোনো আর মোছা মান ফেলে দেওয়া হয়।' },
    ] },
    { kind: 'seq', label: 'Read: আগে memory, না পেলে disk, আর অকারণ খোঁজা Bloom filter-এ বাঁচে', actors: ['Client', 'Memory table', 'Bloom filter', 'SSTable'], steps: [
      { from: 0, to: 1, msg: 'key আছে?' },
      { from: 1, to: 0, msg: 'পেলে সরাসরি উত্তর', tone: 'ok', note: 'সদ্য লেখা মান এখানেই মেলে।' },
      { from: 0, to: 2, msg: 'না পেলে: কোন SSTable-এ থাকতে পারে?', note: 'Bloom filter বলে "নিশ্চিত নেই" বা "থাকতেও পারে"। ভুল করে "নেই" কখনো বলে না, কিন্তু ভুল করে "আছে" বলে ফেলতে পারে।' },
      { from: 2, to: 3, msg: 'শুধু "থাকতে পারে" file-গুলো খোলো', tone: 'ok', note: 'বাকি file-এর দিকে disk-এ তাকানোই লাগল না।' },
      { from: 3, to: 0, msg: 'মান ফেরত', tone: 'ok' },
    ] },

    { kind: 'table', head: ['সমস্যা', 'কৌশল'], rows: [
      ['অনেক data ছড়ানো', 'Consistent hashing'],
      ['কপি রাখা, সব সময় চালু', 'N কপি, কাঁটার দিকে পরের N server'],
      ['কতটা consistency', 'Quorum (N, W, R)'],
      ['দুই রকম মান', 'Vector clock'],
      ['ভাঙা টের পাওয়া', 'Gossip'],
      ['সাময়িক ভাঙা', 'Hinted handoff'],
      ['স্থায়ী গরমিল', 'Merkle tree'],
      ['দ্রুত লেখা, দ্রুত পড়া', 'Commit log, memory table, SSTable, Bloom filter'],
    ] },

    { kind: 'mistakes', items: [
      '"CAP-এ তিনটার দুটো বাছি" বলে দেওয়া, অথচ network কাটা এড়ানো যায় না: আসল বাছাই consistency বনাম availability।',
      'সব কপি একই rack বা একই data center-এ রাখা।',
      'ঘড়ির timestamp দিয়ে conflict মেটানো: ঘড়ি সবসময় মেলে না।',
      'একজন node-এর কথায় আরেকজনকে মৃত ঘোষণা করা।',
    ] },
    { kind: 'check', items: [
      { q: 'N = ৩, W = ২, R = ২ হলে কেন জোরালো consistency?', a: 'কারণ W + R = ৪ > ৩। যেকোনো ২ জনের পড়া আর ২ জনের লেখা অন্তত একজনে মেলে, তাই পড়ায় সবসময় শেষ লেখাটা একজন পায়।' },
      { q: 'Network কাটলে wallet balance আর parcel tracking-এর জন্য আপনি কোনটা বাছবেন?', a: 'Wallet: CP, ভুল balance দেখানোর চেয়ে উত্তর বন্ধ ভালো। Tracking: AP, একটু পুরোনো অবস্থা দেখালেও কাজ চলে।' },
      { q: 'Write দ্রুত হয় কেন?', a: 'Disk-এ শুধু শেষে জুড়ে লেখা (commit log) আর memory-তে বসানো। সাজানো file বানানো আর জুড়ে ছোট করা পরে, পেছনে।' },
      { q: 'Bloom filter কেন কাজের?', a: 'যে SSTable-এ key নেই সেগুলো খুলে দেখতে disk খরচ বাঁচে। "নেই" বললে নিশ্চিত নেই; "আছে" বললে একটু ভুলও হতে পারে।' },
      { q: 'একটা node মরেছে কিনা কীভাবে জানবেন?', a: 'Gossip: সবাই এলোমেলোভাবে heartbeat-এর তালিকা ভাগ করে। অনেক node দেখে বহুদিন বাড়েনি, তবে মৃত ধরা হয়।' },
    ] },
  ],
};
