import { level } from '../dsl';
import { refs } from '../refs';

/* Chapter ২ · ছড়ানো system-এর ভিত — Vol 1, ch 5–7 */

export const l5 = level({
  id: 5, chapter: 2,
  title: 'Cache-এর আংটি', concept: 'Consistent hashing',
  story: 'Cache server যোগ করতেই সব miss',
  briefing: 'ঈদের ভিড়ে আরেকটা cache server যোগ করলেন। পরের মিনিটেই প্রায় সব request cache miss, database ধসে পড়ার উপক্রম। একটা server যোগ করায় কেন সব গোলমাল হল?',
  ref: refs.p2,
  predict: ['৪টা cache server, key যায় hash % 4 দিয়ে। আরেকটা যোগ করলে (% 5)?', ['বেশিরভাগ key অন্য server-এ চলে যাবে, ব্যাপক miss', 'শুধু নতুন key নতুন server-এ যাবে', 'কিছুই বদলাবে না', 'সব key মুছে যাবে']],
  nodes: [
    ['m0', 'Server ০', 'cache', 16, 28], ['m1', 'Server ১', 'cache', 39, 28], ['m2', 'Server ২', 'cache', 62, 28], ['m3', 'Server ৩', 'cache', 85, 28],
    ['keys', '৮টা key', 'key', 50, 78],
    ['r0', 'S0', 'ring', 50, 12], ['r1', 'S1', 'ring', 82, 50], ['r2', 'S2', 'ring', 50, 88], ['r3', 'S3', 'ring', 18, 50],
    ['k', 'key', 'key', 72, 22],
  ],
  steps: [
    { text: '৪টা cache server; প্রতিটা key যায় hash(key) % 4 নম্বর server-এ।', add: ['m0', 'm1', 'm2', 'm3', 'keys'], flow: [['keys', 'm0'], ['keys', 'm1'], ['keys', 'm2'], ['keys', 'm3']] },
    { text: 'Server ৩ পড়ে গেল, এখন % 3।', down: ['m3'], ask: ['৮টা key-র কতগুলো জায়গা বদলাবে?', ['বেশিরভাগ (প্রায় ৬টা)', 'শুধু ২টা, যেগুলো server ৩-এ ছিল', 'একটাও না', 'নিশ্চিতভাবে ৮টাই']] },
    { text: '৬টা key সরে গেল, অথচ পড়ে যাওয়া server-এ ছিল মাত্র ২টা। তাই একসাথে বিশাল cache miss।', down: ['m3'], badges: { keys: '৬টা সরল' } },
    { text: 'এবার server-গুলোকে একটা আংটিতে (hash ring) বসাই।', hide: ['m0', 'm1', 'm2', 'm3', 'keys'], add: ['r0', 'r1', 'r2', 'r3'] },
    { text: 'Key ঘড়ির কাঁটার দিকে হেঁটে প্রথম যে server পায়, সেখানে থাকে।', add: ['k'], flow: [['k', 'r1']], badges: { k: '→ clockwise' } },
    { text: 'S1 পড়ে গেল।', down: ['r1'], ask: ['S1 পড়লে কোন key সরবে?', ['শুধু S1-এর ভাগের key, পরের server S2-তে', 'সব key', 'S0-এর key', 'কোনোটাই না']] },
    { text: 'শুধু S1-এর ভাগটা পাশের server-এ গেল। গড়ে মাত্র k/n key নড়ে।', down: ['r1'], flow: [['k', 'r2']], ok: ['r2'] },
    { text: 'সমস্যা: ভাগ অসমান। সমাধান virtual node: প্রতিটা server আংটিতে অনেক জায়গায় বসে, ভাগ সমান হয়।', badges: { r0: 'বড় ভাগ', r2: 'ছোট ভাগ' } },
  ],
  summary: ['Modulo hashing-এ server বদলালে প্রায় সব key সরে', 'Ring-এ key যায় clockwise প্রথম server-এ; বদলে নড়ে শুধু পাশের ভাগ', 'Virtual node ভাগ সমান করে; শক্তিশালী server বেশি virtual node পায়'],
  play: {
    kind: 'missions', intro: 'Ring নিয়ে তিনটা সিদ্ধান্ত।',
    missions: [
      ['১০টা server, ১০ লাখ key। আরেকটা server যোগে মোটামুটি কত key সরে?', ['~১ লাখ (k/n)', '~১০ লাখ', '~৯ লাখ', '০'], 'নতুন server মোটামুটি নিজের ভাগটুকুই নেয়: ১০ লাখ / ১১ ≈ ৯০ হাজার।'],
      ['Virtual node বাড়ালে?', ['ভাগ আরও সমান, কিন্তু ring-এর তথ্য রাখতে জায়গা বেশি', 'ভাগ আরও অসমান', 'বেশি key সরে', 'Server কমে যায়'], 'বেশি বিন্দু মানে ছোট ছোট ভাগ, গড়ে সমান।'],
      ['একটা server অন্যদের দ্বিগুণ শক্তিশালী। বেশি load দিতে?', ['ওটাকে বেশি virtual node দিন', 'ওটাকে ring থেকে সরান', 'Modulo hashing-এ ফিরুন', 'Key-র নাম বদলান'], 'Virtual node-এর সংখ্যা = ভাগের আকার।'],
    ],
  },
  boss: [
    ['Consistent hashing কোথায় ব্যবহার হয়?', ['Dynamo/Cassandra-র partitioning, Discord, Akamai CDN', 'শুধু password রাখায়', 'CSS লেখায়', 'Sorting algorithm-এ'], 'যেখানেই data অনেক node-এ ভাগ আর node যোগ-বাদ হয়।'],
    ['এক celebrity-র key একটা server-এ চাপ দিচ্ছে। Consistent hashing কি এটা মেটায়?', ['না, এক key এক জায়গায়ই থাকে; replica বা আলাদা cache লাগে', 'হ্যাঁ, পুরোপুরি', 'শুধু virtual node দিয়েই', 'Modulo দিয়ে'], 'Hotspot key আলাদা সমস্যা।'],
    ['Ring-এ key যায় কোথায়?', ['Key-র অবস্থান থেকে clockwise প্রথম server-এ', 'কাছের দুই server-এ ভাগ হয়ে', 'Random server-এ', 'সবসময় প্রথম server-এ'], 'নিয়মটাই এটা।'],
    ['Modulo hashing-এর মূল সমস্যা?', ['Server সংখ্যা বদলালে প্রায় সব key-র জায়গা বদলায়', 'Hash ধীর', 'Key হারায়', 'Server যোগ করা যায় না'], 'n বদলালে hash % n প্রায় সবার জন্য বদলায়।'],
    ['Virtual node কত লাগবে কীভাবে ঠিক করবেন?', ['যত বেশি তত সমান ভাগ (১০০–২০০-তে বিচ্যুতি ~৫–১০%), memory-র সাথে ভারসাম্য', 'একটাই যথেষ্ট', 'ঠিক server-এর সংখ্যার সমান', 'যত কম তত ভালো'], 'বইয়ের হিসাব: ১০০ virtual node-এ ~১০%, ২০০-তে ~৫% standard deviation।', 'সংখ্যা বাড়লে বিচ্যুতি…'],
  ],
});

