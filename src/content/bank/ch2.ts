import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { pick, Q, wrongs } from './q';
import type { Generator, LevelBank } from './types';

/* Our own questions for chapter 2. First option is always right. */
const n = (v: number) => bn(v);

const remap: Generator = {
  id: 'l5-g1', concept: 'modulo',
  make: (rand) => {
    const s = pick(rand, [4, 5, 8, 10]);
    const mod = Math.round((s / (s + 1)) * 100), ring = Math.round((1 / (s + 1)) * 100);
    const opts = wrongs(ring, [mod, Math.round(100 / s), 50, 100 - ring]);
    return {
      prompt: tr(`${n(s)}টা cache server থেকে ${n(s + 1)}টা হলো। Consistent hashing-এ মোটামুটি কত % key সরতে হয়?`, `Cache servers go from ${s} to ${s + 1}. With consistent hashing, roughly what % of keys move?`),
      options: [`~${n(ring)}%`, ...opts.map((o) => `~${n(o)}%`)],
      explain: tr(`নতুন server শুধু নিজের ভাগটা নেয়: ~১/${n(s + 1)} = ${n(ring)}%। Modulo হলে প্রায় ${n(mod)}% সরত।`, `The new server takes only its share: ~1/${s + 1} = ${ring}%. With modulo, about ${mod}% would move.`),
    };
  },
};
const quorum: Generator = {
  id: 'l6-g1', concept: 'sloppy',
  make: (rand) => {
    const N = pick(rand, [3, 5, 7]);
    const W = pick(rand, [1, 2, 3].filter((w) => w <= N));
    const R = N - W + 1;
    const opts = wrongs(R, [N - W, R + 1, N, W]);
    return {
      prompt: tr(`N = ${n(N)}টা কপি, লেখা সফল W = ${n(W)}টা ack-এ। পড়ায় সর্বশেষ মান নিশ্চিত করতে R কমপক্ষে কত?`, `N = ${N} copies, a write succeeds after W = ${W} acks. What is the smallest R that guarantees the latest value on reads?`),
      options: [n(R), ...opts.map(n)],
      explain: tr(`W + R > N লাগবে: ${n(W)} + R > ${n(N)}, তাই R = ${n(R)}।`, `You need W + R > N: ${W} + R > ${N}, so R = ${R}.`),
    };
  },
};
const idBits: Generator = {
  id: 'l7-g1', concept: 'machinebits',
  make: (rand) => {
    const bits = pick(rand, [5, 6, 8, 10, 12]);
    const right = 2 ** bits;
    const opts = wrongs(right, [bits * 2, 2 ** (bits - 1), 10 ** Math.min(bits, 4) / 10, right * 2]);
    return {
      prompt: tr(`ID-তে machine-এর জন্য ${n(bits)} bit রাখা হলো। সর্বোচ্চ কয়টা machine আলাদা ID বানাতে পারবে?`, `${bits} bits of the ID are for the machine. At most how many machines can issue IDs?`),
      options: [n(right), ...opts.map(n)],
      explain: tr(`${n(bits)} bit-এ ২^${n(bits)} = ${n(right)}টা আলাদা মান।`, `${bits} bits give 2^${bits} = ${right} distinct values.`),
    };
  },
};
const seqBits: Generator = {
  id: 'l7-g2', concept: 'timebits',
  make: (rand) => {
    const seq = pick(rand, [8, 10, 11, 12, 14]);
    const right = 2 ** seq * 1000;
    const opts = wrongs(right, [2 ** seq, right / 2, right * 2, seq * 1000]);
    return {
      prompt: tr(`প্রতি millisecond-এ sequence-এর জন্য ${n(seq)} bit। এক machine সেকেন্ডে সর্বোচ্চ কয়টা ID দিতে পারে?`, `${seq} bits for the per-millisecond sequence. At most how many IDs can one machine issue a second?`),
      options: [n(right), ...opts.map(n)],
      explain: tr(`প্রতি ms-এ ২^${n(seq)} = ${n(2 ** seq)}টা, সেকেন্ডে ১,০০০ ms: ${n(right)}টা।`, `2^${seq} = ${2 ** seq} per ms, and a second has 1,000 ms: ${right}.`),
    };
  },
};

