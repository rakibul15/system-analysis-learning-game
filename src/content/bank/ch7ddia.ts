import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { pick, Q, wrongs } from './q';
import type { Generator, LevelBank } from './types';

/* Our own questions for the bonus chapter 7, DDIA levels 35–41. First option is always right. */
const n = (v: number) => bn(v);

const eventBalance: Generator = {
  id: 'l35-g1', concept: 'eventlog',
  make: (rand) => {
    const s = pick(rand, [50, 80, 100, 120]), a = pick(rand, [12, 20, 30, 35]), b = pick(rand, [3, 5, 8, 10]);
    const right = s - a + b;
    return {
      prompt: tr(`Event log: শুরুতে stock ${n(s)}, তারপর বিক্রি ${n(a)}, তারপর ফেরত ${n(b)}। Log চালিয়ে এখনকার stock কত?`, `Event log: stock starts at ${n(s)}, then a sale of ${n(a)}, then a return of ${n(b)}. Replaying the log, what is the stock now?`),
      options: [n(right), ...wrongs(right, [s - a - b, s + a - b, s - a, s + b]).map(n)],
      explain: tr(`${n(s)} − ${n(a)} + ${n(b)} = ${n(right)}; বর্তমান অবস্থা মানে event-গুলোর যোগফল।`, `${n(s)} − ${n(a)} + ${n(b)} = ${n(right)}; the current state is the sum of the events.`),
    };
  },
};
const quorumRead: Generator = {
  id: 'l36-g1', concept: 'quorum',
  make: (rand) => {
    const nn = pick(rand, [3, 5, 7, 9]), w = pick(rand, [1, 2, 3].filter((x) => x < nn));
    const right = nn - w + 1;
    return {
      prompt: tr(`${n(nn)}টা কপি, লেখা যায় ${n(w)}টায়। নতুন মান পাওয়ার গ্যারান্টি পেতে কমপক্ষে কয়টা কপি থেকে পড়তে হবে?`, `${n(nn)} copies, writes go to ${n(w)}. At least how many copies must a read ask to be sure of the new value?`),
      options: [n(right), ...wrongs(right, [w, nn, right - 1, right + 1, Math.ceil(nn / 2)]).map(n)],
      explain: tr(`w + r > n হতে হবে, তাই r = ${n(nn)} − ${n(w)} + ১ = ${n(right)}।`, `w + r > n is needed, so r = ${n(nn)} − ${n(w)} + 1 = ${n(right)}.`),
    };
  },
};
const modMove: Generator = {
  id: 'l37-g1', concept: 'modn',
  make: (rand) => {
    const m = pick(rand, [3, 4, 5, 9]);
    const right = Math.round((100 * m) / (m + 1));
    return {
      prompt: tr(`${n(m)}টা machine থেকে ${n(m + 1)}টা, hash mod N নিয়মে। মোটামুটি কত % key নতুন জায়গায় যাবে?`, `Going from ${n(m)} machines to ${n(m + 1)} with hash mod N. Roughly what % of keys move?`),
      options: [`~${n(right)}%`, ...wrongs(right, [Math.round(100 / (m + 1)), 50, 10, Math.round(100 / m)]).map((o) => `~${n(o)}%`)],
      explain: tr(`N বদলালে প্রায় ${n(m)}/${n(m + 1)} ≈ ${n(right)}% key-র ঘর বদলায়; fixed partition-এ মাত্র ~${n(Math.round(100 / (m + 1)))}%।`, `Changing N moves about ${n(m)}/${n(m + 1)} ≈ ${n(right)}% of keys; fixed partitions move only ~${n(Math.round(100 / (m + 1)))}%.`),
    };
  },
};
const lostUpdate: Generator = {
  id: 'l38-g1', concept: 'atomic',
  make: (rand) => {
    const c = pick(rand, [10, 20, 50, 100]), k = pick(rand, [2, 3, 4, 5]);
    const right = c + 1;
    return {
      prompt: tr(`Counter = ${n(c)}। ${n(k)}টা client একই সময়ে পড়ে ১ যোগ করে লিখল (read-modify-write)। শেষ মান কত হতে পারে?`, `A counter is ${n(c)}. ${n(k)} clients read it at the same moment and each writes back +1 (read-modify-write). What can the final value be?`),
      options: [n(right), ...wrongs(right, [c + k, c, c + k + 1, c + 2 * k]).map(n)],
      explain: tr(`সবাই ${n(c)} পড়ে ${n(right)} লেখে, তাই ${n(k - 1)}টা বদল হারায়; atomic increment হলে হতো ${n(c + k)}।`, `Everyone reads ${n(c)} and writes ${n(right)}, so ${n(k - 1)} updates vanish; an atomic increment would give ${n(c + k)}.`),
    };
  },
};
const heartbeat: Generator = {
  id: 'l39-g1', concept: 'timeout',
  make: (rand) => {
    const h = pick(rand, [2, 3, 5, 10]), m = pick(rand, [2, 3, 4, 5]);
    const right = h * m;
    return {
      prompt: tr(`Heartbeat প্রতি ${n(h)} সেকেন্ডে। পরপর ${n(m)}টা না এলে node মৃত ধরা হয়। মৃত ঘোষণা হতে সর্বোচ্চ কত সেকেন্ড?`, `Heartbeats every ${n(h)} s. A node is declared dead after ${n(m)} missed beats in a row. At most how many seconds until it is declared dead?`),
      options: [`${n(right)}`, ...wrongs(right, [h, h + m, right * 2, right + h]).map(n)],
      explain: tr(`${n(h)} × ${n(m)} = ${n(right)} সেকেন্ড; timeout ছোট করলে দ্রুত ধরা পড়ে, কিন্তু ভুল মৃত বলার ঝুঁকি বাড়ে।`, `${n(h)} × ${n(m)} = ${n(right)} s; a shorter timeout detects faster but risks false alarms.`),
    };
  },
};
const lastTask: Generator = {
  id: 'l40-g1', concept: 'skew',
  make: (rand) => {
    const t = pick(rand, [50, 100, 200, 400]), m = pick(rand, [5, 10, 15]), l = pick(rand, [60, 120, 240, 480]);
    const right = l;
    return {
      prompt: tr(`${n(t)}টা task: ${n(t - 1)}টা ${n(m)} মিনিটে শেষ, একটা hot key-র task চলে ${n(l)} মিনিট। পুরো job কত মিনিট লাগে (ভাগ না করলে)?`, `${n(t)} tasks: ${n(t - 1)} finish in ${n(m)} min, one hot-key task runs ${n(l)} min. How long does the whole job take (without splitting it)?`),
      options: [n(right), ...wrongs(right, [m, m + l, Math.round(l / 2), (t * m) / 2 + l]).map(n)],
      explain: tr(`Job শেষ হয় ধীরতম task-এর সাথে, ${n(right)} মিনিট; hot key ভাঙলে তবেই কমে।`, `A job ends with its slowest task, ${n(right)} min; only splitting the hot key shortens it.`),
    };
  },
};
const replayedSms: Generator = {
  id: 'l41-g1', concept: 'once',
  make: (rand) => {
    const r = pick(rand, [200, 400, 600, 1000]);
    const right = r;
    return {
      prompt: tr(`SMS job ভেঙে checkpoint থেকে ${n(r)}টা event আবার চালাল, idempotency key ছাড়া। কতজন বাড়তি SMS পাবে?`, `An SMS job crashed and replayed ${n(r)} events from its checkpoint, with no idempotency key. How many extra SMS go out?`),
      options: [n(right), ...wrongs(right, [r * 2, r + 1, Math.round(r / 2), r * 3]).map(n)],
      explain: tr(`প্রতিটা পুনরায় চলা event একটা বাড়তি SMS, মানে ${n(right)}টা; idempotency key থাকলে ০।`, `Each replayed event sends one more SMS, so ${n(right)}; with an idempotency key, zero.`),
    };
  },
};

