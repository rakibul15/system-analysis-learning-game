import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { pick, Q, wrongs } from './q';
import type { Generator, LevelBank } from './types';

/* Our own questions for the bonus chapter 7 (levels 31–34). First option is always right. */
const n = (v: number) => bn(v);

const indexWrites: Generator = {
  id: 'l31-g1', concept: 'index',
  make: (rand) => {
    const k = pick(rand, [2, 3, 4, 5, 6]);
    const right = k + 1;
    return {
      prompt: tr(`একটা table-এ ${n(k)}টা secondary index। প্রতিটা নতুন সারিতে কয়টা গঠনে লিখতে হয়?`, `A table has ${n(k)} secondary indexes. How many structures does each new row write to?`),
      options: [n(right), ...wrongs(right, [1, k, k * 2, right + 2]).map(n)],
      explain: tr(`মূল table ১টা + ${n(k)}টা index = ${n(right)}টা; index যত, লেখা তত ভারী।`, `The table itself plus ${n(k)} indexes = ${n(right)}; more indexes, heavier writes.`),
    };
  },
};
const columnShare: Generator = {
  id: 'l32-g1', concept: 'column',
  make: (rand) => {
    const total = pick(rand, [20, 40, 50, 100]), need = pick(rand, [2, 4, 5]);
    const right = Math.round((need / total) * 100);
    return {
      prompt: tr(`Table-এ ${n(total)}টা কলাম, query-তে লাগে ${n(need)}টা। Column store মোটামুটি data-র কত % পড়ে (compression বাদে)?`, `A table has ${n(total)} columns and the query needs ${n(need)}. Roughly what % of the data does a column store read (ignoring compression)?`),
      options: [`~${n(right)}%`, ...wrongs(right, [100, 50, right * 4, Math.round(100 / need)]).map((o) => `~${n(o)}%`)],
      explain: tr(`${n(need)}/${n(total)} ≈ ${n(right)}%; row store পুরো সারি, মানে ১০০%।`, `${n(need)}/${n(total)} ≈ ${n(right)}%; a row store reads whole rows, 100%.`),
    };
  },
};
const raftTolerance: Generator = {
  id: 'l34-g1', concept: 'raft',
  make: (rand) => {
    const nodes = pick(rand, [3, 5, 7, 9]);
    const right = Math.floor((nodes - 1) / 2);
    return {
      prompt: tr(`${n(nodes)} node-এর Raft cluster। কয়টা node একসাথে হারালেও লেখা চলবে?`, `A ${n(nodes)}-node Raft cluster. How many nodes can fail at once with writes still working?`),
      options: [n(right), ...wrongs(right, [nodes - 1, right + 1, nodes, Math.max(1, right - 1)]).map(n)],
      explain: tr(`Majority = ${n(Math.floor(nodes / 2) + 1)}টা লাগে; তাই ${n(right)}টা হারানো চলে।`, `A majority of ${Math.floor(nodes / 2) + 1} is needed, so ${right} may fail.`),
    };
  },
};