export const ch2Bank: Record<number, LevelBank> = {
  5: {
    concepts: [
      { id: 'use', label: tr('কোথায় ব্যবহার হয়', 'Where it is used') },
      { id: 'hotkey', label: tr('Hot key', 'Hot keys') },
      { id: 'lookup', label: tr('Ring-এ key খোঁজা', 'Finding a key on the ring') },
      { id: 'modulo', label: tr('Modulo-র সমস্যা', 'The trouble with modulo') },
      { id: 'vnodes', label: 'Virtual node' },
    ],
    gens: [remap],
    items: [
      Q('l5-x1', 'use', ['ParcelGo-র কোন জায়গায় consistent hashing সবচেয়ে কাজে লাগে?', 'Where in ParcelGo does consistent hashing help most?'], [['অনেক cache server-এ key ভাগ করতে', 'Spreading keys over many cache servers'], ['Login-এর password hash করে রাখতে', 'Hashing login passwords before storing'], ['Parcel-এর ছবি upload-এর আগে ছোট করতে', 'Compressing parcel photos before upload'], ['SMS-এর link জাল হওয়া ঠেকাতে', 'Stopping SMS links from being forged']], ['Server যোগ-বাদে কম key সরানোই এর কাজ: cache, sharded store, load balancing।', 'Its job is moving few keys when servers change: caches, sharded stores, load balancing.']),
      Q('l5-x2', 'use', ['Consistent hashing কোন জিনিস নিশ্চিত করে না?', 'What does consistent hashing NOT guarantee?'], [['কোনো server-এ data-র কপি থাকা', 'That data has copies on other servers'], ['Server বদলালে কম key সরা', 'Few keys move when servers change'], ['Key-এর জায়গা হিসাব করে বের করা', 'A key\'s place can be computed'], ['খুঁজতে কেন্দ্রীয় তালিকা লাগে না', 'Lookups need no central directory']], ['Replication আলাদা জিনিস: কপি রাখতে ring-এ পরের কয়েকটা server-এও লিখতে হয়।', 'Replication is separate: you also write to the next few servers on the ring.']),
      Q('l5-x3', 'use', ['Ring-এ replication করতে key-এর কপি সাধারণত কোথায় রাখা হয়?', 'For replication on the ring, where do a key\'s copies usually go?'], [['Clockwise পরের কয়েকটা আলাদা server-এ', 'The next few distinct servers clockwise'], ['একই server-এর আরেকটা disk-এ', 'Another disk on the same server'], ['এলোমেলো যেকোনো server-এ', 'Any random server'], ['সবগুলো server-এ একসাথে', 'Every server at once']], ['পরের আলাদা server-এ রাখলে একটা machine পড়লেও কপি থাকে।', 'Distinct next servers keep a copy alive when one machine fails.']),
      Q('l5-x4', 'hotkey', ['এক বড় merchant-এর key একটা server-কে ডুবাচ্ছে। কী করবেন?', 'One big merchant\'s key is sinking a server. What do you do?'], [['Key-এ suffix দিয়ে কয়েক ভাগে ছড়ানো', 'Split the key with suffixes across servers'], ['আরও virtual node যোগ করে ভাগ সমান করা', 'Add virtual nodes so shares even out'], ['Ring-এর hash function বদলে দেওয়া', 'Switch the ring to another hash function'], ['সব key-এর TTL কমিয়ে চাপ কমানো', 'Lower every key\'s TTL to ease the load']], ['Virtual node ভাগ সমান করে, কিন্তু একটা key তবু এক জায়গায়। Key নিজেকেই ভাঙতে হয়।', 'Virtual nodes even out shares, but one key still lives in one place; split the key itself.']),
      Q('l5-x5', 'hotkey', ['Hot key-এর পড়ার চাপ কমানোর আরেকটা উপায়?', 'Another way to relieve a hot key\'s read load?'], [['ওই key-এর কয়েকটা কপি থেকে পড়া', 'Read it from several copies'], ['Server কমিয়ে বড় machine রাখা', 'Use fewer, larger servers'], ['ওই key-এর hash function বদলানো', 'Give that key a new hash function'], ['Key মুছে প্রতিবার আবার লেখা', 'Delete and rewrite the key often']], ['জনপ্রিয় key কয়েক জায়গায় রেখে পড়া ভাগ করলে এক server বাঁচে।', 'Keeping a popular key in several places spreads its reads.']),
      Q('l5-x6', 'hotkey', ['Hot key চেনার সহজ উপায় কী?', 'An easy way to spot a hot key?'], [['প্রতি key-এর request গুনে দেখা', 'Count requests per key'], ['সবচেয়ে বড় key খোঁজা', 'Find the largest key'], ['সবচেয়ে পুরনো key খোঁজা', 'Find the oldest key'], ['Server-এর disk দেখা', 'Look at server disks']], ['Server-এর CPU একা উঁচু হলে, সেখানকার key-গুলোর request গুনলেই অপরাধী ধরা পড়ে।', 'When one server\'s CPU spikes, counting its keys\' requests finds the culprit.']),
      Q('l5-x7', 'lookup', ['Ring-এ key-এর hash সব server-এর পরে পড়লে key কোথায় যায়?', 'A key hashes past every server on the ring. Where does it go?'], [['ঘুরে প্রথম server-এ', 'Wraps round to the first server'], ['শেষ server-এই থেকে যায়', 'Stays on the last server it passed'], ['পরে server নেই, তাই error', 'Fails, since no server follows it'], ['এলোমেলো যেকোনো server-এ', 'Goes to a randomly chosen server']], ['Ring গোল: শেষের পরে আবার শুরু, তাই clockwise প্রথমটা।', 'The ring is circular: after the end comes the start, so the first clockwise.']),
      Q('l5-x8', 'lookup', ['একটা server ring থেকে সরে গেলে তার key-গুলোর কী হয়?', 'A server leaves the ring. What happens to its keys?'], [['Clockwise পরের server নেয়', 'The next server clockwise takes them'], ['সব server-এ ভাগ হয়', 'They spread over every server'], ['হারিয়ে যায়', 'They are lost'], ['আগের server নেয়', 'The previous server takes them']], ['শুধু সেই server-এর key সরে, বাকিরা যেখানে ছিল সেখানেই।', 'Only that server\'s keys move; the rest stay put.']),
      Q('l5-x9', 'lookup', ['Client কীভাবে জানে কোন key কোন server-এ?', 'How does a client know which server holds a key?'], [['Key hash করে ring-এ খুঁজে', 'Hash the key and look it up on the ring'], ['সব server-কে জিজ্ঞেস করে', 'Ask every server whether it has it'], ['কেন্দ্রীয় database-এ খুঁজে', 'Look it up in a central database'], ['সবসময় প্রথম server-এ পাঠিয়ে', 'Always send it to the first server']], ['Ring-এর ছবি সবার কাছে থাকলে হিসাব করেই জায়গা বের হয়।', 'With a copy of the ring, the place is computed, not searched.']),
      Q('l5-x10', 'modulo', ['hash(key) % N-এ N বদলালে কী হয়?', 'What happens to hash(key) % N when N changes?'], [['প্রায় সব key-এর জায়গা বদলায়', 'Almost every key changes place'], ['শুধু নতুন যোগ হওয়া key-গুলো সরে', 'Only the newly added keys move'], ['কোনো key সরে না, শুধু ভার বদলায়', 'No key moves; only load shifts'], ['ঠিক অর্ধেক key নতুন জায়গায় যায়', 'Exactly half the keys move']], ['ভাগশেষ N-এর ওপর নির্ভর করে, তাই N বদলালেই প্রায় সব বদলায়।', 'The remainder depends on N, so changing N reshuffles nearly everything.']),
      Q('l5-x11', 'modulo', ['Modulo hashing-এ cache server যোগ করলে সাথে সাথে কী দেখা যায়?', 'With modulo hashing, what do you see right after adding a cache server?'], [['Cache miss-এর ঢল, database-এ চাপ', 'A flood of cache misses hitting the DB'], ['Hit rate হঠাৎ বেড়ে যায়', 'The hit rate jumps up'], ['কিছুই বদলায় না', 'Nothing changes'], ['শুধু নতুন server ব্যস্ত হয়', 'Only the new server gets busy']], ['Key-গুলো নতুন জায়গায় খোঁজা হয় যেখানে কিছু নেই: সব miss।', 'Keys are looked up in new places that hold nothing: all misses.']),
      Q('l5-x12', 'modulo', ['Modulo hashing কখন ঠিক আছে?', 'When is modulo hashing fine?'], [['Server সংখ্যা কখনো বদলায় না', 'The server count never changes'], ['Server প্রায়ই যোগ-বাদ হয়', 'Servers come and go often'], ['Key অনেক বেশি', 'There are very many keys'], ['Hot key আছে', 'There are hot keys']], ['N স্থির থাকলে modulo সহজ আর দ্রুত; সমস্যা শুধু N বদলালে।', 'With a fixed N, modulo is simple and fast; the trouble starts when N changes.']),
      Q('l5-x13', 'vnodes', ['Virtual node কোন সমস্যা মেটায়?', 'Which problem do virtual nodes solve?'], [['Server-দের ভাগ অসমান হওয়া', 'Servers getting uneven shares'], ['এক key-তে অতিরিক্ত চাপ', 'One key getting too much traffic'], ['Data-র কোনো কপি না থাকা', 'Data having no spare copies'], ['Server-এর মাঝে network-এর দেরি', 'Network delay between servers']], ['প্রতিটা server ring-এ অনেক জায়গায় বসলে ভাগ গড়ে সমান হয়।', 'Placing each server at many points evens out the shares.']),
      Q('l5-x14', 'vnodes', ['শক্তিশালী machine বেশি ভার নেবে কীভাবে?', 'How does a stronger machine take more load?'], [['তাকে বেশি virtual node দেওয়া', 'Give it more virtual nodes'], ['তার hash বদলানো', 'Change its hash'], ['তাকে ring-এর শুরুতে রাখা', 'Put it at the start of the ring'], ['তাকে সব key দেওয়া', 'Give it every key']], ['Virtual node যত বেশি, ring-এর তত বড় অংশ তার।', 'More virtual nodes means a bigger slice of the ring.']),
      Q('l5-x15', 'vnodes', ['খুব বেশি virtual node-এর খরচ কী?', 'What is the cost of very many virtual nodes?'], [['Ring-এর তথ্য রাখতে বেশি memory', 'More memory to hold the ring'], ['কিছু key মাঝে মাঝে হারায়', 'Some keys get lost now and then'], ['Hash-এর হিসাব ভুল হতে থাকে', 'Hash results start going wrong'], ['খরচ নেই, যত বেশি তত ভালো', 'None; more is always better']], ['ভাগ সমান হয়, কিন্তু ring-এর তালিকা বড় হয় আর খোঁজা একটু ধীর।', 'Shares even out, but the ring\'s table grows and lookups slow a little.']),
    ],
  },
  6: {
    concepts: [
      { id: 'vclock', label: 'Vector clock' },
      { id: 'gossip', label: 'Gossip' },
      { id: 'sloppy', label: tr('Quorum আর node বন্ধ থাকা', 'Quorums and down nodes') },
      { id: 'write-path', label: tr('লেখার পথ', 'The write path') },
      { id: 'bloom', label: 'Bloom filter' },
    ],
    gens: [quorum],
    items: [
      Q('l6-x1', 'vclock', ['[A:3, B:1] আর [A:2, B:1]: কোনটা নতুন?', '[A:3, B:1] versus [A:2, B:1]: which is newer?'], [['প্রথমটা: সব ঘর সমান বা বেশি', 'The first: every entry ≥, one greater'], ['দ্বিতীয়টা: B দুটোতেই সমান', 'The second: B is equal in both'], ['সংঘাত: কেউ কারো আগে না', 'A conflict: neither came first'], ['আসল সময় না জানলে বলা যায় না', 'Cannot tell without wall-clock time']], ['এক vector-এর সব ঘর অন্যটার সমান বা বেশি হলে সেটাই পরের।', 'If every entry is equal or greater, that version came after.']),
      Q('l6-x2', 'vclock', ['সংঘাত ধরা পড়লে Dynamo-ধাঁচের store কী করে?', 'When a Dynamo-style store detects a conflict, what does it do?'], [['দুটো version রাখে, client মেলায়', 'Keeps both for the client to merge'], ['এলোমেলো একটা রেখে অন্যটা মোছে', 'Keeps one at random, drops the other'], ['যেটার সময় আগে সেটা রাখে', 'Keeps whichever has the older time'], ['লেখা ব্যর্থ করে আবার চাইতে বলে', 'Fails the write and asks for a retry']], ['Store জানে না কোনটা ঠিক; পড়ার সময় client দুটো পেয়ে মেলায়।', 'The store cannot know which is right; the client merges both on read.']),
      Q('l6-x3', 'vclock', ['Vector clock-এর অসুবিধা কী?', 'A drawback of vector clocks?'], [['অনেক node লিখলে vector বড় হয়', 'They grow when many nodes write'], ['আসল সময় ভুল দেখাতে থাকে', 'They show the wrong wall time'], ['শুধু এক node থাকলে কাজ করে', 'They work only on a single node'], ['প্রতিটা লেখা অনেক ধীর করে দেয়', 'They make every write much slower']], ['প্রতিটা লেখক node-এর জন্য একটা ঘর: পুরনো ঘর ছেঁটে ফেলার নিয়ম লাগে।', 'One entry per writing node: you need a rule to trim old entries.']),
      Q('l6-x4', 'gossip', ['Gossip-এ একটা node মৃত ধরা হয় কখন?', 'Under gossip, when is a node declared dead?'], [['কিছুক্ষণ তার heartbeat না বাড়লে', 'When its heartbeat stops rising for a while'], ['একটা ping-এর উত্তর না দিলেই', 'As soon as one ping goes unanswered'], ['Admin হাতে করে চিহ্ন দিলে', 'When an admin marks it by hand'], ['তার CPU অনেক বেশি উঠে গেলে', 'When its CPU usage climbs very high']], ['অনেকের কাছ থেকে শুনে, কিছুক্ষণ heartbeat না বাড়লে তবেই।', 'Only after many peers report no heartbeat increase for a while.']),
      Q('l6-x5', 'gossip', ['Gossip কেন central monitor-এর চেয়ে টেকসই?', 'Why is gossip sturdier than a central monitor?'], [['কোনো একক ভাঙার জায়গা নেই', 'No single point whose loss blinds all'], ['এটা সবচেয়ে দ্রুত খবর দেয়', 'It always reports the fastest'], ['এর কোনো network লাগে না', 'It needs no network traffic'], ['এর খবর কখনো ভুল হয় না', 'Its news is never wrong']], ['প্রতিটা node কয়েকজনকে বলে, খবর ছড়িয়ে পড়ে: কেউ একা দায়ী না।', 'Each node tells a few others and news spreads; nobody is a single point.']),
      Q('l6-x6', 'gossip', ['Gossip-এর খবর পুরো cluster-এ ছড়াতে কত সময় লাগে?', 'How long does gossip take to reach the whole cluster?'], [['কয়েক দফা, node সংখ্যার log-এর মতো', 'A few rounds, about log of the node count'], ['সাথে সাথে, এক দফাতেই সবাই জানে', 'Instantly; everyone hears in one round'], ['প্রতিটা node-এর জন্য এক মিনিট করে', 'About a minute for every single node'], ['কখনো পুরোটায় পৌঁছায় না', 'It never reaches every node at all']], ['প্রতি দফায় জানা node দ্বিগুণের মতো বাড়ে, তাই দ্রুত ছড়ায়।', 'Each round roughly doubles who knows, so it spreads fast.']),
      Q('l6-x7', 'sloppy', ['Hinted handoff-এ বন্ধ node-এর লেখা কোথায় যায়?', 'With hinted handoff, where do writes for a down node go?'], [['আরেকটা node রাখে, পরে ফেরত দেয়', 'Another node keeps them, then hands back'], ['লেখাগুলো চুপচাপ হারিয়ে যায়', 'They are quietly dropped and lost'], ['Client নিজের কাছে রেখে দেয়', 'The client holds them until later'], ['Node না ফেরা পর্যন্ত লেখা বন্ধ', 'All writes wait until the node returns']], ['অন্য node "চিরকুট" সহ রাখে, node ফিরলে পৌঁছে দেয়।', 'Another node keeps them with a hint and delivers them when the node returns.']),
      Q('l6-x8', 'sloppy', ['W = ১, R = ১ (N = ৩)-এর লাভ আর ঝুঁকি?', 'W = 1, R = 1 (N = 3): the gain and the risk?'], [['খুব দ্রুত, কিন্তু পুরনো মান আসতে পারে', 'Very fast, but reads may be stale'], ['ধীর, কিন্তু সবসময় নতুন মান আসে', 'Slow, but reads are always fresh'], ['দ্রুত, আর পড়া সবসময় সর্বশেষ', 'Fast, and reads are always latest'], ['কোনো লেখাই সফল হতে পারে না', 'No write can ever succeed']], ['W + R = ২ ≤ ৩: দুই দল নাও মিলতে পারে।', 'W + R = 2 ≤ 3: the two groups may not overlap.']),
      Q('l6-x9', 'sloppy', ['Read repair কী?', 'What is read repair?'], [['পড়ার সময় পুরনো কপি নতুন মানে ঠিক করা', 'Fixing stale copies during a read'], ['পড়ার পরে ভাঙা disk বদলে দেওয়া', 'Swapping a broken disk after a read'], ['পড়া ধীর হলে cache মুছে ফেলা', 'Clearing the cache when reads slow'], ['Log থেকে পুরনো লেখা আবার চালানো', 'Replaying old writes from the log']], ['R টা উত্তরে পুরনো মান দেখলে সেই node-এ নতুনটা লিখে দেওয়া।', 'When a read sees a stale copy, it writes the newer value back to it.']),
      Q('l6-x10', 'write-path', ['Commit log আগে লেখা হয় কেন?', 'Why is the commit log written first?'], [['Crash হলে memory-র লেখা ফেরত আনতে', 'To recover memory writes after a crash'], ['পড়ার সময় মান দ্রুত খুঁজতে', 'To find values faster on reads'], ['Disk-এর জায়গা কম খরচ করতে', 'To use less disk space overall'], ['Cache আগে থেকে ভরে রাখতে', 'To warm the cache ahead of time']], ['Memtable memory-তে; crash-এ হারায়। Log থেকে আবার বানানো যায়।', 'The memtable lives in memory and dies in a crash; the log rebuilds it.']),
      Q('l6-x11', 'write-path', ['Memtable ভরে গেলে কী হয়?', 'What happens when the memtable fills up?'], [['Disk-এ নতুন SSTable হিসেবে লেখা হয়', 'It is flushed to disk as a new SSTable'], ['পুরনো লেখাগুলো মুছে জায়গা হয়', 'Old writes are deleted to make room'], ['খালি না হওয়া পর্যন্ত লেখা থামে', 'Writes stop until it is emptied'], ['পুরোটা cache-এ সরিয়ে রাখা হয়', 'Its contents move into the cache']], ['Sorted অবস্থায় একবারে disk-এ: ক্রমিক লেখা, দ্রুত।', 'Written to disk sorted, in one sequential pass: fast.']),
      Q('l6-x12', 'write-path', ['অনেক SSTable জমলে কী করা হয়?', 'What is done when many SSTables pile up?'], [['Compaction: মিলিয়ে কম ফাইল বানানো', 'Compaction: merge into fewer files'], ['পুরনো সব ফাইল একবারে মুছে ফেলা', 'Delete all the older files at once'], ['পুরনো ফাইল cache-এ সরিয়ে রাখা', 'Move the older files into a cache'], ['প্রতিটা ফাইলের আরেকটা কপি রাখা', 'Keep a second copy of each file']], ['মেলালে পুরনো মান আর মোছা চিহ্ন বাদ যায়, পড়া দ্রুত হয়।', 'Merging drops old values and deletion markers, and reads get faster.']),
      Q('l6-x13', 'bloom', ['Bloom filter "নেই" বললে কতটা বিশ্বাস করা যায়?', 'When a Bloom filter says "not here", how far can you trust it?'], [['পুরো: নেই মানে সত্যিই নেই', 'Fully: not here means not here'], ['অর্ধেক: মাঝে মাঝে ভুল বলে', 'Half: it is wrong now and then'], ['একদম না: আবার disk দেখতে হয়', 'Not at all: always check the disk'], ['শুধু ছোট key-এর বেলায়', 'Only when the keys are small']], ['ভুল "আছে" হতে পারে, কিন্তু ভুল "নেই" কখনো না।', 'It can falsely say "maybe here", never falsely "not here".']),
      Q('l6-x14', 'bloom', ['Bloom filter বড় করলে কী কমে?', 'Making a Bloom filter bigger reduces what?'], [['ভুল "আছে"-র হার', 'The false "maybe" rate'], ['লেখার গতি', 'Write speed'], ['Key-এর সংখ্যা', 'The number of keys'], ['Disk-এর আকার', 'The disk size']], ['বেশি bit মানে কম সংঘর্ষ: অকারণে disk পড়া কমে।', 'More bits mean fewer collisions and fewer pointless disk reads.']),
      Q('l6-x15', 'bloom', ['Bloom filter থেকে key মুছতে সমস্যা কেন?', 'Why is deleting from a Bloom filter a problem?'], [['একটা bit অনেক key ভাগ করে', 'Each bit is shared by many keys'], ['মোছা যোগ করার চেয়ে অনেক ধীর', 'Deleting is far slower than adding'], ['মুছলে filter-এর আকার বদলায়', 'The filter changes its size'], ['মুছলে disk-এর ফাইল হারায়', 'Deleting loses the file on disk']], ['Bit শূন্য করলে অন্য key-এর জন্যও "নেই" বলে ফেলবে।', 'Clearing a bit would wrongly say "not here" for other keys too.']),
    ],
  },
  7: {
    concepts: [
      { id: 'ticket', label: 'Ticket server' },
      { id: 'timebits', label: tr('সময়ের bit', 'Timestamp bits') },
      { id: 'machinebits', label: tr('Machine-এর bit', 'Machine bits') },
      { id: 'multimaster', label: 'Multi-master auto-increment' },
      { id: 'layout', label: tr('ID-র গঠন', 'ID layout') },
    ],
    gens: [idBits, seqBits],
    items: [
      Q('l7-x1', 'ticket', ['Ticket server-কে নিরাপদ করতে দুটো রাখলে কী সমস্যা?', 'Running two ticket servers for safety: what is the catch?'], [['দুজনকে ID ভাগাভাগির নিয়ম মানতে হয়', 'They must coordinate to avoid clashing IDs'], ['দুটো থাকলে ID ছোট হয়ে যায়', 'Each ID gets shorter with two servers'], ['কোনো সমস্যা নেই, শুধু খরচ', 'No catch at all, only the cost'], ['ID আগের চেয়ে সময়-ক্রমে বেশি ঠিক', 'IDs become more strictly time-ordered']], ['বিজোড়/জোড় ভাগ করা যায়, কিন্তু তখন ক্রম আর যোগ-বাদ জটিল।', 'Odd/even splits work, but ordering and resizing get awkward.']),
      Q('l7-x2', 'ticket', ['Ticket server-এর ভালো দিক কোনটা?', 'What is good about a ticket server?'], [['সহজ, ছোট, সংখ্যার ID', 'Simple, small numeric IDs'], ['কোনো single point of failure নেই', 'No single point of failure'], ['ID-তে machine-এর নম্বর থাকে', 'IDs carry the machine number'], ['Network ছাড়াই ID দেওয়া যায়', 'IDs need no network to issue']], ['ছোট system-এ সহজ সমাধান; বড় হলে সেটাই দুর্বলতা।', 'A simple answer for small systems; at scale it becomes the weak spot.']),
      Q('l7-x3', 'ticket', ['UUID-র সবচেয়ে বড় অসুবিধা কোনটা?', 'The biggest downside of UUIDs?'], [['১২৮ bit লম্বা, সময়-ক্রমে না', '128 bits long and not time-ordered'], ['প্রায়ই একই UUID দুবার আসে', 'The same UUID turns up often'], ['বানাতে কেন্দ্রীয় server লাগে', 'It needs a central server to issue'], ['শুধু সংখ্যা, অক্ষর থাকে না', 'It holds only digits, no letters']], ['আলাদা ভাবে বানানো যায়, কিন্তু বড় আর index-এ এলোমেলো।', 'Generated independently, but large and scattered in indexes.']),
      Q('l7-x4', 'timebits', ['Snowflake-এর timestamp ১৯৭০ থেকে না গুনে custom epoch থেকে কেন?', 'Why count from a custom epoch rather than 1970?'], [['একই bit-এ বেশি বছর চলে', 'The same bits last more years'], ['ID দেখতে ছোট আর সুন্দর হয়', 'IDs look shorter and neater'], ['তাহলে ঘড়ি মেলাতে হয় না', 'Then clocks need no syncing'], ['Protocol-এর নিয়মে এটা বাধ্য', 'The protocol forces it']], ['শুরুর বিন্দু কাছে আনলে ফেলে আসা বছরগুলো নষ্ট হয় না।', 'Moving the start forward wastes no bits on years already gone.']),
      Q('l7-x5', 'timebits', ['ঘড়ি পেছনে গেলে (NTP) snowflake-এ কী ঝুঁকি?', 'If the clock jumps back (NTP), what is the snowflake risk?'], [['একই ID আবার তৈরি হতে পারে', 'The same ID may be issued again'], ['ID হঠাৎ বড় হয়', 'IDs suddenly grow'], ['কিছুই হয় না', 'Nothing happens'], ['Machine bit বদলায়', 'The machine bits change']], ['আগের সময় আবার এলে একই সময়-ঘর আর sequence ফিরে আসতে পারে: পিছালে অপেক্ষা করুন।', 'Revisiting a past time can repeat a timestamp and sequence; wait out the gap.']),
      Q('l7-x6', 'timebits', ['ID সময়-ক্রমে সাজানো থাকলে লাভ কী?', 'What do time-ordered IDs give you?'], [['ID দিয়েই নতুন-পুরনো সাজানো যায়', 'Sorting by ID sorts by time'], ['ID অনুমান করা অসম্ভব হয়ে যায়', 'IDs become impossible to guess'], ['ID রাখতে আলাদা storage লাগে না', 'IDs need no storage at all'], ['সব machine-এ একই ID পাওয়া যায়', 'Every machine gets the same ID']], ['Feed বা chat-এ "নতুন আগে" দেখাতে আলাদা সময়-কলাম লাগে না।', 'Feeds and chats can show newest first without a separate time column.']),
      Q('l7-x7', 'machinebits', ['Machine ID কে দেয়, যাতে দুটো machine একই না পায়?', 'Who assigns machine IDs so two machines never share one?'], [['Coordination service বা config, শুরুতে', 'A coordination service or config at startup'], ['প্রতিটা machine চালুর সময় এলোমেলো বাছে', 'Each machine picks a random one at boot'], ['প্রতি order-এ user নিজে লিখে দেয়', 'The user types one in for each order'], ['প্রতিটা ID-র জন্য database দেয়', 'The database hands one out for every ID']], ['শুরুতে একবার অনন্য machine ID নিলে, তারপর ID বানাতে কাউকে লাগে না।', 'Fetch a unique machine ID once at startup; after that, no coordination.']),
      Q('l7-x8', 'machinebits', ['Machine-এর bit কমালে কী লাভ, কী ক্ষতি?', 'Fewer machine bits: what do you gain and lose?'], [['বাকি অংশে বেশি bit, কিন্তু machine কম', 'More bits elsewhere, fewer machines'], ['কোনো প্রভাব নেই, ID একই থাকে', 'No effect; the IDs stay the same'], ['ID দ্বিগুণ লম্বা হয়ে যায়', 'Each ID becomes twice as long'], ['আর ঘড়ি মেলানোর দরকার নেই', 'Clocks no longer need syncing']], ['৬৪ bit ভাগাভাগি: এক জায়গায় বাড়ালে আরেক জায়গায় কমে।', 'The 64 bits are shared: more in one field means less in another.']),
      Q('l7-x9', 'machinebits', ['Datacenter আর machine আলাদা bit-এ রাখার কারণ?', 'Why split datacenter and machine into separate bits?'], [['প্রতিটা datacenter নিজে নম্বর দিতে পারে', 'Each datacenter numbers its own machines'], ['এতে ID-র মোট দৈর্ঘ্য কমে', 'It makes the whole ID shorter'], ['Datacenter-এর ঘড়ি মেলাতে', 'It keeps datacenter clocks in sync'], ['Bloom filter দ্রুত খুঁজতে পারে', 'It lets Bloom filters search faster']], ['অঞ্চলভেদে আলাদা দায়িত্ব: সংঘর্ষ ছাড়াই।', 'Each region manages its own numbering without clashes.']),
      Q('l7-x10', 'multimaster', ['দুটো database, step = ২: একটা ১,৩,৫ আরেকটা ২,৪,৬। তৃতীয় database যোগ?', 'Two databases with step 2 (1,3,5 and 2,4,6). Adding a third?'], [['Step বদলাতে হয়, পুরনো নিয়ম ভাঙে', 'The step must change, breaking the scheme'], ['সহজ, আগের মতোই কিছু করতে হয় না', 'Easy; nothing has to change at all'], ['তৃতীয়টা শূন্য থেকে গুনে চলে', 'The third simply counts from zero'], ['আগের সব ID মুছে আবার শুরু', 'Delete every old ID and restart']], ['Step নির্দিষ্ট: database সংখ্যা বদলালে সবাইকে আবার মেলাতে হয়।', 'The step is fixed; changing the count means renumbering everyone.']),
      Q('l7-x11', 'multimaster', ['Multi-master-এ ID সময়-ক্রমে থাকে না কেন?', 'Why are multi-master IDs not time-ordered?'], [['প্রতিটা database নিজের গতিতে বাড়ে', 'Each database counts at its own pace'], ['Database-গুলোর কোনো ঘড়ি নেই বলে', 'Because databases have no clock'], ['ID-গুলো এলোমেলো বানানো হয় বলে', 'Because the IDs are made at random'], ['আসলে থাকে, সমস্যা অন্য কোথাও', 'They are; the problem lies elsewhere']], ['ব্যস্ত database দ্রুত এগোয়: বড় সংখ্যা মানেই পরে না।', 'A busy database races ahead; a bigger number does not mean later.']),
      Q('l7-x12', 'multimaster', ['Auto-increment ID বাইরে দেখালে ঝুঁকি?', 'The risk of exposing auto-increment IDs?'], [['কতগুলো order হয়েছে আন্দাজ করা যায়', 'Others can guess how many orders you have'], ['বাইরে গেলে ID নষ্ট হয়ে যায়', 'IDs get corrupted once shared'], ['Database প্রতিবার অনেক ধীর হয়', 'The database slows on every lookup'], ['কোনো ঝুঁকি নেই, ID তো শুধু সংখ্যা', 'None; an ID is only a number']], ['ক্রমিক সংখ্যা ব্যবসার আকার আর পরের ID ফাঁস করে।', 'Sequential numbers leak your volume and the next ID.']),
      Q('l7-x13', 'layout', ['Snowflake ID কত bit?', 'How many bits is a snowflake ID?'], [['৬৪', '64'], ['৩২', '32'], ['১২৮', '128'], ['১৬', '16']], ['৬৪ bit: একটা সাধারণ long integer-এ ধরে।', '64 bits: it fits a normal long integer.']),
      Q('l7-x14', 'layout', ['Snowflake-এর অংশগুলোর ক্রম কেন timestamp আগে?', 'Why does the timestamp come first in a snowflake?'], [['যাতে ID সংখ্যা হিসেবে সময়-ক্রমে সাজে', 'So IDs sort by time as numbers'], ['যাতে machine-এর নম্বর আগে পড়া যায়', 'So the machine is read off first'], ['যাতে পুরো ID-টা ছোট হয়ে যায়', 'So the whole ID comes out shorter'], ['Snowflake-এর নিয়মে এটা বাধ্য', 'Because the format forbids otherwise']], ['উঁচু bit-এ সময় থাকলে বড় সংখ্যা মানেই পরের সময়।', 'With time in the high bits, a bigger number means later.']),
      Q('l7-x15', 'layout', ['একই millisecond-এ sequence শেষ হয়ে গেলে কী হয়?', 'What happens when the sequence runs out within one millisecond?'], [['পরের millisecond পর্যন্ত অপেক্ষা', 'Wait for the next millisecond'], ['আগের কোনো ID আবার ব্যবহার', 'Reuse an earlier ID'], ['Error দিয়ে request বন্ধ করা', 'Fail the request with an error'], ['Machine-এর bit বাড়িয়ে নেওয়া', 'Borrow bits from the machine part']], ['একটু অপেক্ষা করলেই নতুন সময়-ঘর, sequence আবার শূন্য থেকে।', 'A short wait gives a new timestamp and the sequence restarts.']),
    ],
  },
};