export const ch7ddiaBank: Record<number, LevelBank> = {
  35: {
    concepts: [
      { id: 'doc', label: tr('Document model', 'Document model') },
      { id: 'denorm', label: tr('Denormalize-এর দাম', 'The price of denormalizing') },
      { id: 'graph', label: 'Graph model' },
      { id: 'star', label: 'Star schema' },
      { id: 'eventlog', label: 'Event sourcing' },
    ],
    gens: [eventBalance],
    items: [
      Q('l35-x1', 'doc', ['Document model-এ order-এর পাতা এক পড়ায় কেন সহজ?', 'Why is an order page easy to fetch in one read with documents?'], [['সব তথ্য এক document-এর ভেতরে', 'Everything sits inside one document'], ['প্রতিটা আলাদা table-এ থাকে বলে', 'Because each part lives in its own table'], ['Database নিজে আন্দাজ করে বসায়', 'Because the database guesses and assembles it'], ['পড়ার আগে সব সরিয়ে আনতে হয়', 'Because everything is moved before reading']], ['এক জায়গায় থাকলে join লাগে না।', 'No join is needed when it is all in one place.']),
      Q('l35-x2', 'doc', ['কোন data document-এ রাখা সবচেয়ে অস্বস্তিকর?', 'Which data is most awkward in a document model?'], [['যা অনেক জায়গায় ভাগাভাগি সম্পর্কের', 'Data shared in many-to-many ways'], ['এক order-এর ভেতরের item-এর তালিকা', 'The list of items inside one order'], ['একজন ব্যবহারকারীর ছোট সেটিংস', 'One user\'s small settings'], ['একটা চিঠির খসড়ার আলাদা অংশ', 'The separate parts of one letter draft']], ['ভাগাভাগি সম্পর্কে নকল বা হাতে জোড়া লাগে।', 'Sharing forces copies or hand-made joins.']),
      Q('l35-x3', 'doc', ['"Schema-on-read" মানে কী?', 'What does "schema-on-read" mean?'], [['পড়ার কোডই গঠন ধরে নেয়', 'The reading code assumes the structure'], ['লেখার সময় database গঠন যাচাই করে', 'The database checks the structure on write'], ['কোনো গঠনই কখনো থাকে না', 'There is never any structure at all'], ['পড়া নিষিদ্ধ, শুধু লেখা চলে', 'Reads are forbidden, only writes work']], ['গঠন database-এ বাঁধা নয়, কোডে।', 'The structure lives in code, not the database.']),
      Q('l35-x4', 'denorm', ['Merchant-এর নাম প্রতিটা order-এ নকল রাখা হয়েছে। নাম বদলালে?', 'A merchant name is copied into every order. The name changes. Then?'], [['সব নকল ঠিক করে বদলাতে হয়', 'Every copy must be updated'], ['কিছুই না, নিজে নিজে বদলায়', 'Nothing; it updates by itself'], ['শুধু প্রথম order বদলালেই চলে', 'Changing just the first order is enough'], ['পুরো database মুছে নতুন করতে হয়', 'The whole database is wiped and rebuilt']], ['নকল মানে বদলানোর দায় আপনার।', 'Copies mean the updating is on you.']),
      Q('l35-x5', 'denorm', ['Denormalize করলে লাভ কোথায়?', 'Where is the gain of denormalizing?'], [['পড়া সস্তা, join কম', 'Reads get cheap with fewer joins'], ['লেখা সস্তা, কোনো নকল নেই', 'Writes get cheap with no copies'], ['জায়গা অনেক কমে যায়', 'Storage shrinks a great deal'], ['Consistency আপনাআপনি বাড়ে', 'Consistency improves on its own']], ['কাজ পড়া থেকে লেখায় সরে।', 'The work moves from reads to writes.']),
      Q('l35-x6', 'denorm', ['কোন data normalize রাখাই ভালো?', 'Which data is better kept normalized?'], [['যা প্রায়ই বদলায়, যেমন ঠিকানা', 'Data that changes often, like an address'], ['যা কখনো বদলায় না, যেমন জন্মতারিখ', 'Data that never changes, like a birth date'], ['যা শুধু একবার পড়া হয়', 'Data that is only ever read once'], ['যা আকারে অনেক ছোট', 'Data that is very small']], ['যা বদলায়, তা এক জায়গায় রাখুন।', 'Keep what changes in one place.']),
      Q('l35-x7', 'graph', ['Graph model-এ সম্পর্ক কীভাবে থাকে?', 'How are relationships kept in a graph model?'], [['প্রতিটা সম্পর্ক নিজেই সংরক্ষিত edge', 'Each relationship is a stored edge'], ['প্রতিবার query-র সময় বানানো হয়', 'Each is rebuilt at query time'], ['সম্পর্ক শুধু text হয়ে থাকে', 'Relationships are only plain text'], ['সম্পর্ক রাখা যায়ই না', 'Relationships cannot be stored']], ['Edge ধরে এগোলেই পরের বিন্দু।', 'Follow an edge and you are at the next vertex.']),
      Q('l35-x8', 'graph', ['Hub থেকে কয়েক ধাপের মধ্যে rider খুঁজতে, join-এর তুলনায় graph?', 'Finding riders a few hops from a hub: graph versus joins?'], [['Edge ধরে এগোনো সোজা', 'Following edges is direct'], ['বেশি ধীর, প্রতি ধাপে পুরো scan', 'Slower, a full scan at each hop'], ['একই, কোনো তফাত নেই', 'Identical, no real difference'], ['একদম কাজই করে না', 'It does not work at all']], ['ধাপ যত বাড়ে, join তত ভারী।', 'Each extra hop makes joins heavier.']),
      Q('l35-x9', 'graph', ['কোন প্রশ্নে graph বিশেষ কিছু দেয় না?', 'Which question does a graph give no special help with?'], [['সব সারির একটা সংখ্যার যোগফল', 'Summing a number across all rows'], ['বন্ধুর বন্ধুর বন্ধু খোঁজা', 'Finding friends of friends of friends'], ['দুই বিন্দুর সবচেয়ে ছোট পথ', 'The shortest path between two vertices'], ['কে কার সাথে যুক্ত তা দেখা', 'Seeing who is connected to whom']], ['যোগফল কলামের কাজ, সম্পর্কের নয়।', 'A sum is a column job, not a relationship job.']),
      Q('l35-x10', 'star', ['Star schema-র চারপাশে কী থাকে?', 'What surrounds the centre of a star schema?'], [['বর্ণনার table: zone, তারিখ, merchant', 'Dimension tables: zone, date, merchant'], ['আরও কয়েকটা ঘটনার table পাশাপাশি', 'Several more tables of events beside it'], ['শুধু কিছু index file আর log', 'Nothing but some index and log files'], ['পুরোনো backup-এর কয়েকটা কপি', 'A few copies of the old backups']], ['মাঝে fact, চারপাশে dimension।', 'Facts in the middle, dimensions around.']),
      Q('l35-x11', 'star', ['Fact table-এর এক সারি কী?', 'What is one row of a fact table?'], [['একটা ঘটনা, যেমন একটা delivery', 'One event, such as a single delivery'], ['একজন merchant-এর সব তথ্য', 'Everything about one merchant'], ['একটা গোটা মাসের সারাংশ', 'A whole month summarized'], ['একটা zone-এর পুরো মানচিত্র', 'The whole map of one zone']], ['প্রতি ঘটনায় এক সারি।', 'One row per event.']),
      Q('l35-x12', 'star', ['Analytics-এ star schema কেন মানায়?', 'Why does a star schema suit analytics?'], [['বড় scan আর group করা সহজ', 'Big scans and grouping are easy'], ['প্রতিটা লেখা তাৎক্ষণিক সস্তা', 'Every single write is instantly cheap'], ['এক সারির update সবচেয়ে দ্রুত', 'Updating one row is the fastest'], ['join একেবারেই লাগে না', 'No joins are needed at all']], ['প্রশ্ন হয় "কত, কোথায়, কবে"।', 'The questions are "how many, where, when".']),
      Q('l35-x13', 'eventlog', ['Event sourcing-এ ঠিকানা বদল কীভাবে রাখা হয়?', 'In event sourcing, how is an address change recorded?'], [['নতুন "ঠিকানা বদলাল" event যোগ হয়', 'A new "address changed" event is appended'], ['পুরোনো সারি মুছে নতুন বসানো হয়', 'The old row is deleted and replaced'], ['শুধু সর্বশেষ মান রেখে বাকি ফেলা হয়', 'Only the latest value is kept, the rest dropped'], ['ঠিকানা কোথাও রাখা হয় না', 'The address is never stored anywhere']], ['Log শুধু বাড়ে, বদলায় না।', 'The log only grows, it never changes.']),
      Q('l35-x14', 'eventlog', ['Event log থেকে কী সুবিধা পাওয়া যায়?', 'What do you gain from an event log?'], [['ইতিহাস থাকে, নতুন view বানানো যায়', 'History is kept; new views can be built'], ['কখনো একটুও জায়গা লাগে না, ছোট থাকে', 'It needs no storage space and stays tiny'], ['পড়া সবসময় সবচেয়ে দ্রুত হয়', 'Reads are always the fastest possible'], ['ভুল event মুছে ফেলা খুব সহজ', 'Deleting a wrong event is very easy']], ['পুরোনো event থেকে নতুন view আবার বানানো যায়।', 'Old events can rebuild any new view.']),
    ],
  },
  36: {
    concepts: [
      { id: 'sync', label: tr('Sync বনাম async', 'Sync versus async') },
      { id: 'lag', label: 'Replication lag' },
      { id: 'failover', label: 'Failover' },
      { id: 'quorum', label: 'Quorum' },
      { id: 'conflict', label: tr('Conflict', 'Conflicts') },
    ],
    gens: [quorumRead],
    items: [
      Q('l36-x1', 'sync', ['Sync replication-এর বড় দাম কী?', 'What is the big cost of synchronous replication?'], [['কপি আটকালে লেখাও আটকে যায়', 'A stuck copy stalls the write too'], ['লেখা কখনোই নিশ্চিত হয় না', 'Writes are never confirmed'], ['কপি আর রাখা যায় না', 'Copies can no longer be kept'], ['পড়া সবসময় ভুল আসে', 'Reads always come back wrong']], ['যার জন্য অপেক্ষা, সে ধীর হলে সবাই ধীর।', 'Waiting on a slow copy slows everyone.']),
      Q('l36-x2', 'sync', ['Async-এ leader কখন "হয়েছে" বলে?', 'In async, when does the leader say "done"?'], [['নিজের কাছে লেখার পরেই', 'Right after writing to itself'], ['সব follower লেখার পর', 'After every follower has written'], ['এক ঘণ্টা পর', 'After an hour has passed'], ['কখনোই বলে না', 'It never says so']], ['তাই follower পিছিয়ে থাকতে পারে।', 'So a follower may still be behind.']),
      Q('l36-x3', 'sync', ['"Semi-sync" কী?', 'What is "semi-synchronous" replication?'], [['এক follower সঙ্গে সঙ্গে, বাকিরা async', 'One follower in step, the rest async'], ['সব follower-ই সঙ্গে সঙ্গে মেলে', 'Every follower stays strictly in step'], ['কোনো follower-ই রাখা হয় না', 'No followers are kept at all'], ['শুধু রাতের বেলা কপি করা হয়', 'Copies are made only during the night']], ['অন্তত একটা আপ-টু-ডেট কপি থাকে।', 'At least one copy is always up to date.']),
      Q('l36-x4', 'lag', ['Read-your-writes গ্যারান্টি কী বলে?', 'What does read-your-writes guarantee?'], [['নিজের লেখা পরে নিজে দেখবেন', 'You will see your own writes afterwards'], ['সবাই সবকিছু সঙ্গে সঙ্গে দেখবে', 'Everyone sees everything instantly'], ['কোনো লেখা কখনো হারাবে না', 'No write is ever lost'], ['পড়া সবসময় leader থেকে হবে', 'All reads always go to the leader']], ['অন্যের লেখা দেরিতে এলেও চলে।', 'Others\' writes may arrive late.']),
      Q('l36-x5', 'lag', ['Monotonic reads না থাকলে কী দেখা যেতে পারে?', 'Without monotonic reads, what might you see?'], [['নতুন মান দেখে পরে আবার পুরোনো', 'A new value, then an older one again'], ['সবসময় শুধু নতুন মানই আসে', 'Only ever the newest value comes back'], ['কোনো মানই ফেরত আসে না', 'No value is returned at all'], ['মান আপনাআপনি দ্বিগুণ হয়ে যায়', 'The value doubles all by itself']], ['দুই follower-এ পিছিয়ে-থাকা আলাদা।', 'Two followers lag by different amounts.']),
      Q('l36-x6', 'lag', ['Lag-এর সময় কার লেখা আগে দেখা যায় না?', 'During lag, whose write may not be visible yet?'], [['যার লেখা follower এখনো পায়নি', 'One the follower has not yet received'], ['যার নাম বর্ণমালায় আগে', 'One whose name sorts first'], ['যে সবচেয়ে ছোট data লিখেছে', 'One that wrote the smallest data'], ['যে leader-এর কাছে বসে', 'One sitting next to the leader']], ['পিছিয়ে থাকাটাই কারণ।', 'Being behind is the whole cause.']),
      Q('l36-x7', 'failover', ['Failover-এর প্রথম কাজ কী?', 'What is the first step of a failover?'], [['Leader সত্যিই ভেঙেছে কিনা ঠিক করা', 'Deciding that the leader has truly failed'], ['সব data মুছে নতুন করে শুরু করা', 'Wiping all the data and starting over'], ['আরও দুটো নতুন leader বানিয়ে ফেলা', 'Creating two more leaders straight away'], ['সব follower-কে আগে বন্ধ করে দেওয়া', 'Shutting every follower down first']], ['সাধারণত timeout দিয়ে।', 'Usually by a timeout.']),
      Q('l36-x8', 'failover', ['Async failover-এ নতুন leader পুরোনোর চেয়ে পিছিয়ে। ঝুঁকি?', 'In an async failover the new leader is behind the old one. The risk?'], [['পুরোনোর কিছু লেখা হারিয়ে যায়', 'Some of the old leader\'s writes are lost'], ['কিছুই ঘটে না, সব ঠিকঠাক থাকে', 'Nothing happens, everything stays intact'], ['সব data আপনাআপনি দ্বিগুণ হয়ে যায়', 'All the data doubles up on its own'], ['সব follower একসাথে হারিয়ে যায়', 'All of the followers disappear together']], ['যা পৌঁছায়নি, তা নতুন leader জানে না।', 'What never arrived, the new leader never knew.']),
      Q('l36-x9', 'failover', ['Split brain ঠেকাতে কী করা হয়?', 'What stops split brain?'], [['পুরোনো leader-কে আটকানো (fencing)', 'Cutting the old leader off (fencing)'], ['দুজনকেই একসাথে লিখতে দেওয়া', 'Letting both of them write at once'], ['timeout আরও ছোট করে ফেলা', 'Shortening the timeout even further'], ['কিছুই না করে চুপচাপ অপেক্ষা করা', 'Doing nothing and just waiting']], ['এক সময়ে এক leader।', 'One leader at a time.']),
      Q('l36-x10', 'quorum', ['Leaderless-এ পুরোনো কপি কীভাবে ঠিক হয়?', 'In leaderless systems, how do stale copies get fixed?'], [['পড়ার সময় ধরে বা পিছনে মিলিয়ে', 'At read time, or by background sync'], ['কখনোই ঠিক হয় না, থেকেই যায়', 'They never get fixed, they just stay'], ['সব কপি মুছে নতুন করে বানিয়ে', 'By deleting every copy and rebuilding'], ['একজন leader বাছাই করে ঠিক করে', 'By electing a leader to fix them']], ['কেউ নেতা নয়, তাই সবাই একে অপরকে মেলায়।', 'No leader, so peers sync each other.']),
      Q('l36-x11', 'quorum', ['n = ৫, w = ৩। r কমপক্ষে কত হলে গ্যারান্টি?', 'With n = 5, w = 3, what is the least r that guarantees overlap?'], [['৩', '3'], ['১', '1'], ['২', '2'], ['৫-এর বেশি', 'More than 5']], ['৩ + ৩ > ৫।', '3 + 3 > 5.']),
      Q('l36-x12', 'quorum', ['Quorum থাকলেও কখন পুরোনো মান আসতে পারে?', 'Even with a quorum, when might a stale value appear?'], [['কিছু কপিতে লেখা পৌঁছাতে না পারলে', 'A write that reached only some copies'], ['কখনোই আসে না, quorum থাকলেই ঠিক', 'Never, a quorum always rules it out'], ['সব কপি একই থাকলে তবেই আসে', 'Only when every copy is identical'], ['শুধু পড়া বন্ধ থাকলে আসে', 'Only when reads are switched off']], ['আংশিক লেখা আর ঘড়ির গোলমালও কারণ।', 'Partial writes and clock trouble also count.']),
      Q('l36-x13', 'conflict', ['"Last write wins" কেন ঝুঁকিপূর্ণ?', 'Why is "last write wins" risky?'], [['ঘড়ি মেলে না, বৈধ লেখা বাদ পড়ে', 'Clocks disagree, so valid writes get dropped'], ['কোনো লেখাই কখনো বাদ পড়ে না', 'No write is ever dropped, in any case'], ['সবসময় দুটো লেখাই সংরক্ষিত হয়', 'Both writes are always kept together'], ['এটা অনেক বেশি ধীর বলে', 'Because it is far slower than others']], ['ঘড়ির উপর ভরসা করা যায় না।', 'Clocks cannot be trusted.']),
      Q('l36-x14', 'conflict', ['Conflict ছাড়ার সবচেয়ে নিরাপদ উপায়?', 'The safest way to avoid conflicts altogether?'], [['একই data-র লেখা এক leader-এ পাঠানো', 'Route writes for the same data to one leader'], ['সবাইকে সব জায়গায় লিখতে দেওয়া', 'Let everyone write everywhere they like'], ['ঘড়ি দেখে একটা বেছে নেওয়া', 'Pick one of the two by the clock'], ['প্রতিটা লেখা দুবার করে করা', 'Perform every single write twice']], ['conflict এড়ানোই সেরা।', 'Avoiding conflicts beats resolving them.']),
      Q('l36-x15', 'conflict', ['Conflict-free data type (CRDT) কী করে?', 'What does a conflict-free data type (CRDT) do?'], [['সব কপিতে একই ফলে মেলার নিয়ম', 'It merges to the same result on every copy'], ['সবসময় শেষ লেখাকে জেতায়', 'It always lets the last write win'], ['কিছু লেখা চুপচাপ ফেলে দেয়', 'It quietly drops some of the writes'], ['দুই leader-কেই বন্ধ করে', 'It shuts both leaders down']], ['যেমন set বা counter-এর জন্য।', 'Think sets or counters.']),
    ],
  },
  37: {
    concepts: [
      { id: 'range', label: 'Key-range sharding' },
      { id: 'hash', label: 'Hash sharding' },
      { id: 'modn', label: 'hash mod N' },
      { id: 'fixed', label: 'Fixed partition' },
      { id: 'index', label: tr('Secondary index', 'Secondary indexes') },
    ],
    gens: [modMove],
    items: [
      Q('l37-x1', 'range', ['Key-range sharding-এ কোন query সবচেয়ে সোজা?', 'Which query is easiest with key-range sharding?'], [['এক তারিখ থেকে আরেক তারিখের range', 'A range from one date to another'], ['এলোমেলো একটা key একবার পড়া', 'Reading one random key, just once'], ['সব shard মিলিয়ে একটা যোগফল', 'Computing one total across all shards'], ['hash দিয়ে একটা key খুঁজে পাওয়া', 'Finding a single key through its hash']], ['কাছাকাছি key একই shard-এ।', 'Nearby keys share a shard.']),
      Q('l37-x2', 'range', ['Range sharding-এ hot spot কেন হয়?', 'Why does range sharding create hot spots?'], [['নতুন key একই প্রান্তে জমে ওঠে', 'New keys pile up at the same end'], ['সব key সমানভাবে ছড়িয়ে পড়ে', 'All the keys spread out evenly'], ['hash বেশি ভারী বলে ধীর হয়', 'Because hashing is too heavy to run'], ['shard-গুলোর নাম একই বলে', 'Because all shards share the same name']], ['সময়-ক্রমের key সবসময় শেষে যায়।', 'Time-ordered keys always land at the end.']),
      Q('l37-x3', 'range', ['Range-এর সীমা কে ঠিক করে?', 'Who decides the range boundaries?'], [['data দেখে, হাতে বা স্বয়ংক্রিয়ভাবে', 'Chosen from the data, by hand or automatically'], ['প্রতিটা key নিজেই ঠিক করে নেয়', 'Each key decides the boundaries for itself'], ['client-এর ঘড়ি দেখে ঠিক হয়', 'They are set by the client\'s clock'], ['কেউ না, সীমা এলোমেলো বসে', 'No one, the boundaries are set randomly']], ['সমান ভাগ করা মানে সমান data, সমান key নয়।', 'Aim for equal data, not equal key spans.']),
      Q('l37-x4', 'hash', ['Hash sharding কী সুবিধা দেয়?', 'What does hash sharding give you?'], [['key সমানভাবে ছড়ায়', 'Keys spread evenly'], ['range query সবচেয়ে সোজা', 'Range queries are the easiest'], ['কোনো hot key থাকে না', 'There are never any hot keys'], ['shard লাগেই না', 'No shards are needed']], ['তবে hot key-র সমস্যা থেকেই যায়।', 'A hot key is still a problem.']),
      Q('l37-x5', 'hash', ['Hash শেষে "২০২৬-১১-১৯" সময়ের range query কেমন হয়?', 'A date-range query after hashing the key?'], [['সব shard-কে জিজ্ঞেস করতে হয়', 'It has to ask every shard'], ['একটা shard-ই যথেষ্ট, বাকি লাগে না', 'One shard is enough, no others needed'], ['একেবারেই অসম্ভব, করা যায় না', 'Entirely impossible, it cannot be done'], ['এটাই সবচেয়ে দ্রুত উপায়', 'It is the fastest approach there is']], ['কাছাকাছি key ছড়িয়ে যায়।', 'Neighbouring keys scatter.']),
      Q('l37-x6', 'hash', ['এক জনপ্রিয় key-তে সব request। hash করলে?', 'All requests hit one popular key. Hashing helps?'], [['না, key তখনো এক shard-এই থাকে', 'No, the key still lives on a single shard'], ['হ্যাঁ, hash করলেই সমান ছড়ায়', 'Yes, hashing spreads it out evenly'], ['key নিজে থেকেই মুছে যায়', 'The key deletes itself automatically'], ['দ্বিগুণ shard নিজে থেকে তৈরি হয়', 'Twice as many shards appear on their own']], ['এক key মানে এক জায়গা।', 'One key means one place.']),
      Q('l37-x7', 'modn', ['hash mod N-এর বড় দুর্বলতা?', 'The big weakness of hash mod N?'], [['N বদলালে প্রায় সব key সরে যায়', 'Nearly every key moves when N changes'], ['N বদলালেও কোনো key সরে না', 'No key moves even when N changes'], ['hash function ধীর হয়ে পড়ে', 'The hash function becomes slow to run'], ['range query আচমকা সহজ হয়ে যায়', 'Range queries suddenly become easy to run']], ['মডিউলাসটাই নিয়ম।', 'The modulus is the rule itself.']),
      Q('l37-x8', 'modn', ['কোন কৌশল node বাড়ালে কম data সরায়?', 'Which approach moves less data when nodes are added?'], [['Consistent hashing বা fixed partition', 'Consistent hashing or fixed partitions'], ['hash mod N, যা সহজ আর চেনা', 'Hash mod N, which is simple and familiar'], ['সব data আগে সবার কাছে নকল করা', 'Copying all the data to everyone first'], ['node বাড়ালেও কিছুই না করা', 'Doing nothing even after adding nodes']], ['শুধু ন্যায্য অংশ সরে।', 'Only a fair share moves.']),
      Q('l37-x9', 'modn', ['Rebalancing চলাকালে system-এর কী খেয়াল রাখা উচিত?', 'During rebalancing, what should the system watch?'], [['network আর disk-এর বাড়তি চাপ', 'The extra load on network and disk'], ['key-গুলোর নামের দৈর্ঘ্য আর ধরন', 'The length and style of the key names'], ['প্রতিটা client-এর ঘড়ির সময়', 'The clock time of every single client'], ['শুধু shard-এর সংখ্যা, আর কিছু নয়', 'Only the shard count, nothing else matters']], ['ধীরে সরানো ভালো, ভিড়ে নয়।', 'Move gradually, not at peak.']),
      Q('l37-x10', 'fixed', ['Fixed partition-এ partition-সংখ্যা কেমন রাখা হয়?', 'How many partitions do fixed partitions start with?'], [['node-এর চেয়ে অনেক বেশি', 'Far more than the number of nodes'], ['ঠিক node-এর সমান', 'Exactly the number of nodes'], ['মাত্র একটা', 'Just one'], ['প্রতিটা key-র জন্য একটা', 'One per key']], ['পরে node বাড়লে partition সরানো সহজ।', 'Later, moving whole partitions is easy.']),
      Q('l37-x11', 'fixed', ['Fixed partition-এ নতুন node এলে কী সরে?', 'With fixed partitions, what moves when a node joins?'], [['কিছু গোটা partition', 'A few whole partitions'], ['সব key আলাদা করে', 'Every key one by one'], ['কিছুই না', 'Nothing at all'], ['পুরো database', 'The entire database']], ['key-র partition বদলায় না।', 'A key\'s partition never changes.']),
      Q('l37-x12', 'fixed', ['কোন সমস্যা fixed partition-এ থেকেই যায়?', 'Which problem remains with fixed partitions?'], [['একটা partition অসম ভারী থাকতে পারে', 'One partition can still be unevenly heavy'], ['key আর কখনো সরানো যায় না', 'Keys can never be moved around again'], ['নতুন node যোগ করাই যায় না', 'New nodes simply cannot be added to it'], ['range query একদমই আর চলে না', 'Range queries stop working altogether']], ['তখন partition ভাঙতে হয়।', 'Then you split that partition.']),
      Q('l37-x13', 'index', ['Local secondary index-এ লেখা কেমন?', 'How are writes with a local secondary index?'], [['সস্তা: একই shard-এ হয়ে যায়', 'Cheap: it stays on one shard'], ['প্রতিবার সব shard-এ ছুঁতে হয়', 'It must touch every shard each time'], ['অসম্ভব, লেখা যায়ই না', 'Impossible, writing is simply not allowed'], ['লেখার সময় index আপডেটই হয় না', 'The index is never updated on a write']], ['কিন্তু পড়ায় সবাইকে জিজ্ঞেস।', 'But reads ask everyone.']),
      Q('l37-x14', 'index', ['Global secondary index-এর পড়া কেমন?', 'How are reads with a global secondary index?'], [['এক জায়গা থেকেই, সস্তা', 'From one place, cheap'], ['সব shard-কে জিজ্ঞেস', 'Asking every shard'], ['অসম্ভব', 'Impossible'], ['সবচেয়ে ধীর', 'The slowest possible']], ['কিন্তু লেখা একাধিক shard-এ ছোঁয়।', 'But writes touch several shards.']),
      Q('l37-x15', 'index', ['Scatter/gather কী?', 'What is scatter/gather?'], [['সব shard-কে জিজ্ঞেস করে উত্তর জোড়া', 'Ask every shard and merge the answers'], ['এক shard-এ সব লেখা জড়ো করা', 'Gather all the writes onto one shard'], ['key ছড়িয়ে hash করে রাখা', 'Scatter the keys and hash them around'], ['পুরোনো shard মুছে ফেলার কাজ', 'The job of deleting the old shards']], ['Local index-এ পড়ার সময় এটাই ঘটে।', 'This is what a local index read does.']),
    ],
  },
  38: {
    concepts: [
      { id: 'isolation', label: tr('Isolation স্তর', 'Isolation levels') },
      { id: 'atomic', label: tr('Atomic আর lost update', 'Atomicity and lost updates') },
      { id: 'skew', label: 'Write skew' },
      { id: 'lock', label: tr('Lock আর deadlock', 'Locks and deadlock') },
      { id: 'twopc', label: 'Two-phase commit' },
    ],
    gens: [lostUpdate],
    items: [
      Q('l38-x1', 'isolation', ['Dirty read কী?', 'What is a dirty read?'], [['অন্যের commit-না-হওয়া মান পড়া', 'Reading another transaction\'s uncommitted value'], ['নিজের লেখা মান আবার পড়ে নেওয়া', 'Reading back the value you wrote yourself'], ['পুরোনো backup থেকে data পড়া', 'Reading data back out of an old backup'], ['কোনো মানই না পড়ে ফিরে আসা', 'Coming back without reading any value at all']], ['Read committed এটা ঠেকায়।', 'Read committed prevents it.']),
      Q('l38-x2', 'isolation', ['Snapshot isolation-এ transaction কী দেখে?', 'What does a transaction see under snapshot isolation?'], [['শুরুর সময়ের একটা স্থির ছবি', 'A fixed picture from when it started'], ['সবসময় সর্বশেষ মান', 'Always the very latest value'], ['কিছুই না', 'Nothing at all'], ['অন্যদের uncommitted মান', 'Others\' uncommitted values']], ['বড় রিপোর্টে ঘুরে-যাওয়া মান দেখা যায় না।', 'No shifting values mid-report.']),
      Q('l38-x3', 'isolation', ['"Serializable" কী বলে?', 'What does "serializable" promise?'], [['ফল যেন একটার পর একটা চালানোর মতো', 'The outcome looks as if they ran one by one'], ['সব কাজ একসাথে, সবচেয়ে দ্রুত চলে', 'Everything runs at once, as fast as can be'], ['কোনো lock আদৌ ব্যবহার করা হয় না', 'No locks are used anywhere in the system'], ['শুধু পড়ার কাজই চালানো যায়', 'Only read operations are allowed to run']], ['সবচেয়ে কড়া, সবচেয়ে ধীর।', 'Strictest, and the slowest.']),
      Q('l38-x4', 'atomic', ['Atomic increment কেন নিরাপদ?', 'Why is an atomic increment safe?'], [['পড়া-বদলানো-লেখা এক ধাপে হয়', 'Read, modify and write happen in one step'], ['কেউ কখনো একসাথে চালায় না বলে', 'Because nobody ever runs at the same time'], ['এটা শুধু cache-এর ভেতরে চলে বলে', 'Because it only ever runs inside a cache'], ['এটা ভুল হতেই পারে না বলে', 'Because it simply cannot ever go wrong']], ['database নিজেই ধাপ জোড়ে।', 'The database fuses the steps.']),
      Q('l38-x5', 'atomic', ['Compare-and-set কী করে?', 'What does compare-and-set do?'], [['মান আগের মতো থাকলেই লেখে', 'Writes only if the value is unchanged'], ['মান যা-ই হোক, সবসময় লিখে দেয়', 'Always writes, whatever the current value is'], ['কখনো কিছু লেখে না, শুধু পড়ে', 'Never writes anything, it only ever reads'], ['একই মান পরপর দুবার লিখে দেয়', 'Writes the very same value twice in a row']], ['না মিললে আবার চেষ্টা।', 'If it does not match, retry.']),
      Q('l38-x6', 'atomic', ['ACID-এর "A" ভাঙলে কী ঘটতে পারে?', 'If the "A" in ACID breaks, what can happen?'], [['আধা-করা কাজ থেকে যায়', 'Half-finished work stays behind'], ['সব সঠিক থাকে', 'Everything stays fully correct anyway'], ['data আপনাআপনি দ্বিগুণ', 'Data doubles itself behind the scenes'], ['কিছুই ঘটে না', 'Nothing at all happens in practice']], ['টাকা কাটল, order হলো না।', 'Money taken, order never made.']),
      Q('l38-x7', 'skew', ['কোনটা write skew-এর উদাহরণ?', 'Which is an example of write skew?'], [['দুই ডাক্তার একসাথে ছুটি নিলেন, কেউ on-call নেই', 'Two doctors both take leave, nobody is on call'], ['দুজন একই counter একসাথে বাড়ালেন, একটা হারাল', 'Two people bump the same counter at once, one is lost'], ['একজন পুরোনো একটা মান পড়ে ফেলল', 'One person happened to read an old value'], ['disk ভরে গিয়ে লেখা আটকে গেল', 'The disk filled up and writes stopped working']], ['শর্ত পড়ে ভিন্ন সারি লেখা।', 'Read a condition, write different rows.']),
      Q('l38-x8', 'skew', ['Write skew আটকাতে কোনটা কাজ করে?', 'Which prevents write skew?'], [['Serializable বা শর্তের উপর lock', 'Serializable, or a lock on the condition'], ['শুধু read committed স্তরই যথেষ্ট', 'Read committed on its own is enough'], ['আরও কয়েকটা cache বসিয়ে দেওয়া', 'Putting a few more caches in place'], ['আরও কয়েকটা server যোগ করা', 'Adding a few more servers to the pool']], ['শুধু সারি-lock যথেষ্ট না।', 'Row locks alone are not enough.']),
      Q('l38-x9', 'skew', ['Phantom কী?', 'What is a phantom?'], [['পরে যোগ হওয়া সারি আগের শর্ত বদলায়', 'A new row later changes an earlier condition'], ['মুছে ফেলা একটা সারি আবার ফিরে আসে', 'A deleted row that comes back again later'], ['disk-এর একটা hardware ভুল হয়ে যায়', 'A hardware error on the disk itself'], ['network-এ একটা বড় রকমের দেরি হয়', 'A long delay somewhere in the network']], ['যে সারি নেই তার উপর lock চলে না।', 'You cannot lock a row that does not exist.']),
      Q('l38-x10', 'lock', ['Two-phase locking-এ পড়া আর লেখা?', 'In two-phase locking, how do readers and writers interact?'], [['লেখক পাঠককে আটকায়, উল্টোটাও', 'Writers block readers, and the reverse'], ['কেউ কাউকে কখনো আটকায় না', 'Nobody ever blocks anybody else at all'], ['শুধু পাঠকরাই লেখককে আটকায়', 'Only the readers ever block the writers'], ['এখানে কোনো lock-ই ব্যবহার হয় না', 'No locks are used here in any form']], ['তাই সমান্তরালতা কমে।', 'So concurrency drops.']),
      Q('l38-x11', 'lock', ['Deadlock কীভাবে ভাঙে?', 'How is a deadlock broken?'], [['database একজনকে abort করে দেয়', 'The database aborts one of the two'], ['দুজনেই নির্বিঘ্নে জিতে যায়', 'Both of them quietly win in the end'], ['কিছুই ঘটে না, অপেক্ষা চলে', 'Nothing happens, they just keep waiting'], ['সবাই চিরকাল অপেক্ষা করে থাকে', 'Everyone waits forever without any change']], ['abort-করা জনকে আবার চেষ্টা করতে হয়।', 'The aborted one must retry.']),
      Q('l38-x12', 'lock', ['SSI আশাবাদী কেন?', 'Why is SSI called optimistic?'], [['আগে চলতে দেয়, commit-এ যাচাই করে', 'It lets work run, then checks at commit'], ['সব কিছু আগে থেকেই lock করে ফেলে', 'It locks everything right up front instead'], ['কখনোই কোনো যাচাই করে না আর', 'It never performs any check at all, ever'], ['শুধু পড়ার কাজকেই চলতে দেয়', 'It only lets the read operations proceed']], ['ঝগড়া কম হলে ভালো।', 'Good when contention is low.']),
      Q('l38-x13', 'twopc', ['Two-phase commit-এর প্রথম ধাপ?', 'The first phase of two-phase commit?'], [['coordinator জিজ্ঞেস করে সবাই প্রস্তুত কিনা', 'The coordinator asks if everyone is ready'], ['সবাই একসাথে সঙ্গে সঙ্গে commit করে', 'Everyone commits together right away at once'], ['সবাই সব data মুছে ফেলে প্রথমেই', 'Everyone wipes all of their data first off'], ['কেউ কিছুই করে না, সব চুপচাপ', 'Nobody does anything and all stays silent']], ['"হ্যাঁ" বলার পর আর ফেরা যায় না।', 'After "yes" there is no way back.']),
      Q('l38-x14', 'twopc', ['2PC-র বিকল্প কী, যা কম আটকায়?', 'An alternative to 2PC that blocks less?'], [['idempotent ধাপ আর retry (saga)', 'Idempotent steps and retries (a saga)'], ['কিছুই না করে সব আশা করা', 'Doing nothing and simply hoping for the best'], ['আরও অনেক বেশি lock ব্যবহার করা', 'Using many more locks than before overall'], ['সব data এক machine-এ জড়ো করা', 'Gathering all the data onto one machine']], ['ভুল হলে ক্ষতিপূরণের ধাপ।', 'Compensating steps on failure.']),
      Q('l38-x15', 'twopc', ['2PC-তে participant "হ্যাঁ" বলার পর কী হয়?', 'In 2PC, what happens after a participant says "yes"?'], [['coordinator-এর সিদ্ধান্ত পর্যন্ত আটকে থাকে', 'It waits for the coordinator\'s decision'], ['খুশিমতো নিজে abort করে ফেলতে পারে', 'It may abort on its own whenever it likes'], ['সব lock সঙ্গে সঙ্গে ছেড়ে দেয়', 'It releases all of its locks right away'], ['আরেকবার নতুন ভোট নিয়ে ঠিক করে', 'It takes a second vote of its own to decide']], ['এজন্যই coordinator ভাঙলে সবাই আটকা।', 'Hence a dead coordinator stalls everyone.']),
    ],
  },
  39: {
    concepts: [
      { id: 'timeout', label: 'Timeout' },
      { id: 'clock', label: tr('ঘড়ি', 'Clocks') },
      { id: 'pause', label: 'Process pause' },
      { id: 'fence', label: 'Fencing token' },
      { id: 'majority', label: tr('সংখ্যাগরিষ্ঠ', 'Majority') },
    ],
    gens: [heartbeat],
    items: [
      Q('l39-x1', 'timeout', ['Timeout পেরোলে client কী জানে?', 'When a timeout passes, what does the client know?'], [['শুধু এটুকু যে উত্তর আসেনি', 'Only that no reply has arrived'], ['server নিশ্চিতভাবে ভেঙে গেছে', 'The server has certainly crashed for good'], ['কাজটা নিশ্চিতভাবে হয়নি', 'The work was certainly not carried out'], ['network নিশ্চিতভাবে কেটে গেছে', 'The network has certainly been cut off']], ['কারণ আলাদা করা যায় না।', 'The cause cannot be told apart.']),
      Q('l39-x2', 'timeout', ['Retry-কে নিরাপদ করে কী?', 'What makes retries safe?'], [['Idempotent request', 'Idempotent requests'], ['আরও বড় timeout', 'A larger timeout'], ['আরও জোরে পাঠানো', 'Sending it harder'], ['কখনো retry না করা', 'Never retrying']], ['একই request দুবার = একবারের ফল।', 'Twice the same request = one effect.']),
      Q('l39-x3', 'timeout', ['Retry-র সময় আর কী যোগ করা উচিত?', 'What should retries also include?'], [['exponential backoff আর jitter', 'Exponential backoff plus some jitter'], ['কোনো বিরতি ছাড়া সঙ্গে সঙ্গে আবার', 'Instantly again, with no pause in between'], ['আরও ছোট আর দ্রুত একটা লুপ', 'An even tighter and faster retry loop'], ['সব client একই মুহূর্তে একসাথে', 'Every client at the very same moment']], ['নইলে সবাই একসাথে ঝড় তোলে।', 'Otherwise everyone retries in a storm.']),
      Q('l39-x4', 'clock', ['Time-of-day ঘড়ি কী করতে পারে?', 'What can a time-of-day clock do?'], [['পিছিয়ে লাফ দিতে পারে', 'It can jump backwards'], ['কখনোই পেছনে যায় না কোনোভাবে', 'It never ever moves backwards at all'], ['সব machine-এ ঠিক একই থাকে', 'It is identical on each and every machine'], ['কখনো কোনো ভুল করে না আর', 'It is never wrong about anything at all']], ['NTP ঠিক করার সময় সরে যায়।', 'It steps when NTP corrects it.']),
      Q('l39-x5', 'clock', ['"কতক্ষণ গেল" মাপতে কোন ঘড়ি?', 'Which clock measures "how long did it take"?'], [['Monotonic ঘড়ি', 'The monotonic clock'], ['দেয়ালঘড়ি-সময়', 'The wall-clock time'], ['অন্য machine-এর ঘড়ি', 'Another machine\'s clock'], ['কোনোটাই না', 'None of them']], ['এটা কখনো পিছায় না।', 'It never goes backwards.']),
      Q('l39-x6', 'clock', ['দুই machine-এর timestamp দিয়ে ঘটনার ক্রম?', 'Ordering events by two machines\' timestamps?'], [['ভরসাযোগ্য না, ঘড়ি সরে যায়', 'Not reliable, clocks drift'], ['সবসময় ঠিক', 'Always right'], ['দ্রুততম উপায়, ঝুঁকিহীন', 'Fastest and risk-free'], ['শুধু রাতে ভুল', 'Wrong only at night']], ['ক্রমের জন্য logical clock।', 'Use logical clocks for order.']),
      Q('l39-x7', 'pause', ['Process pause-এর একটা সাধারণ কারণ?', 'A common cause of a process pause?'], [['garbage collection চলা', 'A garbage collection run'], ['ঘড়ির রঙ বদলে যাওয়া', 'The colour of the clock changing'], ['key-র নাম লম্বা হয়ে যাওয়া', 'A key name growing rather long'], ['নতুন একটা লেখা আসা', 'A fresh write turning up in the log']], ['এমনকি VM থামানোও।', 'Even a paused VM counts.']),
      Q('l39-x8', 'pause', ['Pause-এর পর process কী ভুল ধরে?', 'After a pause, what does the process wrongly assume?'], [['lock এখনো তার কাছে', 'That it still holds the lock'], ['কিছুই বদলায়নি, কিন্তু ঘড়ি ঠিক', 'Nothing has changed but the clock is right'], ['server বদলেছে', 'That the server changed'], ['network দ্রুত', 'That the network is fast']], ['সে থেমে ছিল, তাই জানে না।', 'It was frozen, so it cannot know.']),
      Q('l39-x9', 'pause', ['Lease-এর মেয়াদ নবায়ন কেন কঠিন?', 'Why is lease renewal tricky?'], [['নবায়নের ঠিক আগেই pause হতে পারে', 'A pause can strike just before renewing'], ['এটা সহজ, কোনো সমস্যাই নেই', 'It is simple, there is no problem at all'], ['lease-এর কোনো দরকারই নেই বলে', 'Because leases are not needed in the first place'], ['এখানে network বলে কিছু নেই বলে', 'Because there is no network in the picture']], ['তাই checks শুধু ঘড়িতে নয়।', 'So safety cannot rest on clocks alone.']),
      Q('l39-x10', 'fence', ['Fencing token কীভাবে বাড়ে?', 'How does a fencing token grow?'], [['প্রতিবার lock দিলে আগের চেয়ে বড় সংখ্যা', 'A bigger number on every lock grant'], ['প্রতিবার সম্পূর্ণ এলোমেলো একটা সংখ্যা', 'A completely random number on every grant'], ['ক্রমেই কমতে থাকে প্রতিবার', 'It keeps on shrinking with every grant'], ['সবসময় একই সংখ্যা থেকে যায়', 'It always stays at exactly the same number']], ['ক্রমবর্ধমান বলেই তুলনা চলে।', 'Being increasing makes comparison work.']),
      Q('l39-x11', 'fence', ['Storage ছোট token পেলে?', 'When storage sees a smaller token?'], [['লেখা প্রত্যাখ্যান করে', 'It rejects the write'], ['মেনে নেয়', 'It accepts it'], ['সব data মুছে ফেলে', 'It wipes the data'], ['lock ছেড়ে দেয়', 'It releases the lock']], ['পুরোনো ধারকের ক্ষতি আটকায়।', 'Stops harm from the stale holder.']),
      Q('l39-x12', 'fence', ['Fencing-এ কে যাচাই করে?', 'Who checks in fencing?'], [['Storage নিজে', 'The storage itself'], ['worker নিজে', 'The worker itself'], ['client-এর ঘড়ি', 'The client\'s clock'], ['কেউ না', 'No one']], ['ধারকের কথায় ভরসা নয়।', 'Do not trust the holder\'s word.']),
      Q('l39-x13', 'majority', ['Majority কেন একটা node-এর চেয়ে ভালো?', 'Why is a majority better than one node?'], [['একজনের ভুল বিচার ভোটে হেরে যায়', 'One node\'s wrong call is simply outvoted'], ['কারণ এটা অনেক বেশি সস্তা', 'Because it is a great deal cheaper overall'], ['কারণ এটা আকারে অনেক ছোট', 'Because it takes up a lot less space'], ['কারণ এটা সবচেয়ে ধীর পথ', 'Because it is the slowest possible route']], ['সবাই একমত হলে তবেই সত্য।', 'Truth is what the majority agrees.']),
      Q('l39-x14', 'majority', ['৫ node-এর মধ্যে ২টা ভাঙলে majority চলে?', 'With 5 nodes and 2 down, does a majority still work?'], [['হ্যাঁ, ৩টা আছে', 'Yes, 3 remain'], ['না', 'No'], ['শুধু ১টা থাকলে', 'Only if 1 remains'], ['কখনোই না', 'Never']], ['৩টা ৫-এর majority।', '3 is a majority of 5.']),
      Q('l39-x15', 'majority', ['নেটওয়ার্ক দুই ভাগ হলে majority কীভাবে বাঁচায়?', 'When the network splits in two, how does a majority help?'], [['ছোট ভাগ majority পায় না, তাই থামে', 'The minority side has no majority, so it stops'], ['দুই ভাগই নিজের মতো এগিয়ে চলে', 'Both sides just carry on running on their own'], ['সব node একসাথে বন্ধ হয়ে যায় তখন', 'Every node shuts down together at that point'], ['ঘড়ি দেখে একটা ভাগ বেছে নেয়', 'They pick one of the two sides using a clock']], ['এক সময়ে একটাই সিদ্ধান্ত।', 'Only one decision at a time.']),
    ],
  },
  40: {
    concepts: [
      { id: 'batch', label: tr('Batch বনাম online', 'Batch versus online') },
      { id: 'mapreduce', label: 'Map / reduce' },
      { id: 'shuffle', label: 'Shuffle' },
      { id: 'dataflow', label: 'Dataflow engine' },
      { id: 'skew', label: 'Skew' },
    ],
    gens: [lastTask],
    items: [
      Q('l40-x1', 'batch', ['Batch job-এর কোন গুণ সবচেয়ে জরুরি?', 'Which quality matters most for a batch job?'], [['throughput: কত data কত সময়ে', 'Throughput: how much data per unit of time'], ['মুহূর্তের মধ্যে একটা উত্তর দেওয়া', 'Giving an answer within a split second'], ['একজন ব্যবহারকারীর response time', 'The response time felt by a single user'], ['কোনো গুণই বিশেষ জরুরি নয়', 'No single quality really matters that much']], ['কেউ অপেক্ষা করছে না।', 'Nobody is waiting.']),
      Q('l40-x2', 'batch', ['Batch input অপরিবর্তনীয় হলে লাভ?', 'Benefit of immutable batch input?'], [['ভুল হলে আবার চালিয়ে নেওয়া যায়', 'A failed run can simply be run again'], ['সব ফলাফল আগেই অনুমান করা যায়', 'Every result can be guessed beforehand'], ['আসলে কোনো লাভই পাওয়া যায় না', 'There is really no benefit that comes of it'], ['input নিজে থেকেই মুছে যায়', 'The input deletes itself once it has been used']], ['একই input, একই output।', 'Same input, same output.']),
      Q('l40-x3', 'batch', ['Batch-এর ফল কোথায় যায়?', 'Where does batch output go?'], [['নতুন file বা table-এ, input-এ নয়', 'Into a new file or table, not the input'], ['input-এর ওপরেই সরাসরি বদলে দিয়ে', 'Directly over the input, overwriting it'], ['কোথাও যায় না, হারিয়ে যায়', 'Nowhere at all, it is simply thrown away'], ['শুধু screen-এ ছাপা হয়ে শেষ', 'Only printed to the screen and then gone']], ['input অক্ষত থাকে।', 'The input stays untouched.']),
      Q('l40-x4', 'mapreduce', ['Map কী বের করে?', 'What does map emit?'], [['key-value জোড়া', 'Key-value pairs'], ['চূড়ান্ত যোগফল', 'The final total'], ['কিছুই না', 'Nothing'], ['শুধু file-এর নাম', 'Only file names']], ['যেমন (merchant, ১)।', 'Such as (merchant, 1).']),
      Q('l40-x5', 'mapreduce', ['Reduce কী পায়?', 'What does reduce receive?'], [['এক key-র সব মান একসাথে', 'All of the values for one key'], ['একটা এলোমেলো বেছে নেওয়া মান', 'One randomly chosen value out of them'], ['পুরো input file একবারে সবটা', 'The entire input file taken all in one go'], ['কিছুই পায় না, নিজেই বানায়', 'Nothing at all, it makes its own values up']], ['তাই key ধরে জোড়া সম্ভব।', 'So per-key combining works.']),
      Q('l40-x6', 'mapreduce', ['Combiner কেন কাজে লাগে?', 'Why is a combiner useful?'], [['map-এর কাছেই আংশিক জুড়ে shuffle কমায়', 'Pre-combines near the map, shrinking the shuffle'], ['shuffle-এর data আরও অনেক বাড়িয়ে দেয়', 'Makes the shuffle carry a great deal more data'], ['আসলে কিছুই করে না, শুধু সময় নেয়', 'Does nothing real, it only wastes some time'], ['input-এর অর্ধেকটা চুপচাপ মুছে ফেলে', 'Quietly deletes half of the input on the way']], ['কম data নেটওয়ার্কে যায়।', 'Less data crosses the network.']),
      Q('l40-x7', 'shuffle', ['Shuffle কী করে?', 'What does shuffle do?'], [['একই key-র সব জোড়া এক reducer-এ পাঠায়', 'Sends all pairs of one key to one reducer'], ['পুরো data মুছে দিয়ে নতুন করে শুরু করে', 'Deletes all of the data and starts afresh'], ['শুধু ফল screen-এ ছাপিয়ে দেয়', 'Only prints the results out onto a screen'], ['আসলে কিছুই করে না, চুপ থাকে', 'Actually does nothing and just sits idle']], ['সাজানো আর ভাগ করা।', 'Sorting and partitioning.']),
      Q('l40-x8', 'shuffle', ['Shuffle কমাতে সবচেয়ে ভালো?', 'Best way to shrink a shuffle?'], [['আগে ছোট করা: filter আর combine', 'Shrink it first: filter and combine'], ['আরও অনেক বেশি data পাঠিয়ে দেওয়া', 'Sending a lot more data across than before'], ['শুধু reducer-এর সংখ্যা বাড়িয়ে দেওয়া', 'Just raising the number of reducers by some'], ['কিছু না করে ধরে নেওয়া সব ঠিক', 'Doing nothing and assuming all will be fine']], ['যা যাবে না, তা সস্তা।', 'What is not sent costs nothing.']),
      Q('l40-x9', 'shuffle', ['Broadcast join-এ কী পাঠানো হয়?', 'In a broadcast join, what is sent around?'], [['ছোট table প্রতিটা worker-এ', 'The small table to every worker'], ['বড় table সবার কাছে পাঠানো হয়', 'The big table sent out to everyone else'], ['কিছুই পাঠানো হয় না, সব থাকে', 'Nothing at all is sent anywhere around'], ['শুধু key-গুলো পাঠানো হয় আলাদা', 'Only the bare keys are sent off separately']], ['বড়টা shuffle ছাড়া থাকে।', 'The big one stays put, no shuffle.']),
      Q('l40-x10', 'dataflow', ['Dataflow engine মাঝের ফল কোথায় রাখে?', 'Where does a dataflow engine keep intermediate results?'], [['যতটা পারে memory-তে রেখে সোজা পাঠায়', 'In memory where possible, passed straight on'], ['প্রতিটা ধাপে আলাদা file-এ লিখে রাখে', 'Written out to a separate file at every step'], ['কোথাওই রাখে না, সঙ্গে সঙ্গে হারায়', 'Kept nowhere at all and lost right away'], ['প্রতিবার সব মুছে ফেলে নতুন করে', 'Wiped clean and started again every single time']], ['disk-এর লেখা বাঁচে।', 'It saves disk writes.']),
      Q('l40-x11', 'dataflow', ['Dataflow-এ worker ভাঙলে কী হয়?', 'When a worker dies in a dataflow engine?'], [['হারানো অংশটা আবার হিসাব হয়', 'The lost part is simply recomputed'], ['পুরো job-ই মুছে ফেলা হয়', 'The whole job is deleted without any trace'], ['কিছুই ঘটে না, সব ঠিকঠাক থাকে', 'Nothing happens, everything carries on fine'], ['সব data আপনাআপনি দ্বিগুণ হয়ে যায়', 'All of the data doubles itself automatically']], ['কীভাবে বানানো, তা মনে রাখে।', 'It remembers how it was derived.']),
      Q('l40-x12', 'dataflow', ['MapReduce-এর তুলনায় dataflow কোথায় ভালো?', 'Where is dataflow better than plain MapReduce?'], [['অনেক ধাপের chain', 'Long chains of steps'], ['এক ধাপের কাজ', 'A single step job'], ['কিছুই না', 'Nowhere'], ['শুধু ছোট data', 'Only small data']], ['প্রতিটা ধাপের মাঝে file লাগে না।', 'No files between each step.']),
      Q('l40-x13', 'skew', ['Skew-এর সাধারণ কারণ?', 'A common cause of skew?'], [['একটা key-র record অনেক বেশি থাকে', 'One key with a huge number of records'], ['সব key-র record ঠিক সমান থাকে', 'Every key has just about the same count'], ['disk অনেক বড় হয়ে যায় বলে', 'The disk happens to be a good deal bigger'], ['network খুব দ্রুত হয়ে ওঠায়', 'The network turns out to be much faster']], ['বিখ্যাত merchant বা celebrity।', 'A famous merchant or celebrity.']),
      Q('l40-x14', 'skew', ['Skew কমানোর কৌশল?', 'A technique to reduce skew?'], [['hot key ভেঙে অংশে গুনে পরে জোড়া', 'Split the hot key, count in parts, then merge'], ['কিছুই না করে চুপচাপ অপেক্ষা করা', 'Doing nothing and quietly waiting it out'], ['worker-এর সংখ্যা আরও কমিয়ে ফেলা', 'Reducing the number of workers even more'], ['input data অর্ধেক ছোট করে ফেলা', 'Cutting the input data down to a half']], ['কাজ আরও worker-এ ছড়ায়।', 'Work spreads over more workers.']),
    ],
  },
  41: {
    concepts: [
      { id: 'log', label: tr('Log-ভিত্তিক broker', 'Log-based broker') },
      { id: 'cdc', label: 'CDC' },
      { id: 'eventtime', label: 'Event time' },
      { id: 'watermark', label: 'Watermark' },
      { id: 'once', label: 'Exactly-once' },
    ],
    gens: [replayedSms],
    items: [
      Q('l41-x1', 'log', ['Log broker-এ consumer কী মনে রাখে?', 'In a log broker, what does a consumer remember?'], [['কতদূর পড়েছে সেই অবস্থান (offset)', 'How far it has read so far (the offset)'], ['প্রতিটা event-এর একটা করে কপি', 'A private copy of each and every event'], ['কিছুই মনে রাখে না, সব ভোলে', 'Nothing at all, it forgets everything'], ['শুধু নিজের একটা নাম মনে রাখে', 'Only its own name, and nothing else besides']], ['event থেকে যায়, offset এগোয়।', 'Events stay, the offset advances.']),
      Q('l41-x2', 'log', ['নতুন consumer যোগ হলে পুরোনো event?', 'When a new consumer joins, the old events?'], [['শুরু থেকে আবার পড়তে পারে', 'They can be read again from the start'], ['চিরতরে হারিয়ে গেছে, ফেরে না', 'They are gone for good and cannot return'], ['শুধু সর্বশেষ event-টাই পাওয়া যায়', 'Only the very last event can be fetched'], ['কেউই আর কোনোদিন পায় না', 'Nobody will ever be able to get at them']], ['নতুন view বানানো সহজ।', 'Building a new view is easy.']),
      Q('l41-x3', 'log', ['একটা partition-এর ভেতরে event-এর ক্রম?', 'Event order inside one partition?'], [['ঠিক থাকে', 'It is preserved'], ['এলোমেলো', 'Random'], ['উল্টো', 'Reversed'], ['কোনো ক্রম নেই', 'No order at all']], ['partition জুড়ে ক্রমের গ্যারান্টি নেই।', 'No order guarantee across partitions.']),
      Q('l41-x4', 'cdc', ['CDC কোথা থেকে পড়ে?', 'Where does CDC read from?'], [['database-এর replication/write log থেকে', 'From the database\'s replication or write log'], ['app-এর screen-এ দেখা তথ্য থেকে', 'From what the app shows on its screen'], ['client-এর ঘড়ির সময় থেকে', 'From the time on the client\'s own clock'], ['কোথাও থেকেই পড়ে না, বানিয়ে নেয়', 'From nowhere at all, it makes the events up']], ['database-ই একমাত্র লেখা-জায়গা।', 'The database is the one place written.']),
      Q('l41-x5', 'cdc', ['Dual write-এর সমস্যা?', 'What is wrong with dual writes?'], [['একটা ব্যর্থ হলে দুটো অমিল হয়', 'If one fails, the two copies disagree'], ['সবসময় ঠিকঠাক মিলে যায় দুটো', 'The two always end up matching up nicely'], ['এটা খুবই ধীর, তাই সমস্যা', 'It is very slow, and that is the whole problem'], ['কোনো সমস্যাই নেই, নিরাপদ পথ', 'There is no problem, it is the safe route']], ['দুইয়ের ক্রমও আলাদা হতে পারে।', 'Their order may differ too.']),
      Q('l41-x6', 'cdc', ['CDC-র ফলাফল কাকে খাওয়ানো যায়?', 'Who can be fed from CDC?'], [['index, cache, analytics সবাইকে', 'Indexes, caches and analytics alike'], ['শুধু একজন consumer-কেই খাওয়ানো যায়', 'Only one single consumer can be fed from it'], ['কাউকেই খাওয়ানো যায় না আসলে', 'No one at all can really be fed from it'], ['শুধু মূল database নিজেকেই', 'Just the original database itself, and no one else']], ['এক log, অনেক অনুসরণকারী।', 'One log, many followers.']),
      Q('l41-x7', 'eventtime', ['Event time ধরে window করলে দেরিতে-আসা event?', 'With event-time windows, a late event?'], [['ঘটার সময়ের window-এ গিয়ে পড়ে', 'It goes to the window of when it happened'], ['পাওয়ার সময়ের window-এ গিয়ে পড়ে', 'It goes to the window of when it arrived'], ['মুছে যায়, আর গোনা হয় না', 'It is deleted and is never counted at all'], ['একসাথে দুটো window-তেই গিয়ে পড়ে', 'It lands in two different windows at once']], ['কিন্তু window বন্ধ হয়ে গেলে সমস্যা।', 'Trouble if the window already closed.']),
      Q('l41-x8', 'eventtime', ['Processing time দিয়ে window করার ঝুঁকি?', 'The risk of windowing by processing time?'], [['দেরির event ভুল window-এ পড়ে', 'Late events land in the wrong window'], ['কোনো ঝুঁকিই আসলে থাকে না এতে', 'There is really no risk involved in it'], ['প্রতিটা event দ্বিগুণ হয়ে যায়', 'Every single event gets doubled up on'], ['সব window-ই খালি হয়ে থাকে', 'Every one of the windows stays completely empty']], ['network দেরি হলেই ফল বদলায়।', 'Network delay alone changes the result.']),
      Q('l41-x9', 'eventtime', ['Tumbling window কী?', 'What is a tumbling window?'], [['নির্দিষ্ট আকারের, ওভারল্যাপ ছাড়া', 'Fixed in size, with no overlap at all'], ['সবসময়ই পরস্পরের সাথে ওভারল্যাপ করে', 'They always overlap one another every time'], ['কোনো শেষ নেই, অসীম লম্বা', 'They never end and just run on forever'], ['প্রতিবার এলোমেলো একটা আকারের', 'They have a random size each and every time']], ['যেমন প্রতি ৫ মিনিটের বালতি।', 'Like five-minute buckets.']),
      Q('l41-x10', 'watermark', ['Watermark পেরোনোর পরে এলে event?', 'An event arriving after the watermark?'], [['দেরি-event হিসেবে আলাদা সামলাতে হয়', 'It is handled separately as a late event'], ['একদম স্বাভাবিক event-এর মতোই গোনা হয়', 'It is counted just like any ordinary event'], ['নিজে থেকেই মুছে গিয়ে হারিয়ে যায়', 'It deletes itself and is simply lost away'], ['বন্ধ হয়ে যাওয়া window খুলে দেয়', 'It reopens the window that had been closed']], ['বাদ দেওয়া বা সংশোধন, দুটোই চলে।', 'Drop it or issue a correction.']),
      Q('l41-x11', 'watermark', ['Watermark দেরিতে এগোলে?', 'If the watermark advances slowly?'], [['ফল দেরিতে আসে, কিন্তু আরও সম্পূর্ণ', 'Results come later, but are more complete'], ['ফল আরও অনেক দ্রুত এসে পৌঁছায় তখন', 'Results arrive a great deal faster then'], ['কিছুই ঘটে না, সব আগের মতোই', 'Nothing changes, everything is as it was'], ['সব data নিজে থেকেই মুছে যায়', 'All of the data just gets deleted on its own']], ['দেরি আর সম্পূর্ণতার লেনদেন।', 'A trade between latency and completeness.']),
      Q('l41-x12', 'watermark', ['Watermark কে ঠিক করে?', 'Who sets the watermark?'], [['system অনুমান করে, দেখা সময় থেকে', 'The system estimates it from times seen'], ['ব্যবহারকারী প্রতিটা বারেই হাতে ঠিক করে', 'The user sets it by hand on every single run'], ['কেউই ঠিক করে না, নিজে বসে যায়', 'No one sets it, it just appears on its own'], ['একটা ঘড়ি নিজেই ঠিক করে দেয়', 'A clock somewhere simply decides it by itself']], ['তাই এটা অনুমান, গ্যারান্টি নয়।', 'It is a guess, not a guarantee.']),
      Q('l41-x13', 'once', ['"Exactly-once" আসলে কী বোঝায়?', 'What does "exactly-once" really mean?'], [['প্রভাব একবারই পড়ে', 'The effect lands once'], ['event কখনো দুবার চলে না', 'Events never run twice'], ['network নিখুঁত', 'The network is perfect'], ['কিছুই না', 'Nothing']], ['ভেতরে দুবার চললেও প্রভাব একবার।', 'It may run twice inside, effect once.']),
      Q('l41-x14', 'once', ['Offset আর ফল একই transaction-এ রাখলে?', 'Storing the offset and result in one transaction?'], [['আবার চললেও ফল একবারই হয়', 'Even on a replay the result lands once'], ['ফল দ্বিগুণ হয়ে জমা পড়ে যায় তখন', 'The result gets doubled up when it is saved'], ['কিছুই হয় না, সব আটকে থাকে', 'Nothing happens, everything just stays stuck'], ['এটা করা আসলে একেবারে অসম্ভব', 'Doing this is actually completely impossible']], ['দুটো একসাথে হয় বা কোনোটাই না।', 'Both happen together or neither.']),
    ],
  },
};