export const ch7Bank: Record<number, LevelBank> = {
  31: {
    concepts: [
      { id: 'lsm', label: tr('LSM-এ লেখা কেন দ্রুত', 'Why LSM writes are fast') },
      { id: 'bloom', label: 'Bloom filter' },
      { id: 'compaction', label: 'Compaction' },
      { id: 'btree', label: 'B-tree' },
      { id: 'index', label: tr('Index-এর দাম', 'The cost of indexes') },
    ],
    gens: [indexWrites],
    items: [
      Q('l31-x1', 'lsm', ['LSM-এ লেখা প্রথমে কোথায় যায়, যাতে crash-এ না হারায়?', 'Where does an LSM write go first so a crash cannot lose it?'], [['Commit log-এর শেষে', 'The end of a commit log'], ['সরাসরি SSTable-এর মাঝে', 'Straight into an SSTable'], ['শুধু Bloom filter-এ', 'Only into the Bloom filter'], ['Client-এর cache-এ', 'Into the client\'s cache']], ['Log থেকে memtable আবার বানানো যায়।', 'The memtable can be rebuilt from the log.']),
      Q('l31-x2', 'lsm', ['Memtable কেন সাজানো রাখা হয়?', 'Why is the memtable kept sorted?'], [['একবারে সাজানো file লেখা যায়', 'So a sorted file can be written at once'], ['দেখতে গোছানো লাগে বলে', 'Because it simply looks tidier'], ['Index বাদ দেওয়া যায় বলে', 'So that indexes can be skipped'], ['Network কম লাগে বলে', 'So that less network is used']], ['সাজানো file-এ খোঁজা আর মেলানো দুটোই সহজ।', 'Sorted files make both lookups and merges easy.']),
      Q('l31-x3', 'lsm', ['LSM-এর পড়া মাঝে মাঝে ধীর কেন?', 'Why are LSM reads sometimes slower?'], [['কয়েকটা file দেখতে হতে পারে', 'Several files may need checking'], ['Disk-এ কিছু লেখা থাকে না', 'Nothing is written to disk'], ['Memory ব্যবহার হয় না', 'Memory is never used'], ['প্রতিবার compaction চলে', 'Compaction runs on every read']], ['Bloom filter আর compaction এই খরচ কমায়।', 'Bloom filters and compaction cut that cost.']),
      Q('l31-x4', 'bloom', ['Bloom filter কোন প্রশ্নে সময় বাঁচায়?', 'Which question does a Bloom filter answer cheaply?'], [['Key এই file-এ নেই কিনা', 'Whether a key is absent'], ['Key-এর মান ঠিক কত', 'What the key\'s value is'], ['পুরো file কত বড়', 'How large the whole file is'], ['কে key-টা লিখেছে', 'Who wrote the key in']], ['নেই হলে disk পড়াই লাগে না।', 'If absent, no disk read is needed.']),
      Q('l31-x5', 'bloom', ['Bloom filter বড় করলে কী হয়?', 'What does a bigger Bloom filter do?'], [['ভুল "হয়তো আছে" কমে', 'Fewer false "maybe present"'], ['ভুল "নেই" বাড়ে', 'More false "absent" answers'], ['লেখা ধীর হয়ে যায়', 'Writes become much slower'], ['কিছুই বদলায় না', 'Nothing changes at all']], ['বেশি bit মানে কম সংঘর্ষ।', 'More bits mean fewer collisions.']),
      Q('l31-x6', 'bloom', ['Bloom filter কোথায় রাখা হয় সাধারণত?', 'Where is a Bloom filter usually kept?'], [['Memory-তে, প্রতিটা file-এর জন্য', 'In memory, one per file'], ['আলাদা server-এ, network দিয়ে', 'On a separate server'], ['প্রতিটা সারির ভেতরে', 'Inside every single row'], ['Client-এর phone-এ', 'On the client\'s phone']], ['ছোট, তাই memory-তে রেখে দ্রুত দেখা যায়।', 'It is small, so it lives in memory for fast checks.']),
      Q('l31-x7', 'compaction', ['Compaction না চললে কী হয়?', 'What happens if compaction never runs?'], [['File জমে, পড়া ধীর, disk ভরে', 'Files pile up and reads slow'], ['লেখা চিরকাল আরও দ্রুত হয়', 'Writes get faster forever'], ['Bloom filter কাজ বন্ধ করে', 'Bloom filters stop working'], ['Data নিজে থেকেই মুছে যায়', 'Data quietly deletes itself']], ['পুরনো মান আর মোছা চিহ্ন জায়গা খেয়ে বসে থাকে।', 'Old values and tombstones keep taking space.']),
      Q('l31-x8', 'compaction', ['Compaction-এর একটা ঝুঁকি?', 'One risk of compaction?'], [['ভিড়ের সময় disk খেয়ে ফেলা', 'Eating disk at busy times'], ['কিছু data চিরতরে হারানো', 'Losing some data for good'], ['সব index ভেঙে ফেলা', 'Breaking every index'], ['কোনো ঝুঁকিই নেই এতে', 'There is no risk at all']], ['ঠিকমতো না সামলালে লেখার সাথে disk-এর জন্য লড়াই।', 'Untuned, it competes with writes for disk.']),
      Q('l31-x9', 'compaction', ['মোছা key compaction-এ কী হয়?', 'What happens to a deleted key during compaction?'], [['মোছা চিহ্ন সহ পুরোপুরি বাদ', 'It is dropped along with its tombstone'], ['আবার জীবিত হয়ে ফেরে', 'It comes back to life'], ['নতুন file-এ কপি হয়', 'It is copied to the new file'], ['Bloom filter-এ চলে যায়', 'It moves into the Bloom filter']], ['তখনই আসলে জায়গা ফেরত আসে।', 'That is when the space really comes back.']),
      Q('l31-x10', 'btree', ['B-tree-তে একটা key খুঁজতে কয় ধাপ লাগে?', 'How many steps to find a key in a B-tree?'], [['গাছের উচ্চতা, সাধারণত ৩–৪', 'The tree height, often 3–4'], ['প্রতিটা পাতা একবার করে', 'One per page in the table'], ['এক ধাপও না, hash দিয়ে', 'None; it uses hashing'], ['File-এর সংখ্যার সমান', 'As many as there are files']], ['প্রতিটা পাতায় অনেক key, তাই গাছ খুব চওড়া, কম উঁচু।', 'Each page holds many keys, so the tree is wide and shallow.']),
      Q('l31-x11', 'btree', ['B-tree-র পাতা ভরে গেলে?', 'A B-tree page is full. Then?'], [['দুই ভাগ হয়, parent হালনাগাদ', 'It splits; the parent updates'], ['পুরনো key মুছে জায়গা হয়', 'Old keys are deleted for room'], ['নতুন লেখা বন্ধ হয়ে যায়', 'New writes stop completely'], ['নতুন একটা file বানানো হয়', 'A brand new file is created']], ['এভাবেই গাছ ভারসাম্য রেখে বড় হয়।', 'That is how the tree grows while staying balanced.']),
      Q('l31-x12', 'btree', ['B-tree crash থেকে বাঁচাতে কী লাগে?', 'What protects a B-tree from crashes?'], [['Write-ahead log', 'A write-ahead log'], ['Bloom filter', 'A Bloom filter'], ['Compaction', 'Compaction'], ['Memtable', 'A memtable']], ['পাতা বদলানোর আগে log-এ লিখলে মাঝপথের crash সারানো যায়।', 'Logging before changing pages lets half-done changes be repaired.']),
      Q('l31-x13', 'index', ['Query-তে filter merchant_id, sort created_at। কোন index?', 'Filter by merchant_id, sort by created_at. Which index?'], [['(merchant_id, created_at) একসাথে', 'One on (merchant_id, created_at)'], ['(created_at, merchant_id) একসাথে', 'One on (created_at, merchant_id)'], ['শুধু created_at-এ', 'One on created_at only'], ['শুধু merchant_id-এ', 'One on merchant_id only']], ['আগে যেটা দিয়ে খোঁজেন, পরে যেটা দিয়ে সাজান।', 'First what you filter by, then what you sort by.']),
      Q('l31-x14', 'index', ['লেখা-ভারী table-এ নতুন index যোগের আগে কী দেখবেন?', 'Before adding an index to a write-heavy table, check?'], [['কোন query কতটা বাঁচে', 'Which query it speeds up, and how much'], ['Table-এর নাম কত লম্বা', 'How long the table name is'], ['Dashboard কোন রঙের', 'Which colour the dashboard is'], ['কিছুই দেখার দরকার নেই', 'Nothing at all needs checking']], ['প্রতিটা index লেখার দাম বাড়ায়; লাভ মেপে যোগ করুন।', 'Every index taxes writes; add it for a measured gain.']),
    ],
  },
  32: {
    concepts: [
      { id: 'olap', label: 'OLTP vs OLAP' },
      { id: 'column', label: 'Column store' },
      { id: 'star', label: 'Star schema' },
      { id: 'mview', label: 'Materialized view' },
      { id: 'etl', label: tr('Warehouse ভরা', 'Feeding the warehouse') },
    ],
    gens: [columnShare],
    items: [
      Q('l32-x1', 'olap', ['"এই order-এর status কী?" কোন ধরনের query?', '"What is this order\'s status?" Which kind of query?'], [['OLTP: একটা নির্দিষ্ট সারি', 'OLTP: one specific row'], ['OLAP: লাখো সারির যোগ', 'OLAP: sums over millions'], ['Batch: রাতের job', 'Batch: a nightly job'], ['Stream: window-এ গোনা', 'Stream: counting in windows']], ['ছোট, নির্দিষ্ট, দ্রুত: OLTP।', 'Small, targeted and fast: OLTP.']),
      Q('l32-x2', 'olap', ['"গত বছর এলাকা ধরে মোট COD" কোন ধরনের?', '"Total COD by area last year" is which kind?'], [['OLAP: বড় scan আর যোগ', 'OLAP: a big scan and sum'], ['OLTP: একটা সারি', 'OLTP: a single row'], ['Cache-এর একটা key', 'A single cache key'], ['একটা message', 'A single message']], ['অনেক সারি, অল্প কলাম, যোগফল: OLAP।', 'Many rows, few columns, sums: OLAP.']),
      Q('l32-x3', 'olap', ['দুই ধরনের কাজ এক DB-তে চালালে মূল সমস্যা?', 'The main problem with both loads on one DB?'], [['বড় scan ছোট কাজকে ধীর করে', 'Big scans slow down small work'], ['কিছু data হারিয়ে যায়', 'Some data gets lost'], ['Index আর কাজ করে না', 'The indexes stop working'], ['কোনো সমস্যাই নেই এতে', 'There is no problem at all']], ['Order নেওয়া রিপোর্টের পেছনে আটকে যায়।', 'Order taking gets stuck behind reports.']),
      Q('l32-x4', 'column', ['Column store-এ compression কেন ভালো কাজ করে?', 'Why does compression work so well in a column store?'], [['একই ধরনের মান পাশাপাশি', 'Similar values sit side by side'], ['সারিগুলো এলোমেলো থাকে', 'Rows are kept in random order'], ['কোনো type নেই', 'There are no types'], ['সব মান আলাদা', 'Every value is different']], ['একটা কলামে প্রায়ই একই মান বারবার: সহজে ছোট হয়।', 'A column repeats values often, so it shrinks easily.']),
      Q('l32-x5', 'column', ['Column store-এ একটা সারি বদলানো কেন কষ্টের?', 'Why is updating one row awkward in a column store?'], [['সারিটা অনেক কলাম-file-এ', 'The row spans many column files'], ['সারি বদলানো নিয়মে নিষিদ্ধ', 'Updating rows is not allowed'], ['সেখানে কোনো disk-ই নেই', 'There is no disk involved'], ['কষ্ট নেই, একদম সহজ', 'It is not awkward at all']], ['এজন্যই warehouse-এ লেখা আসে batch-এ।', 'That is why warehouses load in batches.']),
      Q('l32-x6', 'star', ['Dimension table-এ কী থাকে?', 'What goes in a dimension table?'], [['বিবরণ: merchant, এলাকা, তারিখ', 'Descriptions: merchant, area, date'], ['প্রতিটা delivery-র মাপ', 'Each delivery\'s measured values'], ['শুধু কাঁচা log-এর লেখা', 'Only the raw log lines'], ['Cache-এর সব key', 'All of the cache keys']], ['Fact-এ ঘটনা আর সংখ্যা, dimension-এ সেগুলোর বর্ণনা।', 'Facts hold events and numbers; dimensions describe them.']),
      Q('l32-x7', 'star', ['Fact table-এর একটা সারি কী?', 'What is one row of a fact table?'], [['একটা ঘটনা, যেমন একটা delivery', 'One event, such as a delivery'], ['একজন merchant-এর বিবরণ', 'One merchant\'s profile'], ['একটা এলাকার নাম', 'One area\'s name'], ['একটা দিনের তারিখ', 'One calendar date']], ['Fact table সবচেয়ে বড়, ঘটনার সংখ্যার সমান।', 'The fact table is the biggest, one row per event.']),
      Q('l32-x8', 'star', ['Snowflake schema star থেকে কীভাবে আলাদা?', 'How does a snowflake schema differ from a star?'], [['Dimension আরও ভাগ হয়', 'Dimensions split into more tables'], ['কোনো fact table থাকে না', 'There is no fact table'], ['সব একটা table-এ রাখা', 'Everything sits in one table'], ['কোনো পার্থক্যই নেই', 'There is no difference at all']], ['বেশি normalize, তবে query-তে join বেশি।', 'More normalized, but more joins in queries.']),
      Q('l32-x9', 'mview', ['Materialized view-এর দাম কী?', 'What does a materialized view cost?'], [['Data বদলালে হালনাগাদ লাগে', 'It needs refreshing as data changes'], ['কোনো দাম নেই, বিনামূল্যে', 'Nothing; it is completely free'], ['সব পড়া ধীর হয়ে যায়', 'Every read gets slower'], ['কিছু data হারিয়ে যায়', 'Some of the data gets lost']], ['আগে থেকে হিসাব মানে পরে মিলিয়ে রাখার দায়।', 'Computing ahead means keeping it in step later.']),
      Q('l32-x10', 'mview', ['Data cube কী?', 'What is a data cube?'], [['কয়েক মাত্রায় আগে থেকে যোগ', 'Sums pre-computed over several axes'], ['একটা ৩D ছবি', 'A 3D picture of the data'], ['এক ধরনের cache server', 'A kind of cache server'], ['একটা message queue', 'A message queue for events']], ['যেমন merchant × দিন × এলাকা ধরে মোট।', 'For example totals by merchant × day × area.']),
      Q('l32-x11', 'mview', ['Rollup কতক্ষণ পর পর হালনাগাদ হবে, কিসে ঠিক হয়?', 'What decides how often a rollup refreshes?'], [['কতটা টাটকা সংখ্যা দরকার', 'How fresh the numbers must be'], ['Table-এর নামের দৈর্ঘ্য', 'The table name\'s length'], ['Merchant-এর সংখ্যা জোড়-বিজোড়', 'Whether merchants are even or odd'], ['কখনো হালনাগাদ হয় না', 'It never refreshes']], ['দিনশেষের রিপোর্টে রাতে, live dashboard-এ ঘন ঘন।', 'Nightly for daily reports, often for live dashboards.']),
      Q('l32-x12', 'etl', ['CDC কী?', 'What is CDC?'], [['DB-র বদল ধরে অন্যত্র পাঠানো', 'Capturing DB changes and passing them on'], ['একটা নতুন ধরনের database', 'A new kind of database engine'], ['একটা cache-এর নীতি', 'A policy for the cache'], ['এক ধরনের encryption', 'A form of data encryption']], ['Live DB-র change log পড়ে warehouse হালনাগাদ।', 'Reads the live DB\'s change log to update the warehouse.']),
      Q('l32-x13', 'etl', ['CDC-র লাভ রাতের পুরো কপির তুলনায়?', 'The benefit of CDC over a nightly full copy?'], [['টাটকা data, live DB-তে চাপ কম', 'Fresher data, lighter live DB load'], ['কোনো লাভই নেই এতে', 'There is no benefit at all'], ['Data আরও পুরনো থাকে', 'The data ends up staler'], ['তখন warehouse-ই লাগে না', 'No warehouse is needed then']], ['শুধু বদলটুকু পাঠানো হয়, পুরোটা না।', 'Only the changes travel, not everything.']),
      Q('l32-x14', 'etl', ['Warehouse-এ ভুল data গেলে কী সুবিধা থাকে?', 'Bad data reached the warehouse. What helps?'], [['মূল উৎস থেকে আবার চালিয়ে বানানো', 'Rebuild it from the source again'], ['হাতে হাতে সংখ্যা বদলানো', 'Edit the numbers by hand'], ['রিপোর্ট বন্ধ করে দেওয়া', 'Turn the reports off'], ['কিছুই করার নেই', 'Nothing can be done']], ['Warehouse derived data; উৎস থেকে আবার হিসাব করা যায়।', 'A warehouse is derived data, so it can be recomputed.']),
    ],
  },
  33: {
    concepts: [
      { id: 'compat', label: tr('Backward আর forward', 'Backward and forward') },
      { id: 'addfield', label: tr('নতুন field যোগ', 'Adding a field') },
      { id: 'fieldnum', label: tr('Protobuf field নম্বর', 'Protobuf field numbers') },
      { id: 'avro', label: tr('Avro-র schema মিল', 'Avro schema resolution') },
      { id: 'expand', label: 'Expand-contract' },
    ],
    gens: [],
    items: [
      Q('l33-x1', 'compat', ['পুরনো app নতুন server-এর response পড়তে পারে: কোন compatibility?', 'An old app can read a new server\'s response: which kind?'], [['Forward compatibility', 'Forward compatibility'], ['Backward compatibility', 'Backward compatibility'], ['Binary compatibility', 'Binary compatibility'], ['Linear compatibility', 'Linear compatibility']], ['পুরনো code নতুন data বুঝলে forward।', 'Old code handling new data is forward compatibility.']),
      Q('l33-x2', 'compat', ['নতুন code পাঁচ বছর পুরনো DB সারি পড়ে: কোনটা লাগে?', 'New code reads a five-year-old DB row: which is needed?'], [['Backward compatibility', 'Backward compatibility'], ['Forward compatibility', 'Forward compatibility'], ['কোনো compatibility না', 'No compatibility at all'], ['শুধু encryption', 'Encryption only']], ['নতুন code পুরনো data বুঝলে backward।', 'New code handling old data is backward compatibility.']),
      Q('l33-x3', 'compat', ['Mobile app-এ forward compatibility এত জরুরি কেন?', 'Why does forward compatibility matter so much for mobile apps?'], [['সবাই সাথে সাথে update করে না', 'Not everyone updates right away'], ['Phone-এ disk কম থাকে বলে', 'Because phones have little disk'], ['App store-এর নিয়মে বাধ্য', 'Because app store rules demand it'], ['জরুরি না আসলে', 'It does not really matter']], ['পুরনো app মাসের পর মাস নতুন server-এর সাথে কথা বলে।', 'Old apps talk to new servers for months.']),
      Q('l33-x4', 'addfield', ['নতুন required field যোগ করলে কী ভাঙে?', 'What breaks if you add a new required field?'], [['পুরনো data আর client', 'Old data and old clients'], ['কিছুই ভাঙে না, নিরাপদ', 'Nothing; it is perfectly safe'], ['শুধু নতুন client-গুলো', 'Only the new clients'], ['শুধু index-গুলো', 'Only the indexes']], ['পুরনোদের কাছে ওই field নেই; required হলে সব ব্যর্থ।', 'Old ones lack the field; if required, they all fail.']),
      Q('l33-x5', 'addfield', ['নতুন field-এর default কেন দেওয়া হয়?', 'Why give a new field a default?'], [['পুরনো সারিতেও মান পেতে', 'So old rows still give a value'], ['Field-টা ছোট করতে', 'To make the field smaller'], ['Encryption-এর জন্য', 'For encryption purposes'], ['কোনো বিশেষ কারণ নেই', 'For no particular reason']], ['না থাকলে default: code-কে আলাদা করে ভাবতে হয় না।', 'Missing means default, so code need not special-case it.']),
      Q('l33-x6', 'addfield', ['পুরনো code অচেনা field পেলে কী করা উচিত?', 'What should old code do with an unknown field?'], [['উপেক্ষা করে, অক্ষত রেখে দেওয়া', 'Ignore it but keep it intact'], ['Error দিয়ে থেমে যাওয়া', 'Stop with an error'], ['সাথে সাথে মুছে ফেলা', 'Delete it straight away'], ['নাম বদলে আবার লেখা', 'Rename it and write it back']], ['রেখে না দিলে পড়ে-বদলে-লেখায় নতুন data হারায়।', 'If not kept, read-modify-write loses new data.']),
      Q('l33-x7', 'fieldnum', ['Protobuf-এ field-এর নাম বদলানো নিরাপদ কেন?', 'Why is renaming a Protobuf field safe?'], [['Binary-তে নাম নয়, নম্বর যায়', 'The binary has numbers, not names'], ['নাম কখনোই বদলানো যায় না', 'Names can never be changed'], ['নামগুলো encrypt থাকে', 'The names are encrypted'], ['নিরাপদ না, সব ভাঙে', 'It is not safe; it all breaks']], ['নম্বর ঠিক থাকলে পুরনো-নতুন মেলে।', 'As long as the number stays, old and new match.']),
      Q('l33-x8', 'fieldnum', ['Protobuf-এ একটা field বাদ দিলে কী করবেন?', 'You remove a Protobuf field. What do you do?'], [['নম্বরটা reserved করা', 'Mark its number as reserved'], ['নম্বরটা নতুন field-কে দেওয়া', 'Give its number to a new field'], ['সব নম্বর এক ঘর সরানো', 'Shift every number down by one'], ['কিছুই না', 'Nothing at all']], ['ভুল করে কেউ আবার ব্যবহার না করুক।', 'So nobody reuses it by mistake.']),
      Q('l33-x9', 'fieldnum', ['JSON-এর তুলনায় Protobuf-এর লাভ?', 'Protobuf\'s advantage over JSON?'], [['ছোট আর schema-নির্ভর', 'Smaller, with a schema'], ['মানুষ সহজে পড়তে পারে', 'Easier for humans to read'], ['Schema লাগে না', 'No schema needed'], ['সব browser নিজে বোঝে', 'Every browser understands it natively']], ['Field নাম না পাঠিয়ে নম্বর আর type: অনেক ছোট।', 'Numbers and types instead of names: much smaller.']),
      Q('l33-x10', 'avro', ['Avro data-তে field নম্বর বা নাম কেন থাকে না?', 'Why does Avro data carry no field numbers or names?'], [['পড়তে লেখকের schema লাগে', 'Reading needs the writer\'s schema'], ['Avro-তে কোনো field নেই', 'Avro has no fields at all'], ['সব মান string হিসেবে থাকে', 'Every value is kept as a string'], ['Encryption-এর জন্য', 'It is done for encryption']], ['Schema দিয়েই ক্রম বোঝা যায়, তাই data সবচেয়ে ছোট।', 'The schema gives the order, so the data is tiny.']),
      Q('l33-x11', 'avro', ['লেখকের schema-তে আছে, পাঠকেরটায় নেই এমন field?', 'A field in the writer\'s schema but not the reader\'s?'], [['পাঠক উপেক্ষা করে', 'The reader ignores it'], ['পাঠক crash করে', 'The reader crashes'], ['Data মুছে যায়', 'The data is deleted'], ['লেখক আবার পাঠায়', 'The writer resends it']], ['আর পাঠকের আছে, লেখকের নেই হলে default।', 'And the reverse falls back to the default.']),
      Q('l33-x12', 'avro', ['Kafka-তে Avro হলে লেখকের schema কোথায় পাওয়া যায়?', 'With Avro on Kafka, where is the writer\'s schema found?'], [['Schema registry-তে, ID দিয়ে', 'In a schema registry, by ID'], ['প্রতিটা consumer আন্দাজ করে', 'Each consumer guesses it'], ['কোথাও না', 'Nowhere'], ['Producer-এর email-এ', 'In the producer\'s email']], ['প্রতিটা message-এ ছোট একটা schema ID।', 'Each message carries a small schema ID.']),
      Q('l33-x13', 'expand', ['Expand ধাপে কী করা হয়?', 'What happens in the expand step?'], [['নতুন কলাম যোগ, পুরনো রেখে', 'Add the new column, keep the old'], ['পুরনো কলাম মুছে ফেলা', 'Drop the old column at once'], ['App কিছুক্ষণ বন্ধ রাখা', 'Take the app down for a while'], ['সব data মুছে নতুন করে', 'Wipe all data and start over']], ['কোনো পুরনো code ভাঙে না।', 'No old code breaks.']),
      Q('l33-x14', 'expand', ['Contract কখন নিরাপদ?', 'When is contract safe?'], [['কেউ আর পুরনোটা পড়ে না', 'Once nothing reads the old column'], ['Expand-এর সাথে সাথেই', 'Straight after the expand step'], ['একদম প্রথম দিনেই', 'On the very first day'], ['কখনোই নিরাপদ না', 'It is never safe to do']], ['আগে মাপুন, তারপর মুছুন।', 'Measure first, then delete.']),
      Q('l33-x15', 'expand', ['Expand-contract-এর মূল লাভ?', 'The main benefit of expand-contract?'], [['প্রতি ধাপে ফেরার পথ', 'A way back at every step'], ['সবচেয়ে কম ধাপ লাগে', 'It needs the fewest steps'], ['Downtime লাগে বলে', 'Because it needs downtime'], ['কোনো লাভই নেই', 'There is no benefit']], ['ধীর, কিন্তু নিরাপদ।', 'Slower, but safe.']),
    ],
  },
  34: {
    concepts: [
      { id: 'linear', label: 'Linearizability' },
      { id: 'raft', label: tr('Raft-এ commit', 'Committing in Raft') },
      { id: 'cap', label: tr('Partition-এ বাছাই', 'Choosing in a partition') },
      { id: 'fencing', label: 'Fencing token' },
      { id: 'lamport', label: 'Lamport timestamp' },
    ],
    gens: [raftTolerance],
    items: [
      Q('l34-x1', 'linear', ['কোন কাজে linearizability সত্যিই লাগে?', 'Where is linearizability truly needed?'], [['Lock আর leader বাছাই', 'Locks and leader election'], ['Feed-এ like-এর সংখ্যা', 'Like counts in a feed'], ['পুরনো ছবি দেখানো', 'Showing old photos'], ['Analytics রিপোর্ট', 'Analytics reports']], ['দুজন যেন একসাথে মালিক না হয়।', 'Two must never both be the owner.']),
      Q('l34-x2', 'linear', ['Linearizability-র দাম কী?', 'What does linearizability cost?'], [['বেশি দেরি, partition-এ অচল', 'Latency, and downtime in splits'], ['কোনো দাম নেই, বিনামূল্যে', 'Nothing; it comes for free'], ['কিছু data হারায়', 'Some data gets lost'], ['Storage দ্বিগুণ লাগে', 'It needs double the storage']], ['প্রতিটা কাজে মিলিয়ে নিতে হয়।', 'Every operation must coordinate.']),
      Q('l34-x13', 'linear', ['একজন "Delivered" দেখল, তার পরে আরেকজন "পথে আছে"। Linearizable system-এ এটা সম্ভব?', 'One person saw "Delivered", then another saw "On the way". Possible if linearizable?'], [['না, নতুন দেখার পরে পুরনো আর না', 'No; once new is seen, old never returns'], ['হ্যাঁ, এটাই স্বাভাবিক', 'Yes, this is normal behaviour'], ['শুধু রাতের বেলায় সম্ভব', 'Only at night'], ['শুধু ছোট cluster-এ সম্ভব', 'Only in small clusters']], ['এই কথাটাই linearizability-র সংজ্ঞা।', 'That promise is what linearizability means.']),
      Q('l34-x3', 'raft', ['Raft-এ term কী?', 'What is a term in Raft?'], [['Leader-এর মেয়াদের নম্বর', 'A number for each leadership'], ['একটা encryption key', 'A shared encryption key'], ['একটা message-এর আকার', 'The size of a message'], ['একটা node-এর নাম', 'The name of a node']], ['নতুন নির্বাচনে term বাড়ে; পুরনো term-এর leader বাতিল।', 'Each election raises the term; old-term leaders are ignored.']),
      Q('l34-x4', 'raft', ['Follower leader-এর heartbeat না পেলে?', 'A follower stops hearing the leader\'s heartbeat?'], [['প্রার্থী হয়ে ভোট চায়', 'It runs for leader and asks for votes'], ['চিরকাল চুপচাপ অপেক্ষা করে', 'It waits quietly forever'], ['নিজের data মুছে ফেলে', 'It deletes all its own data'], ['Client-কে leader বানায়', 'It makes the client the leader']], ['এলোমেলো timeout যাতে সবাই একসাথে প্রার্থী না হয়।', 'Random timeouts stop everyone running at once.']),
      Q('l34-x5', 'cap', ['CAP-এ P মানে কী?', 'What does the P in CAP mean?'], [['Partition সহ্য করা', 'Partition tolerance'], ['Performance বা গতি', 'Performance and speed'], ['Persistence বা স্থায়িত্ব', 'Persistence on disk'], ['Privacy বা গোপনীয়তা', 'Privacy of the data']], ['Network ভাঙবেই; প্রশ্ন হলো তখন কী বাছবেন।', 'Networks will split; the question is what you choose then.']),
      Q('l34-x6', 'cap', ['Tracking page-এ partition হলে কী বাছা যায়?', 'In a partition, what can a tracking page choose?'], [['Availability: একটু পুরনো দেখানো চলে', 'Availability: slightly stale is fine'], ['Consistency: বন্ধ রাখা জরুরি', 'Consistency: it must go dark'], ['দুটোই একসাথে', 'Both at once'], ['কোনোটাই না', 'Neither']], ['ভুল টাকা না, শুধু কয়েক সেকেন্ড পুরনো অবস্থা।', 'Not money, just a few seconds of staleness.']),
      Q('l34-x7', 'cap', ['Wallet-এ partition হলে?', 'The wallet during a partition?'], [['Consistency: minority পাশ লেখা বন্ধ', 'Consistency: the minority stops writing'], ['Availability: সবাই লিখতে থাকে', 'Availability: everyone keeps writing'], ['দুটোই', 'Both'], ['কিছুই না', 'Nothing']], ['দুই পাশে আলাদা খরচ মানে দ্বিগুণ খরচ।', 'Spending on both sides means double spending.']),
      Q('l34-x8', 'fencing', ['Fencing token কে যাচাই করে?', 'Who checks the fencing token?'], [['যে storage-এ লেখা হয়', 'The storage being written to'], ['যে worker লেখে', 'The worker that writes'], ['Client-এর browser', 'The client\'s browser'], ['কেউ না', 'Nobody']], ['Storage সবচেয়ে বড় দেখা token মনে রাখে।', 'Storage remembers the highest token seen.']),
      Q('l34-x9', 'fencing', ['শুধু lock-এর মেয়াদে ভরসা কেন বিপজ্জনক?', 'Why is relying on a lock timeout alone risky?'], [['থেমে থাকা process মেয়াদ জানে না', 'A paused process misses its expiry'], ['মেয়াদ কখনো শেষই হয় না', 'Timeouts never really expire'], ['Lock অনেক বেশি ধীর', 'Locks are far too slow'], ['আসলে বিপজ্জনক না', 'It is not actually risky']], ['GC বা VM pause-এর পরে পুরনো মালিক লিখে ফেলে।', 'After a GC or VM pause, the old owner writes anyway.']),
      Q('l34-x10', 'fencing', ['Fencing token কেমন হতে হয়?', 'What must a fencing token be?'], [['প্রতি lock-এ বাড়তে থাকা সংখ্যা', 'A number that grows with each lock'], ['এলোমেলো একটা লম্বা string', 'A long random string'], ['Worker-এর নিজের নাম', 'The worker\'s own name'], ['সবসময় একই একটা সংখ্যা', 'Always the very same number']], ['বড় মানে নতুন: তুলনা করা যায়।', 'Bigger means newer, so they can be compared.']),
      Q('l34-x11', 'lamport', ['অন্যের বার্তায় বড় counter দেখলে node কী করে?', 'A node sees a bigger counter in a message. Then?'], [['নিজের counter সেখানে তোলে', 'It raises its own counter'], ['বার্তাটা ফেলে দেয়', 'It drops the message'], ['নিজেরটা শূন্য করে দেয়', 'It resets its counter to zero'], ['কিছুই করে না, চলতে থাকে', 'It does nothing and carries on']], ['তাই কারণের পরে ফল সবসময় বড় নম্বর পায়।', 'So an effect always gets a bigger number than its cause.']),
      Q('l34-x12', 'lamport', ['দুটো Lamport timestamp সমান হলে কে আগে?', 'Two Lamport timestamps are equal. Which is first?'], [['Node ID দিয়ে ভাঙা হয়', 'Broken by node ID'], ['এলোমেলোভাবে বাছা হয়', 'Picked at random'], ['বলা সম্ভবই না', 'It cannot be said'], ['দুটোই বাতিল হয়', 'Both are rejected']], ['(counter, node ID) জোড়া সবসময় আলাদা।', 'The (counter, node ID) pair is always unique.']),
      Q('l34-x14', 'lamport', ['Lamport timestamp কোন প্রশ্নের উত্তর দিতে পারে না?', 'Which question can Lamport timestamps not answer?'], [['এই মুহূর্তে username খালি কিনা', 'Whether a username is free right now'], ['কোন ঘটনা কোনটার কারণ হতে পারে', 'Which event could have caused another'], ['দুটো ঘটনার একটা মোট ক্রম', 'A total order for two events'], ['কোন node বার্তাটা পাঠাল', 'Which node sent the message']], ['না-দেখা কোনো node-এর লেখা ছোট নম্বরে থাকতে পারে; তার জন্য consensus লাগে।', 'An unseen node may hold a smaller number; that needs consensus.']),
    ],
  },
};