export const l6 = level({
  id: 6, chapter: 2,
  title: 'পুরনো data-র রহস্য', concept: 'Key-value store · CAP',
  story: 'এক node পড়লে data পুরনো দেখায়',
  briefing: 'Merchant দাম বদলাল, কিন্তু কিছু customer এখনো পুরনো দাম দেখছে। Data তিনটা node-এ রাখা হয়—তাহলে পুরনো মান এল কোথা থেকে? আজ quorum, CAP আর vector clock।',
  ref: refs.p2,
  predict: ['তিন copy-তে লেখা হয়। একটা node দেরি করলে read-এ পুরনো মান আসে কেন?', ['Read যদি সেই পিছিয়ে থাকা copy থেকে আসে', 'Hash ভুল', 'Disk ভরা', 'Client ধীর']],
  nodes: [
    ['c', 'Client', 'user', 8, 50], ['co', 'Coordinator', 'lb', 36, 50],
    ['a', 'Node A', 'db', 74, 18], ['b', 'Node B', 'db', 80, 50], ['n3', 'Node C', 'db', 74, 82],
  ],
  steps: [
    { text: 'প্রতিটা key ৩টা node-এ রাখা হয় (N = ৩)।', flow: [['c', 'co'], ['co', 'a'], ['co', 'b'], ['co', 'n3']], badges: { co: 'N = ৩' } },
    { text: 'Write সফল ধরা হয় যখন ২টা node ack দেয় (W = ২)।', ok: ['a', 'b'], flow: [['co', 'a'], ['co', 'b']], badges: { co: 'W = ২' } },
    { text: 'এখন read: ২টা node-এর উত্তর নিই (R = ২)।', badges: { co: 'R = ২' }, ask: ['W = ২, R = ২, N = ৩। Read কি নিশ্চিত নতুন মান পাবে?', ['হ্যাঁ, W + R > N তাই অন্তত একটা node-এ নতুন মান আছে', 'না, কখনো না', 'শুধু ভাগ্য ভালো হলে', 'R = ১ হলেই নিশ্চিত']] },
    { text: 'W + R > N হলে read আর write-এর node সেট কোথাও মেলে: strong consistency।', ok: ['b'], flow: [['co', 'b'], ['co', 'n3']] },
    { text: 'Node C পড়ে গেল, network ভাগ হয়ে গেল (partition)।', down: ['n3'], ask: ['CAP অনুযায়ী এখন?', ['Consistency আর availability-র একটা বাছতে হবে', 'দুটোই পাওয়া যাবে', 'Partition কখনো হয় না', 'Data মুছে ফেলতে হবে']] },
    { text: 'AP বাছলে দুই দিকে আলাদা লেখা হতে পারে; vector clock দিয়ে কোনটা আগে-পরে বা conflict ধরা হয়।', down: ['n3'], badges: { a: 'v1 [A:1]', b: 'v2 [A:1,B:1]' } },
    { text: 'Node ফিরলে hinted handoff আর Merkle tree দিয়ে পিছিয়ে থাকা data মিলিয়ে নেওয়া (anti-entropy)।', ok: ['n3'], flow: [['b', 'n3']] },
  ],
  summary: ['N copy, W ack-এ write, R উত্তরে read; W + R > N হলে strong', 'Partition হলে consistency না availability: CP বা AP', 'Vector clock conflict ধরে; Merkle tree আর hinted handoff মেলায়'],
  play: {
    kind: 'missions', intro: 'N, W, R আর CAP নিয়ে তিনটা পরিস্থিতি।',
    missions: [
      ['R = ১, W = ৩, N = ৩। কিসের জন্য ভালো?', ['দ্রুত read', 'দ্রুত write', 'দুটোই ধীর', 'কোনোটাই না'], 'Read-এ একজনের উত্তরই যথেষ্ট; write-এ সবার অপেক্ষা।'],
      ['W = ১, R = ১, N = ৩। Consistency?', ['Strong নয় (W + R ≤ N), eventual', 'Strong', 'Linearizable', 'CP'], 'Read আর write-এর node না মিলতেও পারে।'],
      ['Payment-এর মতো data, ভুল মান চলবে না। CP না AP?', ['CP: ভুল দেখানোর চেয়ে কিছুক্ষণ বন্ধ থাকা ভালো', 'AP', 'দুটোই সমান', 'কোনোটা লাগে না'], 'টাকার ক্ষেত্রে ভুল মান বিপদ।'],
    ],
  },
  boss: [
    ['Vector clock [A:2, B:1] আর [A:1, B:2]। সম্পর্ক?', ['Conflict: কেউ কারো পূর্বসূরি নয়', 'প্রথমটা নতুন', 'দ্বিতীয়টা নতুন', 'দুটো একই'], 'একটার সব counter অন্যটার ≥ হলে তবে সে নতুন; এখানে দুজনেই একটায় এগিয়ে।', 'প্রতিটা counter আলাদা তুলনা করুন'],
    ['Node পড়ার খবর সবাই জানে কীভাবে (কেন্দ্রীয় server ছাড়া)?', ['Gossip protocol: heartbeat ছড়িয়ে', 'Email দিয়ে', 'DNS দিয়ে', 'Load balancer বলে দেয়'], 'প্রতিটা node কয়েকজনকে নিজের তালিকা পাঠায়; খবর ছড়িয়ে পড়ে।'],
    ['Sloppy quorum আর hinted handoff কী সমাধান করে?', ['Node সাময়িক বন্ধ থাকলেও write নেওয়া, পরে ফেরত দেওয়া', 'Disk দ্রুত করা', 'Hash collision', 'Encryption'], 'অন্য node সাময়িক দায়িত্ব নেয়, ফিরলে হস্তান্তর।'],
    ['Write path-এ data প্রথমে কোথায় যায়?', ['Commit log, তারপর memory cache (memtable), পরে SSTable-এ', 'সরাসরি SSTable', 'শুধু memory', 'Client-এর browser'], 'Crash হলেও commit log থেকে ফেরত আনা যায়।'],
    ['Read-এ কোন SSTable-এ key আছে দ্রুত বুঝতে?', ['Bloom filter', 'Merkle tree', 'Vector clock', 'Gossip'], 'Bloom filter বলে দেয় "নেই" নিশ্চিতভাবে, "আছে" সম্ভাব্যভাবে।'],
  ],
});

export const l7 = level({
  id: 7, chapter: 2,
  title: 'একই ID দুবার', concept: 'Unique ID generator',
  story: 'দুই server একই parcel ID দিল',
  briefing: 'দুটো database server আলাদাভাবে গুনছিল, আর আজ দুটো parcel একই ID পেল। একটার tracking-এ অন্যটার ঠিকানা! এমন ID চাই যা কখনো মেলে না, আর সময়ের ক্রমে সাজানো।',
  ref: refs.p2,
  predict: ['দুই database-এ auto-increment। সমস্যা?', ['দুই জায়গায় একই নম্বর তৈরি হতে পারে', 'খুব দ্রুত হয়', 'Sort হয় না', 'ID বড় হয়']],
  nodes: [
    ['s1', 'Server A', 'server', 30, 16], ['s2', 'Server B', 'server', 70, 16],
    ['sign', '১ bit', 'step', 9, 58], ['ts', 'Timestamp ৪১', 'clock', 30, 58], ['dc', 'Datacenter ৫', 'step', 52, 58], ['mc', 'Machine ৫', 'server', 71, 58], ['seq', 'Sequence ১২', 'step', 91, 58],
  ],
  steps: [
    { text: 'দুই server আলাদাভাবে গুনলে একই ID দেয়।', add: ['s1', 's2'], down: ['s2'], badges: { s1: '#1001', s2: '#1001' } },
    { text: 'Twitter snowflake: ৬৪ bit-কে ভাগ করে ID বানানো।', hide: ['s1', 's2'], add: ['sign', 'ts', 'dc', 'mc', 'seq'] },
    { text: '৪১ bit timestamp (millisecond): ID সময়ের ক্রমে সাজানো থাকে; ~৬৯ বছর চলে।', focus: ['ts'] },
    { text: 'Datacenter আর machine ID: প্রতিটা machine আলাদা, তাই সংঘর্ষ হয় না।', focus: ['dc', 'mc'] },
    { text: 'একই millisecond-এ একই machine আরেকটা ID চাইছে।', focus: ['seq'], ask: ['এবার ID-র কোন অংশ বদলায়?', ['Sequence ১ বাড়ে', 'Timestamp বাড়ে', 'Machine ID বদলায়', 'ID একই থাকে']] },
    { text: 'Sequence বাড়ে; এক ms-এ এক machine ৪,০৯৬টা পর্যন্ত ID দিতে পারে।', focus: ['seq'], badges: { seq: '০ → ১' } },
    { text: 'Server-এর ঘড়ি হঠাৎ পিছিয়ে গেল।', down: ['ts'], ask: ['ঘড়ি পিছিয়ে গেলে ঝুঁকি?', ['Duplicate বা ক্রম ভাঙা; NTP দিয়ে মেলানো, পিছালে অপেক্ষা', 'কিছু হবে না', 'ID বড় হবে', 'শুধু sequence শূন্য হয়']] },
    { text: 'ঘড়ি মেলাতে NTP। অন্য বিকল্প: UUID (১২৮ bit, ক্রম নেই), ticket server (SPOF)।', ok: ['ts'] },
  ],
  summary: ['Snowflake: sign | timestamp ৪১ | datacenter ৫ | machine ৫ | sequence ১২', 'Timestamp-এর জন্য ID সময়ে সাজানো; sequence এক ms-এ ৪,০৯৬টা', 'UUID সহজ কিন্তু ১২৮ bit আর ক্রমহীন; ticket server SPOF'],
  play: {
    kind: 'missions', intro: '৬৪ bit ভাগ করে তিনটা সিদ্ধান্ত।',
    missions: [
      ['ID সময়ের ক্রমে sort হতে হবে, ৬৪ bit। কোনটা?', ['Snowflake', 'UUID', 'Random number', 'Email address'], 'শুরুতে timestamp থাকায় সংখ্যা বাড়ে সময়ের সাথে।'],
      ['এক ms-এ এক machine-কে ১০,০০০ ID দিতে হবে। ১২ bit sequence যথেষ্ট?', ['না, ১২ bit-এ ৪,০৯৬; sequence bit বাড়াতে হবে', 'হ্যাঁ', 'Sequence লাগেই না', 'Machine bit কমালে sequence কমে'], '২^১২ = ৪,০৯৬ < ১০,০০০; ১৪ bit (১৬,৩৮৪) লাগবে।'],
      ['UUID-এর দুর্বলতা?', ['১২৮ bit, সংখ্যা নয়, সময়ের ক্রমে নেই', 'সংঘর্ষ খুব বেশি', 'Coordination লাগে', 'খুব ধীর'], 'সংঘর্ষ নগণ্য, কিন্তু ৬৪ bit আর ক্রম চাইলে চলে না।'],
    ],
  },
  boss: [
    ['Ticket server (Flickr ধরনের)-এর সমস্যা?', ['একটা হলে SPOF; একাধিক হলে মেলানোর ঝামেলা', 'খুব জটিল', 'ID ১২৮ bit', 'Sort হয় না'], 'সব ID এক জায়গা থেকে আসে।'],
    ['Timestamp bit কমালে কী হারায়?', ['কত বছর চলবে সেটা কমে', 'Machine সংখ্যা কমে', 'Sequence কমে', 'কিছু না'], '৪১ bit ms ≈ ৬৯ বছর; কমালে আগেই ফুরায়।'],
    ['Machine bit ৫ (৩২টা)। ১০০টা machine লাগলে?', ['Machine bit বাড়াতে হবে (৭ bit = ১২৮), অন্য অংশ থেকে কমিয়ে', 'কিছু করতে হবে না', 'Timestamp বাড়ান', 'Sequence বাড়ান'], 'মোট ৬৪ bit স্থির, তাই এক অংশ বাড়লে অন্যটা কমে।', '২^৫ = ?'],
    ['Multi-master auto-increment (k করে বাড়ানো)-এর সমস্যা?', ['Server যোগ-বাদে ঝামেলা, data center জুড়ে সময়ের ক্রম থাকে না', 'Duplicate হয়', 'খুব ধীর', '১২৮ bit'], 'k স্থির, server বদলালে নিয়ম ভাঙে।'],
    ['Snowflake-এর প্রথম sign bit কেন?', ['ভবিষ্যতের জন্য রাখা, সবসময় ০', 'Timestamp-এর অংশ', 'Error দেখাতে', 'Machine ID'], 'Signed সংখ্যা ঝামেলা এড়াতে, আর পরে ব্যবহারের জন্য।'],
  ],
});
