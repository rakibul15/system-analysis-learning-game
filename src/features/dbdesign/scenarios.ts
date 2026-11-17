import { tr } from '@/shared/lib/i18n';
import type { BookRef } from '@/features/books/catalog';

/**
 * Database design practice. Each scenario is a ParcelGo data problem: put each field in
 * the right table, then make the key decisions (keys, indexes, constraints, types, store,
 * shard key). Every wrong choice carries what breaks in production, why, and the fix.
 * All text here is our own; the book references only point at chapters and pages.
 */
export interface DbOption { id: string; text: string; ok?: true; /** What goes wrong in production if you pick this. */ breaks?: string }
export interface Decision { id: string; ask: string; options: DbOption[]; why: string; ref?: BookRef }
export interface Field { id: string; name: string; desc: string; table: string; why: string }
export type ColTag = 'PK' | 'FK' | 'UQ' | 'IX' | 'PART' | 'SORT' | 'TTL';
export interface Column { name: string; type: string; tags?: ColTag[]; note?: string }
export interface Table { id: string; label: string; columns?: Column[] }
export interface DbScenario {
  id: string; level: number; title: string; brief: string; patterns: string[];
  tables: Table[]; fields: Field[]; decisions: Decision[];
  /** The model schema shown after checking. */
  model: Table[]; modelNote: string; refs: BookRef[];
}
export interface Answers { fields: Record<string, string>; decisions: Record<string, string> }
export interface DbFinding { kind: 'field' | 'decision'; id: string; title: string; where: string; why: string; fix: string; ref?: BookRef }

const D = (chapter: number, section: string, a: number, b: number): BookRef => ({ book: 'ddia2', chapter, section, pages: [a, b] });

const R = {
  normalize: D(3, 'Normalization, Denormalization, and Joins', 72, 74),
  manyToOne: D(3, 'Many-to-One and Many-to-Many Relationships', 75, 76),
  stars: D(3, 'Stars and Snowflakes: Schemas for Analytics', 77, 79),
  whichModel: D(3, 'When to Use Which Model', 80, 83),
  eventSourcing: D(3, 'Event Sourcing and CQRS', 101, 104),
  lsm: D(4, 'Log-Structured Storage', 118, 124),
  btreeLsm: D(4, 'Comparing B-Trees and LSM-Trees', 129, 131),
  secondary: D(4, 'Multicolumn and Secondary Indexes', 132, 133),
  inMemory: D(4, 'Keeping Everything in Memory', 133, 134),
  column: D(4, 'Column-Oriented Storage', 136, 141),
  cubes: D(4, 'Materialized Views and Data Cubes', 143, 144),
  multitenant: D(7, 'Sharding for Multitenancy', 254, 254),
  keyRange: D(7, 'Sharding by Key Range', 256, 257),
  hotspots: D(7, 'Skewed Workloads and Relieving Hot Spots', 263, 263),
  shardIndexes: D(7, 'Sharding and Secondary Indexes', 268, 270),
  acid: D(8, 'The Meaning of ACID', 279, 283),
  multiObject: D(8, 'Single-Object and Multi-Object Operations', 284, 287),
  lostUpdates: D(8, 'Preventing Lost Updates', 299, 302),
  cdc: D(12, 'Change Data Capture', 503, 507),
  constraints: D(13, 'Enforcing Constraints', 566, 570),
  privacy: D(14, 'Privacy and Tracking', 589, 596),
};

export const dbScenarios: DbScenario[] = [
  {
    id: 'orders', level: 8,
    title: tr('Order আর tracking', 'Orders and tracking'),
    brief: tr('Merchant order দেয়, customer tracking code দিয়ে parcel খোঁজে, প্রতিটা hub-এ scan হয়।', 'Merchants place orders, customers look parcels up by tracking code, and every hub scans them.'),
    patterns: [
      tr('Merchant dashboard: নিজের order, নতুনগুলো আগে, পাতায় পাতায় (সবচেয়ে বেশি চলে)', 'Merchant dashboard: their own orders, newest first, page by page (runs most often)'),
      tr('Customer: tracking code দিয়ে একটা parcel খোঁজা (public, খুব ঘন ঘন)', 'Customer: look up one parcel by tracking code (public, very frequent)'),
      tr('প্রতিটা parcel ৩–১০ বার scan হয় (pickup, hub, delivery)', 'Each parcel is scanned 3–10 times (pickup, hubs, delivery)'),
    ],
    tables: [{ id: 'merchants', label: 'merchants' }, { id: 'orders', label: 'orders' }, { id: 'tracking_events', label: 'tracking_events' }],
    fields: [
      { id: 'shop_name', name: 'shop_name', desc: tr('দোকানের নাম', 'The shop\'s name'), table: 'merchants', why: tr('প্রতিটা order-এ কপি করলে নাম বদলালে লাখো সারি বদলাতে হয়, আর কিছু পুরনো থেকে যায়।', 'Copied into every order, a rename means rewriting millions of rows, and some stay stale.') },
      { id: 'merchant_phone', name: 'merchant_phone', desc: tr('Merchant-এর ফোন', 'The merchant\'s phone'), table: 'merchants', why: tr('Merchant-এর তথ্য, order-এর না; এক জায়গায় থাকলে এক জায়গায় বদলায়।', 'It describes the merchant, not the order; kept once, it changes once.') },
      { id: 'tracking_code', name: 'tracking_code', desc: tr('Customer যে code দিয়ে খোঁজে', 'The code customers search by'), table: 'orders', why: tr('প্রতিটা parcel-এর একটাই code; order-এর সাথেই থাকে।', 'Each parcel has exactly one code; it belongs with the order.') },
      { id: 'cod_amount', name: 'cod_amount', desc: tr('Delivery-তে আদায়ের টাকা', 'Cash to collect on delivery'), table: 'orders', why: tr('প্রতি order-এ একটা অঙ্ক; scan-এর সাথে বদলায় না।', 'One amount per order; it does not change per scan.') },
      { id: 'scanned_at', name: 'scanned_at', desc: tr('কোনো hub-এ scan-এর সময়', 'When a hub scanned it'), table: 'tracking_events', why: tr('এক order-এর অনেক scan; order-এ রাখলে scan_1, scan_2... কলাম লাগবে, যা একসময় ফুরিয়ে যায়।', 'One order has many scans; inside orders you would need scan_1, scan_2... columns that run out.') },
      { id: 'hub_id', name: 'hub_id', desc: tr('কোন hub scan করল', 'Which hub scanned it'), table: 'tracking_events', why: tr('প্রতিটা scan আলাদা hub-এ হতে পারে; তাই scan-এর সারিতে।', 'Each scan may be at a different hub, so it lives on the scan row.') },
    ],
    decisions: [
      { id: 'pk', ask: tr('orders-এর primary key কী হবে?', 'What is the primary key of orders?'), why: tr('Primary key প্রতিটা সারিকে চিরকাল আলাদা করে চেনায়; বাস্তব জগতের কোনো মান (ফোন, সময়) তা পারে না।', 'A primary key must identify each row uniquely forever; real-world values such as phones or times cannot.'), ref: R.manyToOne,
        options: [
          { id: 'id', ok: true, text: tr('order_id: একটা আলাদা সংখ্যা (bigint/snowflake)', 'order_id: a separate number (bigint or snowflake)') },
          { id: 'phone', text: tr('Customer-এর ফোন নম্বর', 'The customer\'s phone number'), breaks: tr('একই customer দ্বিতীয় order দিলেই duplicate key error: order নেওয়াই যায় না।', 'The same customer\'s second order fails with a duplicate key error.') },
          { id: 'time', text: tr('created_at (order-এর সময়)', 'created_at (the order time)'), breaks: tr('ঈদের ভিড়ে একই millisecond-এ দুটো order এলে একটা হারায় বা ব্যর্থ হয়।', 'In an Eid rush, two orders in the same millisecond collide and one fails.') },
          { id: 'merchant', text: tr('merchant_id', 'merchant_id'), breaks: tr('একটা merchant-এর শুধু একটাই order রাখা যাবে।', 'Each merchant could only ever have one order.') },
        ] },
      { id: 'dash', ask: tr('Merchant dashboard-এর জন্য কোন index?', 'Which index serves the merchant dashboard?'), why: tr('Query যে ক্রমে filter আর sort করে, index সেই ক্রমে হলে DB সরাসরি সঠিক পাতায় যায়।', 'When an index matches how the query filters and sorts, the DB jumps straight to the right page.'), ref: R.secondary,
        options: [
          { id: 'composite', ok: true, text: tr('(merchant_id, created_at DESC) মিলিয়ে একটা index', 'One index on (merchant_id, created_at DESC)') },
          { id: 'created', text: tr('শুধু created_at-এ index', 'An index on created_at only'), breaks: tr('সব merchant-এর order সময় ধরে পড়ে তারপর ছাঁকে: বড় দিনে dashboard সেকেন্ডের পর সেকেন্ড আটকে থাকে।', 'It reads everyone\'s orders by time, then filters; on busy days the dashboard hangs for seconds.') },
          { id: 'merchantOnly', text: tr('শুধু merchant_id-এ index', 'An index on merchant_id only'), breaks: tr('ছোট merchant-এ চলে, কিন্তু ১০ লাখ order-এর merchant-এর প্রতিটা পাতায় সব সাজাতে হয়।', 'Fine for small merchants, but a merchant with a million orders sorts them all on every page.') },
          { id: 'none', text: tr('কোনো index না, table ছোট', 'No index; the table is small'), breaks: tr('Table বড় হতে থাকে; কয়েক মাসেই প্রতিটা dashboard খোলা পুরো table পড়ে।', 'The table keeps growing; within months every dashboard load scans it all.') },
        ] },
      { id: 'code', ask: tr('tracking_code-এ কী বসাবেন?', 'What do you put on tracking_code?'), why: tr('একই code দুটো parcel পেলে ভুল মানুষ ভুল parcel দেখে; নিয়মটা DB-কেই পাহারা দিতে দিন।', 'If two parcels share a code, people see the wrong parcel; let the database guard the rule.'), ref: R.constraints,
        options: [
          { id: 'unique', ok: true, text: tr('UNIQUE constraint (সাথে index)', 'A UNIQUE constraint (with its index)') },
          { id: 'indexApp', text: tr('সাধারণ index, আলাদা কিনা app দেখে', 'A plain index; the app checks uniqueness'), breaks: tr('দুটো server একসাথে "নেই" দেখে একই code লিখে ফেলে: race condition।', 'Two servers both see "not taken" and write the same code: a race.') },
          { id: 'noIndex', text: tr('কিছু না, খোঁজা কম হয়', 'Nothing; lookups are rare'), breaks: tr('আসলে এটাই সবচেয়ে ঘন public খোঁজা: প্রতিবার পুরো table পড়া।', 'It is actually the busiest public lookup: a full scan every time.') },
          { id: 'fk', text: tr('অন্য table-এর দিকে foreign key', 'A foreign key to another table'), breaks: tr('Foreign key আলাদা হওয়া নিশ্চিত করে না; duplicate ঢুকতেই থাকে।', 'A foreign key does not enforce uniqueness; duplicates still get in.') },
        ] },
      { id: 'events', ask: tr('Scan-গুলো কীভাবে রাখবেন?', 'How do you store the scans?'), why: tr('একের-বহু সম্পর্ক আলাদা table-এ: প্রতিটা নতুন scan একটা নতুন সারি, পুরনো কিছু বদলায় না।', 'A one-to-many relationship gets its own table: each scan is a new row, and nothing old is rewritten.'), ref: R.normalize,
        options: [
          { id: 'table', ok: true, text: tr('tracking_events table, প্রতি scan-এ একটা সারি', 'A tracking_events table, one row per scan') },
          { id: 'json', text: tr('orders-এ একটা JSON array, প্রতি scan-এ যোগ', 'A JSON array in orders, appended per scan'), breaks: tr('দুটো hub একসাথে scan করলে দুজনেই পুরো array পড়ে লেখে: একটা scan হারায় (lost update)।', 'Two hubs scanning at once both rewrite the whole array, and one scan is lost.') },
          { id: 'columns', text: tr('orders-এ scan_1 … scan_10 কলাম', 'Columns scan_1 … scan_10 in orders'), breaks: tr('১১তম scan-এর জায়গা নেই, আর বেশিরভাগ কলাম ফাঁকা থাকে।', 'An 11th scan has nowhere to go, and most columns sit empty.') },
          { id: 'overwrite', text: tr('orders-এ শুধু last_scan, প্রতিবার বদলানো', 'Only a last_scan column, overwritten each time'), breaks: tr('Customer জিজ্ঞেস করে "parcel কোথায় আটকে ছিল?": ইতিহাসই নেই।', 'A customer asks where the parcel was stuck, and the history is gone.') },
        ] },
      { id: 'money', ask: tr('cod_amount কোন type?', 'Which type for cod_amount?'), why: tr('টাকা ঠিক ঠিক মিলতে হয়; float দশমিক ভাঙা ঠিকমতো রাখতে পারে না।', 'Money must add up exactly; floats cannot store decimal fractions exactly.'), ref: R.acid,
        options: [
          { id: 'paisa', ok: true, text: tr('BIGINT, পয়সায় (বা DECIMAL)', 'BIGINT in paisa (or DECIMAL)') },
          { id: 'float', text: tr('FLOAT / DOUBLE', 'FLOAT or DOUBLE'), breaks: tr('০.১ + ০.২ = ০.৩০০০০০০০০০০০০০০০৪: মাস শেষে merchant-এর হিসাব কয়েক পয়সা মেলে না।', '0.1 + 0.2 = 0.30000000000000004: month-end merchant totals are off by paisa.') },
          { id: 'text', text: tr('VARCHAR, যেমন "৳১,২৫০.৫০"', 'VARCHAR, like "৳1,250.50"'), breaks: tr('যোগ করতে প্রতিবার parse লাগে; কেউ "1250.5" লিখলে sort আর যোগ দুটোই ভুল।', 'Every sum needs parsing; one "1250.5" breaks both sorting and totals.') },
          { id: 'int', text: tr('INT, শুধু টাকা (পয়সা বাদ)', 'INT whole taka, paisa dropped'), breaks: tr('Fee-র ২.৫% কাটলে পয়সা জমে জমে হারায়; ledger মেলে না।', 'A 2.5% fee leaves paisa that quietly vanish; the ledger stops balancing.') },
        ] },
    ],
    model: [
      { id: 'merchants', label: 'merchants', columns: [{ name: 'merchant_id', type: 'BIGINT', tags: ['PK'] }, { name: 'shop_name', type: 'TEXT' }, { name: 'merchant_phone', type: 'TEXT' }] },
      { id: 'orders', label: 'orders', columns: [{ name: 'order_id', type: 'BIGINT', tags: ['PK'] }, { name: 'merchant_id', type: 'BIGINT', tags: ['FK', 'IX'], note: tr('(merchant_id, created_at DESC)', 'index (merchant_id, created_at DESC)') }, { name: 'tracking_code', type: 'TEXT', tags: ['UQ'] }, { name: 'cod_amount', type: 'BIGINT', note: tr('পয়সায়', 'in paisa') }, { name: 'status', type: 'TEXT' }, { name: 'created_at', type: 'TIMESTAMPTZ' }] },
      { id: 'tracking_events', label: 'tracking_events', columns: [{ name: 'event_id', type: 'BIGINT', tags: ['PK'] }, { name: 'order_id', type: 'BIGINT', tags: ['FK', 'IX'], note: tr('(order_id, scanned_at)', 'index (order_id, scanned_at)') }, { name: 'hub_id', type: 'BIGINT', tags: ['FK'] }, { name: 'event_type', type: 'TEXT' }, { name: 'scanned_at', type: 'TIMESTAMPTZ' }] },
    ],
    modelNote: tr('Order-এর বর্তমান status orders-এ রাখা হয় দ্রুত দেখানোর জন্য; পুরো ইতিহাস tracking_events-এ।', 'The current status sits on orders for quick display; the full history lives in tracking_events.'),
    refs: [R.normalize, R.manyToOne, R.secondary, R.constraints],
  },
  {
    id: 'ledger', level: 26,
    title: tr('টাকার খাতা (ledger)', 'The money ledger'),
    brief: tr('COD আদায়, fee কাটা, merchant-কে payout: প্রতিটা টাকার নড়াচড়া লিখে রাখতে হবে, কখনো হারানো বা দুবার গোনা চলবে না।', 'Cash collected, fees taken, merchants paid: every movement of money is recorded, never lost and never counted twice.'),
    patterns: [
      tr('প্রতিটা লেনদেনে অন্তত দুটো entry (debit আর credit)', 'Every transaction writes at least two entries (a debit and a credit)'),
      tr('Merchant নিজের balance দেখে (ঘন ঘন)', 'Merchants check their balance (often)'),
      tr('Auditor পুরো ইতিহাস চায়; কিছু মোছা যাবে না', 'Auditors want the full history; nothing may be erased'),
      tr('Network retry-তে একই payment দুবার আসতে পারে', 'Network retries can deliver the same payment twice'),
    ],
    tables: [{ id: 'accounts', label: 'accounts' }, { id: 'ledger_entries', label: 'ledger_entries' }, { id: 'payments', label: 'payments' }],
    fields: [
      { id: 'holder', name: 'holder_name', desc: tr('হিসাব কার নামে', 'Who the account belongs to'), table: 'accounts', why: tr('হিসাবের পরিচয়, প্রতিটা entry-র না।', 'It identifies the account, not each entry.') },
      { id: 'currency', name: 'currency', desc: tr('হিসাবের মুদ্রা (BDT)', 'The account currency (BDT)'), table: 'accounts', why: tr('একটা হিসাব একটা মুদ্রায়; প্রতিটা entry-তে কপি করলে অমিলের সুযোগ।', 'An account has one currency; copying it into entries invites mismatches.') },
      { id: 'amount', name: 'amount_paisa', desc: tr('কত টাকা নড়ল', 'How much money moved'), table: 'ledger_entries', why: tr('প্রতিটা entry-র নিজের অঙ্ক।', 'Each entry carries its own amount.') },
      { id: 'direction', name: 'direction', desc: tr('Debit না credit', 'Debit or credit'), table: 'ledger_entries', why: tr('প্রতিটা entry এক দিকে; দুটো মিলে লেনদেন সমান হয়।', 'Each entry is one side; together they balance the transaction.') },
      { id: 'idem', name: 'idempotency_key', desc: tr('Client-এর পাঠানো অনন্য key', 'A unique key sent by the client'), table: 'payments', why: tr('একটা payment অনুরোধের পরিচয়; সেখানেই দ্বিতীয়বার আটকাতে হয়।', 'It identifies one payment request; that is where the repeat must be stopped.') },
      { id: 'psp', name: 'psp_reference', desc: tr('PSP-র দেওয়া reference', 'The PSP\'s reference'), table: 'payments', why: tr('Reconciliation-এ PSP-র file-এর সাথে মেলাতে payment-এর সারিতে লাগে।', 'Reconciliation matches it against the PSP\'s file, so it sits on the payment.') },
    ],
    decisions: [
      { id: 'type', ask: tr('amount_paisa কোন type?', 'Which type for amount_paisa?'), why: tr('পয়সা পর্যন্ত নির্ভুল যোগ চাই; পূর্ণসংখ্যা বা DECIMAL সেটা দেয়।', 'Totals must be exact to the paisa; integers or DECIMAL give that.'), ref: R.acid,
        options: [
          { id: 'bigint', ok: true, text: tr('BIGINT, পয়সায়', 'BIGINT, in paisa') },
          { id: 'double', text: 'DOUBLE', breaks: tr('লাখো entry যোগ করলে গোলমেলে ভগ্নাংশ জমে; trial balance শূন্য হয় না।', 'Summing millions of entries accumulates rounding error; the trial balance never hits zero.') },
          { id: 'varchar', text: 'VARCHAR', breaks: tr('যোগ করতে parse; একটা ভুল format পুরো রিপোর্ট ভাঙে।', 'Sums need parsing, and one bad format breaks the whole report.') },
          { id: 'int', text: tr('INT, টাকায় (৳)', 'INT, in whole taka'), breaks: tr('৳১০০-র ১.৫% fee = ৳১.৫০; পয়সা কোথায় যাবে?', 'A 1.5% fee on ৳100 is ৳1.50; where do the paisa go?') },
        ] },
      { id: 'fix', ask: tr('ভুল entry ধরা পড়লে কী করবেন?', 'A wrong entry is found. What do you do?'), why: tr('খাতা শুধু যোগ হয়: ইতিহাস কখনো বদলায় না, তাই audit আর reconciliation বিশ্বাসযোগ্য।', 'A ledger only grows: history never changes, so audits and reconciliation can trust it.'), ref: R.eventSourcing,
        options: [
          { id: 'reverse', ok: true, text: tr('উল্টো একটা নতুন entry যোগ', 'Append a new reversing entry') },
          { id: 'update', text: tr('UPDATE করে অঙ্ক ঠিক করা', 'UPDATE the amount in place'), breaks: tr('Auditor জিজ্ঞেস করে আগে কী ছিল: কোনো চিহ্ন নেই; PSP-র সাথে পুরনো দিনের হিসাবও আর মেলে না।', 'An auditor asks what it used to say, and there is no trace; past reconciliations stop matching.') },
          { id: 'delete', text: tr('ভুল সারিটা DELETE', 'DELETE the wrong row'), breaks: tr('অন্য দিকের entry একা থেকে যায়: debit আর credit আর মেলে না।', 'Its other half is left alone, so debits and credits no longer match.') },
          { id: 'comment', text: tr('অঙ্ক বদলে comment-এ কারণ লেখা', 'Change it and note why in a comment column'), breaks: tr('কারণ লেখা থাকলেও আগের মান হারিয়েছে; কে কখন বদলাল প্রমাণ নেই।', 'The reason is noted but the old value is gone, with no proof of who changed it.') },
        ] },
      { id: 'dupe', ask: tr('একই payment দুবার এলে আটকাবেন কীভাবে?', 'How do you stop the same payment twice?'), why: tr('আলাদা হওয়ার নিয়ম DB-র constraint-এ থাকলে সমান্তরাল request-ও তা ভাঙতে পারে না।', 'With uniqueness enforced by the database, even concurrent requests cannot break it.'), ref: R.constraints,
        options: [
          { id: 'unique', ok: true, text: tr('payments.idempotency_key-এ UNIQUE', 'UNIQUE on payments.idempotency_key') },
          { id: 'select', text: tr('আগে SELECT করে দেখে তারপর INSERT', 'SELECT first, then INSERT if absent'), breaks: tr('দুটো retry একসাথে এলে দুটোই "নেই" দেখে, দুটোই লেখে: customer দুবার কাটা।', 'Two retries arrive together, both see nothing, both insert: the customer pays twice.') },
          { id: 'psp', text: tr('PSP-ই সামলাবে, আমাদের কিছু না', 'Leave it to the PSP'), breaks: tr('আমাদের খাতায় দুটো সারি; PSP একবার কাটলেও merchant দুবার credit পায়।', 'Our ledger gets two rows; even if the PSP charged once, the merchant is credited twice.') },
          { id: 'button', text: tr('App-এ button একবার চাপার পর বন্ধ', 'Disable the button after one tap'), breaks: tr('Network retry button চাপা ছাড়াই আবার পাঠায়।', 'Network retries resend without anyone tapping.') },
        ] },
      { id: 'balance', ask: tr('Merchant-এর balance কীভাবে রাখবেন?', 'How do you keep a merchant\'s balance?'), why: tr('Entry-গুলোই সত্য; balance তা থেকে আসে, আর একই transaction-এ হালনাগাদ হলে কখনো পিছিয়ে বা এগিয়ে থাকে না।', 'Entries are the truth; the balance derives from them and, updated in the same transaction, never drifts.'), ref: R.lostUpdates,
        options: [
          { id: 'derived', ok: true, text: tr('Entry থেকে; একই transaction-এ balance সারি হালনাগাদ', 'From entries; a balance row updated in the same transaction') },
          { id: 'rmw', text: tr('App balance পড়ে, যোগ করে, লেখে', 'The app reads the balance, adds, writes back'), breaks: tr('দুটো COD একসাথে: দুজনেই ৳৫০০ পড়ে, একজন ৳৭০০ আরেকজন ৳৬০০ লেখে; ৳১০০ উধাও (lost update)।', 'Two COD credits at once both read ৳500 and write ৳700 and ৳600; ৳100 vanishes.') },
          { id: 'sum', text: tr('প্রতি request-এ সব entry যোগ', 'Sum every entry on each request'), breaks: tr('দুই বছরের লাখো entry প্রতিবার যোগ: dashboard ধীর হতেই থাকে।', 'Summing two years of entries every time: the dashboard keeps getting slower.') },
          { id: 'client', text: tr('Merchant app নিজে হিসাব রাখে', 'The merchant app keeps its own total'), breaks: tr('অন্য phone-এ বা reinstall-এ ভিন্ন সংখ্যা; সত্য কোনটা কেউ জানে না।', 'Another phone or a reinstall shows a different number; nobody knows which is true.') },
        ] },
      { id: 'txn', ask: tr('Debit আর credit entry কীভাবে লিখবেন?', 'How do you write the debit and credit entries?'), why: tr('Atomicity: হয় দুটোই থাকে, নয় কোনোটাই না; মাঝপথে crash খাতা ভাঙতে পারে না।', 'Atomicity: both exist or neither does; a crash halfway cannot break the books.'), ref: R.multiObject,
        options: [
          { id: 'one', ok: true, text: tr('একটা DB transaction-এ দুটোই', 'Both in one DB transaction') },
          { id: 'two', text: tr('আলাদা দুটো লেখা, দ্বিতীয়টা ব্যর্থ হলে retry', 'Two separate writes, retrying the second'), breaks: tr('প্রথম লেখার পরে server crash: টাকা কাটা হলো কিন্তু কোথাও জমা হলো না।', 'The server crashes after the first write: money left one account and reached none.') },
          { id: 'nightly', text: tr('এখন debit, রাতের job-এ credit', 'Debit now, credit in a nightly job'), breaks: tr('সারাদিন খাতা অসমান; job ব্যর্থ হলে টাকা হারায়।', 'The books are unbalanced all day, and a failed job loses money.') },
          { id: 'none', text: tr('Transaction ছাড়াই, দ্রুত হয়', 'No transaction; it is faster'), breaks: tr('অর্ধেক লেনদেন দেখা যায়, crash-এ অর্ধেক থেকে যায়।', 'Half-done transactions are visible, and crashes leave them half done.') },
        ] },
    ],
    model: [
      { id: 'accounts', label: 'accounts', columns: [{ name: 'account_id', type: 'BIGINT', tags: ['PK'] }, { name: 'holder_name', type: 'TEXT' }, { name: 'currency', type: 'CHAR(3)' }, { name: 'balance_paisa', type: 'BIGINT', note: tr('entry-র সাথে একই transaction-এ', 'updated with entries, same transaction') }] },
      { id: 'payments', label: 'payments', columns: [{ name: 'payment_id', type: 'BIGINT', tags: ['PK'] }, { name: 'idempotency_key', type: 'TEXT', tags: ['UQ'] }, { name: 'psp_reference', type: 'TEXT', tags: ['IX'] }, { name: 'status', type: 'TEXT' }, { name: 'created_at', type: 'TIMESTAMPTZ' }] },
      { id: 'ledger_entries', label: 'ledger_entries', columns: [{ name: 'entry_id', type: 'BIGINT', tags: ['PK'] }, { name: 'payment_id', type: 'BIGINT', tags: ['FK'] }, { name: 'account_id', type: 'BIGINT', tags: ['FK', 'IX'], note: tr('(account_id, created_at)', 'index (account_id, created_at)') }, { name: 'direction', type: 'TEXT', note: 'debit | credit' }, { name: 'amount_paisa', type: 'BIGINT', note: '> 0' }, { name: 'created_at', type: 'TIMESTAMPTZ' }] },
    ],
    modelNote: tr('ledger_entries-এ UPDATE আর DELETE-এর অনুমতিই দেবেন না; সংশোধন মানে নতুন entry।', 'Grant no UPDATE or DELETE on ledger_entries; a correction is always a new entry.'),
    refs: [R.acid, R.multiObject, R.lostUpdates, R.constraints, R.eventSourcing],
  },
  {
    id: 'locations', level: 17,
    title: tr('Rider-এর পথের ইতিহাস', 'Rider location history'),
    brief: tr('৫০,০০০ rider প্রতি ৫ সেকেন্ডে অবস্থান পাঠায়। অভিযোগ এলে এক rider-এর এক দিনের পথ দেখতে হয়। ৯০ দিন রাখা হয়।', '50,000 riders send their position every 5 s. For a complaint, you replay one rider\'s route for one day. Data is kept 90 days.'),
    patterns: [
      tr('লেখা: সেকেন্ডে ~১০,০০০, থামে না', 'Writes: ~10,000 a second, nonstop'),
      tr('পড়া: কদাচিৎ, "rider X, তারিখ Y-এর পুরো পথ"', 'Reads: rare, "rider X\'s whole route on day Y"'),
      tr('Dispatch-এর জন্য প্রতিটা rider-এর এখনকার অবস্থান', 'Dispatch needs each rider\'s current position'),
      tr('৯০ দিন পরে মুছে ফেলতে হবে (গোপনীয়তা)', 'Must be deleted after 90 days (privacy)'),
    ],
    tables: [{ id: 'riders', label: 'riders' }, { id: 'rider_locations', label: 'rider_locations' }],
    fields: [
      { id: 'name', name: 'rider_name', desc: tr('Rider-এর নাম', 'The rider\'s name'), table: 'riders', why: tr('প্রতি ৫ সেকেন্ডের সারিতে নাম কপি করলে বিলিয়ন সারিতে একই নাম: অপচয়।', 'Copying the name into every 5-second row repeats it billions of times.') },
      { id: 'vehicle', name: 'vehicle_type', desc: tr('Bike না cycle', 'Bike or bicycle'), table: 'riders', why: tr('Rider-এর তথ্য, প্রতিটা অবস্থানের না।', 'It describes the rider, not each position.') },
      { id: 'latlng', name: 'lat, lng', desc: tr('অবস্থান', 'The position'), table: 'rider_locations', why: tr('প্রতি ৫ সেকেন্ডে নতুন মান: প্রতিটা একটা নতুন সারি।', 'A new value every 5 seconds: each is a new row.') },
      { id: 'recorded', name: 'recorded_at', desc: tr('কখন মাপা হলো', 'When it was measured'), table: 'rider_locations', why: tr('পথ সাজাতে প্রতিটা অবস্থানের সময় লাগে।', 'Ordering the route needs each position\'s time.') },
    ],
    decisions: [
      { id: 'store', ask: tr('ইতিহাস কোন ধরনের store-এ?', 'Which kind of store holds the history?'), why: tr('অবিরাম লেখা, কম পড়া: LSM-ভিত্তিক wide-column store ক্রমিক লেখায় সস্তা আর সহজে ছড়ায়।', 'Endless writes, few reads: an LSM-based wide-column store makes sequential writes cheap and scales out easily.'), ref: R.btreeLsm,
        options: [
          { id: 'widecol', ok: true, text: tr('Wide-column / LSM store (Cassandra-ধাঁচের)', 'A wide-column LSM store (Cassandra-like)') },
          { id: 'rdbmsIdx', text: tr('এক relational table, প্রতিটা কলামে index', 'One relational table with an index on every column'), breaks: tr('প্রতিটা লেখায় ৫টা B-tree হালনাগাদ: সেকেন্ডে ১০,০০০ লেখায় disk আর lock-এ আটকে যায়।', 'Each write updates five B-trees; at 10,000 a second the disk and locks choke.') },
          { id: 'doc', text: tr('প্রতি rider-এর একটা document, পথ যোগ হতে থাকে', 'One document per rider, the route appended forever'), breaks: tr('Document প্রতিদিন বড় হয়; প্রতিটা যোগে পুরোটা আবার লেখা, শেষে আকারের সীমা ছাড়ায়।', 'The document grows daily, each append rewrites it, and it hits the size limit.') },
          { id: 'redis', text: tr('শুধু Redis-এ', 'Redis only'), breaks: tr('৯০ দিনের data memory-তে রাখতে বিশাল খরচ; restart-এ হারানোর ঝুঁকি।', 'Keeping 90 days in memory costs a fortune and risks loss on restart.') },
        ] },
      { id: 'part', ask: tr('Partition key কী?', 'What is the partition key?'), why: tr('এক partition-এ যা একসাথে পড়া হয়: এক rider-এর এক দিন। লেখা সব rider-এ ছড়ায়, partition-ও সীমিত আকারের থাকে।', 'Partition by what is read together: one rider\'s day. Writes spread across riders and partitions stay bounded.'), ref: R.hotspots,
        options: [
          { id: 'riderDay', ok: true, text: '(rider_id, day)' },
          { id: 'time', text: tr('শুধু recorded_at', 'recorded_at alone'), breaks: tr('এই মুহূর্তের সব লেখা একটা partition-এ: সেই node গরম, বাকিরা বসে।', 'Every write right now lands in one partition: that node burns while the rest idle.') },
          { id: 'rider', text: tr('শুধু rider_id', 'rider_id alone'), breaks: tr('৯০ দিনে এক rider-এর ~১৫ লাখ সারি এক partition-এ: বড় হয়ে ধীর আর ভারসাম্যহীন।', 'Ninety days puts ~1.5 million rows in one partition: huge, slow and unbalanced.') },
          { id: 'uuid', text: tr('এলোমেলো UUID', 'A random UUID'), breaks: tr('এক rider-এর এক দিন খুঁজতে সব partition ঘাঁটতে হয়।', 'Finding one rider\'s day means searching every partition.') },
        ] },
      { id: 'sort', ask: tr('Partition-এর ভেতরে কী দিয়ে সাজাবেন?', 'What sorts rows inside a partition?'), why: tr('সময় অনুযায়ী সাজানো থাকলে পুরো পথ একটা ক্রমিক পড়ায় আসে।', 'Sorted by time, the whole route comes back in one sequential read.'), ref: R.keyRange,
        options: [
          { id: 'time', ok: true, text: tr('recorded_at (clustering key)', 'recorded_at (the clustering key)') },
          { id: 'lat', text: tr('lat', 'lat'), breaks: tr('পথ উত্তর-দক্ষিণে সাজানো আসে, সময়ে না: প্রতিবার আবার sort।', 'The route comes back sorted north to south, not by time: you re-sort every read.') },
          { id: 'none', text: tr('কিছু না, যেমন আসে', 'Nothing; arrival order'), breaks: tr('দেরিতে আসা update ক্রম ভাঙে; পথ এলোমেলো দেখায়।', 'Late updates break the order and the route looks scrambled.') },
          { id: 'speed', text: tr('গতি (speed)', 'speed'), breaks: tr('দ্রুততম থেকে ধীর: পথ হিসেবে অর্থহীন।', 'Fastest to slowest is meaningless as a route.') },
        ] },
      { id: 'expire', ask: tr('৯০ দিন পরে মুছবেন কীভাবে?', 'How do you delete after 90 days?'), why: tr('সময়ভিত্তিক মেয়াদ (TTL, time-window compaction) পুরো পুরনো ফাইল একবারে ফেলে; সারি ধরে মোছা অনেক ভারী।', 'Time-based expiry (TTL with time-window compaction) drops whole old files at once; row-by-row deletes are heavy.'), ref: R.privacy,
        options: [
          { id: 'ttl', ok: true, text: tr('লেখার সময়ই ৯০ দিনের TTL', 'A 90-day TTL set at write time') },
          { id: 'cron', text: tr('প্রতি রাতে DELETE … WHERE recorded_at < …', 'A nightly DELETE … WHERE recorded_at < …'), breaks: tr('প্রতি রাতে কোটি সারি মোছা: tombstone জমে, পড়া ধীর, cluster হাঁপায়।', 'Deleting tens of millions of rows nightly piles up tombstones and slows the cluster.') },
          { id: 'never', text: tr('কখনো না, পরে লাগতে পারে', 'Never; it might be useful later'), breaks: tr('গোপনীয়তার প্রতিশ্রুতি ভাঙে, আর storage খরচ বাড়তেই থাকে।', 'It breaks the privacy promise, and storage keeps growing.') },
          { id: 'rider', text: tr('Rider চলে গেলে তবেই মোছা', 'Delete only when a rider leaves'), breaks: tr('বছরের পর বছর কাজ করা rider-এর পুরো ইতিহাস থেকে যায়।', 'Long-serving riders keep years of history.') },
        ] },
      { id: 'current', ask: tr('Dispatch-এর জন্য "এখন কোথায়" কীভাবে দেবেন?', 'How does dispatch get "where is each rider now"?'), why: tr('বর্তমান অবস্থান আর ইতিহাস আলাদা কাজ: একটা ঘন ঘন পড়া-বদলানো, আরেকটা শুধু যোগ।', 'Current position and history are different jobs: one is read and overwritten constantly, the other only appends.'), ref: R.inMemory,
        options: [
          { id: 'redis', ok: true, text: tr('আলাদা in-memory store (যেমন Redis GEO)', 'A separate in-memory store such as Redis GEO') },
          { id: 'latest', text: tr('ইতিহাস table থেকে সর্বশেষ সারি', 'The latest row from the history table'), breaks: tr('প্রতিটা dispatch-এ ৫০,০০০ partition-এ পড়া: write-heavy store-এ পড়ার ঝড়।', 'Every dispatch reads 50,000 partitions: a read storm on a write-heavy store.') },
          { id: 'update', text: tr('মূল DB-তে riders.lat/lng প্রতি ৫ সেকেন্ডে UPDATE', 'UPDATE riders.lat/lng in the main DB every 5 s'), breaks: tr('Order DB-তে সেকেন্ডে ১০,০০০ UPDATE: lock আর WAL-এ order নেওয়া ধীর হয়ে যায়।', '10,000 updates a second on the order DB slows order taking through locks and log writes.') },
          { id: 'client', text: tr('প্রতিবার rider-এর phone-কে জিজ্ঞেস', 'Ask each rider\'s phone every time'), breaks: tr('Phone ঘুমিয়ে বা network নেই: dispatch উত্তরের অপেক্ষায় আটকে থাকে।', 'Phones sleep or lose signal, and dispatch waits on them.') },
        ] },
    ],
    model: [
      { id: 'riders', label: 'riders', columns: [{ name: 'rider_id', type: 'BIGINT', tags: ['PK'] }, { name: 'rider_name', type: 'TEXT' }, { name: 'vehicle_type', type: 'TEXT' }] },
      { id: 'rider_locations', label: 'rider_locations', columns: [{ name: 'rider_id', type: 'BIGINT', tags: ['PART'] }, { name: 'day', type: 'DATE', tags: ['PART'] }, { name: 'recorded_at', type: 'TIMESTAMP', tags: ['SORT'] }, { name: 'lat', type: 'DOUBLE' }, { name: 'lng', type: 'DOUBLE' }, { name: '—', type: 'TTL 90d', tags: ['TTL'] }] },
      { id: 'current', label: 'rider:now (Redis GEO)', columns: [{ name: 'rider_id', type: 'member' }, { name: 'lat, lng', type: 'geo' }] },
    ],
    modelNote: tr('অবস্থানের জন্য DOUBLE ঠিক আছে: এখানে কয়েক সেন্টিমিটার এদিক-ওদিক সমস্যা না, টাকার মতো নয়।', 'DOUBLE is fine for positions: being off by centimetres does not matter here, unlike money.'),
    refs: [R.lsm, R.btreeLsm, R.keyRange, R.hotspots, R.privacy],
  },
  {
    id: 'analytics', level: 21,
    title: tr('Merchant analytics', 'Merchant analytics'),
    brief: tr('Merchant-রা দেখতে চায়: দিনে কত delivery, কোন এলাকায়, কত COD। লাখো সারির ওপর মাসিক রিপোর্টও লাগে।', 'Merchants want to see deliveries per day, by area, and COD totals. Monthly reports scan millions of rows.'),
    patterns: [
      tr('রিপোর্ট লাখো সারি পড়ে, কিন্তু অল্প কয়েকটা কলাম', 'Reports read millions of rows but only a few columns'),
      tr('Dashboard দিনে হাজারবার খোলে; ২ সেকেন্ডের মধ্যে চাই', 'Dashboards open thousands of times a day; under 2 s please'),
      tr('প্রতিটা merchant শুধু নিজের data দেখবে', 'Each merchant sees only their own data'),
      tr('Order নেওয়ার live DB ধীর হওয়া চলবে না', 'The live order DB must not slow down'),
    ],
    tables: [{ id: 'fact', label: 'fact_deliveries' }, { id: 'dim_merchant', label: 'dim_merchant' }, { id: 'dim_area', label: 'dim_area' }, { id: 'daily', label: 'daily_rollup' }],
    fields: [
      { id: 'area', name: 'area_name', desc: tr('এলাকার নাম (মিরপুর, উত্তরা...)', 'Area name (Mirpur, Uttara…)'), table: 'dim_area', why: tr('Dimension-এ একবার; fact সারিতে শুধু area_id।', 'Once in the dimension; fact rows carry only area_id.') },
      { id: 'category', name: 'merchant_category', desc: tr('Merchant-এর ধরন (fashion, food...)', 'Merchant type (fashion, food…)'), table: 'dim_merchant', why: tr('Merchant-এর বৈশিষ্ট্য; group by করতে dimension থেকে আসে।', 'A merchant attribute; group-bys pull it from the dimension.') },
      { id: 'cod', name: 'cod_paisa', desc: tr('প্রতিটা delivery-র COD', 'COD for each delivery'), table: 'fact', why: tr('প্রতিটা ঘটনার মাপ: fact table-এর কাজ।', 'A measure of each event: what a fact table holds.') },
      { id: 'delivered', name: 'delivered_at', desc: tr('কখন পৌঁছাল', 'When it was delivered'), table: 'fact', why: tr('প্রতিটা delivery-র নিজের সময়।', 'Each delivery has its own time.') },
      { id: 'count', name: 'deliveries_count', desc: tr('দিনে মোট delivery', 'Total deliveries in a day'), table: 'daily', why: tr('আগে থেকে গোনা সংখ্যা; dashboard সরাসরি পড়ে।', 'A pre-computed count that dashboards read directly.') },
    ],
    decisions: [
      { id: 'where', ask: tr('রিপোর্টের query কোথায় চলবে?', 'Where do report queries run?'), why: tr('OLTP আর analytics-এর চাপ আলাদা; বড় scan live order-কে ধীর করে। CDC দিয়ে আলাদা warehouse-এ নিন।', 'OLTP and analytics loads differ; big scans slow live orders. Feed a separate warehouse with CDC.'), ref: R.cdc,
        options: [
          { id: 'warehouse', ok: true, text: tr('আলাদা warehouse, CDC/ETL দিয়ে ভরা', 'A separate warehouse fed by CDC or ETL') },
          { id: 'prod', text: tr('সরাসরি live order DB-তে', 'Straight on the live order DB'), breaks: tr('মাসের শুরুতে সবাই রিপোর্ট খোলে: বড় scan-এ order নেওয়ার API ধীর, timeout।', 'Everyone opens reports on the 1st; big scans slow the order API into timeouts.') },
          { id: 'replica', text: tr('Live DB-র read replica-তে, সব রিপোর্ট', 'Every report on a read replica of the live DB'), breaks: tr('Row-store-এ লাখো সারি scan তবু ধীর; replica lag বাড়ে, failover-এর replica-ও ব্যস্ত।', 'Scanning millions of rows in a row store is still slow; replica lag grows and the failover replica is busy.') },
          { id: 'browser', text: tr('Browser-এ সব order নামিয়ে হিসাব', 'Download all orders to the browser and compute'), breaks: tr('লাখো সারি নামাতে মিনিট লাগে, phone-এ ভেঙে পড়ে; অন্যের data ফাঁসের ঝুঁকি।', 'Downloading millions of rows takes minutes, crashes phones, and risks leaking data.') },
        ] },
      { id: 'format', ask: tr('Warehouse-এ data কোন ধাঁচে রাখবেন?', 'How is data laid out in the warehouse?'), why: tr('Column-oriented storage শুধু দরকারি কলাম পড়ে আর একই ধরনের মান খুব ভালো compress করে।', 'Column-oriented storage reads only the columns needed and compresses similar values very well.'), ref: R.column,
        options: [
          { id: 'columnar', ok: true, text: tr('Column-oriented (কলাম ধরে রাখা)', 'Column-oriented storage') },
          { id: 'rowIdx', text: tr('Row-oriented, প্রতিটা কলামে index', 'Row-oriented with an index on every column'), breaks: tr('৪০ কলামের সারি পুরো পড়তে হয়, দরকার ৩টা: disk-এর ১৩ গুণ বেশি কাজ।', 'Every 40-column row is read in full to use 3 columns: about 13 times the disk work.') },
          { id: 'kv', text: tr('Key-value store', 'A key-value store'), breaks: tr('Key দিয়ে খোঁজায় দারুণ, কিন্তু "এলাকা ধরে মাসের যোগ" করতে সব key ঘাঁটতে হয়।', 'Great for lookups by key, but "monthly totals by area" means walking every key.') },
          { id: 'json', text: tr('দিনে একটা বড় JSON file', 'One big JSON file per day'), breaks: tr('প্রতিটা query-তে পুরো file parse; কলাম বাছাই বা compress-এর সুবিধা নেই।', 'Every query parses whole files, with no column pruning or compression.') },
        ] },
      { id: 'schema', ask: tr('Warehouse-এর schema কেমন?', 'What shape is the warehouse schema?'), why: tr('Star schema: মাঝে ঘটনার fact table, চারপাশে বর্ণনার dimension; join কম, query সহজ।', 'A star schema: a fact table of events surrounded by descriptive dimensions; few joins, simple queries.'), ref: R.stars,
        options: [
          { id: 'star', ok: true, text: tr('Star: fact_deliveries + merchant/area dimension', 'Star: fact_deliveries plus merchant and area dimensions') },
          { id: 'copy', text: tr('Live DB-র ১৫টা normalized table হুবহু কপি', 'Copy the live DB\'s 15 normalized tables as they are'), breaks: tr('প্রতিটা রিপোর্টে ৮–১০টা join; analyst-রা ভুল join লিখে ভুল সংখ্যা পায়।', 'Every report needs 8–10 joins, and analysts write wrong joins and get wrong numbers.') },
          { id: 'logs', text: tr('শুধু কাঁচা JSON log', 'Raw JSON logs only'), breaks: tr('প্রতিটা query-তে format বুঝে parse; একই প্রশ্নের দুই রকম উত্তর।', 'Each query re-parses formats, and the same question gets two answers.') },
          { id: 'sheet', text: tr('প্রতি merchant-এর আলাদা spreadsheet', 'One spreadsheet per merchant'), breaks: tr('১০,০০০ merchant মানে ১০,০০০ file; সব মিলিয়ে কোনো রিপোর্ট করা যায় না।', '10,000 merchants means 10,000 files and no report across them.') },
        ] },
      { id: 'speed', ask: tr('Dashboard ২ সেকেন্ডে কীভাবে?', 'How does the dashboard load in under 2 s?'), why: tr('বারবার একই যোগ না করে আগে থেকে দিন-ভিত্তিক rollup (materialized view) রাখুন।', 'Rather than redoing the same sums, keep a daily rollup (a materialized view) ready.'), ref: R.cubes,
        options: [
          { id: 'rollup', ok: true, text: tr('দিন-ভিত্তিক rollup আগে থেকে হিসাব করা', 'Pre-computed daily rollups') },
          { id: 'raw', text: tr('প্রতিবার কাঁচা সারি থেকে যোগ', 'Sum raw rows on every page view'), breaks: tr('হাজার merchant একসাথে খুললে warehouse একই হিসাব হাজারবার করে।', 'A thousand merchants opening at once makes the warehouse redo the same sums a thousand times.') },
          { id: 'html', text: tr('পুরো পাতা চিরকাল cache', 'Cache the whole page forever'), breaks: tr('আজকের delivery কখনো দেখায় না; সংখ্যা পুরনো থেকে যায়।', 'Today\'s deliveries never appear; the numbers go stale.') },
          { id: 'sample', text: tr('১% এলোমেলো নমুনা থেকে আন্দাজ', 'Estimate from a 1% random sample'), breaks: tr('COD-এর মোট টাকা আন্দাজ চলে না; merchant-এর হিসাব মেলে না।', 'COD totals cannot be estimates; merchants\' books will not match.') },
        ] },
      { id: 'tenant', ask: tr('প্রতিটা merchant শুধু নিজের data দেখবে কীভাবে?', 'How does each merchant see only their own data?'), why: tr('Tenant-এর filter query-র স্তরে বাধ্যতামূলক (row-level security), UI-র ভরসায় না।', 'The tenant filter is enforced in the query layer (row-level security), not left to the UI.'), ref: R.multitenant,
        options: [
          { id: 'rls', ok: true, text: tr('প্রতিটা query-তে merchant_id filter, query স্তরে বাধ্যতামূলক', 'A merchant_id filter enforced on every query') },
          { id: 'ui', text: tr('UI অন্যের data লুকিয়ে রাখে', 'The UI hides other merchants\' data'), breaks: tr('কেউ API URL-এ merchant_id বদলালেই প্রতিযোগীর বিক্রি দেখে ফেলে।', 'Anyone who edits merchant_id in the API URL sees a competitor\'s sales.') },
          { id: 'perTenant', text: tr('প্রতি merchant-এর আলাদা warehouse', 'A separate warehouse per merchant'), breaks: tr('১০,০০০ warehouse চালানো আর হালনাগাদ রাখা: খরচ আর ঝামেলা অসম্ভব।', 'Running and updating 10,000 warehouses is impossibly costly.') },
          { id: 'trust', text: tr('কোনো filter না, merchant-রা সৎ', 'No filter; merchants are honest'), breaks: tr('একটা ভুল link-এই সবার data সবার সামনে।', 'One wrong link exposes everyone\'s data to everyone.') },
        ] },
    ],
    model: [
      { id: 'fact', label: 'fact_deliveries', columns: [{ name: 'delivery_id', type: 'BIGINT' }, { name: 'merchant_id', type: 'BIGINT', tags: ['FK'] }, { name: 'area_id', type: 'INT', tags: ['FK'] }, { name: 'delivered_at', type: 'TIMESTAMP', tags: ['SORT'] }, { name: 'cod_paisa', type: 'BIGINT' }, { name: 'fee_paisa', type: 'BIGINT' }] },
      { id: 'dim_merchant', label: 'dim_merchant', columns: [{ name: 'merchant_id', type: 'BIGINT', tags: ['PK'] }, { name: 'shop_name', type: 'TEXT' }, { name: 'merchant_category', type: 'TEXT' }] },
      { id: 'dim_area', label: 'dim_area', columns: [{ name: 'area_id', type: 'INT', tags: ['PK'] }, { name: 'area_name', type: 'TEXT' }, { name: 'city', type: 'TEXT' }] },
      { id: 'daily', label: 'daily_rollup', columns: [{ name: 'merchant_id', type: 'BIGINT', tags: ['PART'] }, { name: 'day', type: 'DATE', tags: ['SORT'] }, { name: 'area_id', type: 'INT' }, { name: 'deliveries_count', type: 'INT' }, { name: 'cod_paisa', type: 'BIGINT' }] },
    ],
    modelNote: tr('Live DB থেকে CDC দিয়ে fact table ভরে; প্রতি রাতে (বা প্রতি ঘণ্টায়) rollup হালনাগাদ হয়।', 'CDC from the live DB fills the fact table; the rollup refreshes nightly or hourly.'),
    refs: [R.cdc, R.column, R.stars, R.cubes, R.multitenant],
  },
];

/** Grade a design: every misplaced field and every wrong or missing decision becomes a finding. */
export function grade(s: DbScenario, a: Answers) {
  const findings: DbFinding[] = [];
  const tableLabel = (id: string) => s.tables.find((t) => t.id === id)?.label ?? id;
  for (const f of s.fields) {
    const got = a.fields[f.id];
    if (got === f.table) continue;
    findings.push({
      kind: 'field', id: f.id, title: f.name,
      where: got ? tr(`${f.name} রেখেছেন ${tableLabel(got)}-এ।`, `You put ${f.name} in ${tableLabel(got)}.`) : tr(`${f.name} কোনো table-এ রাখেননি।`, `You did not place ${f.name}.`),
      why: f.why, fix: tr(`${tableLabel(f.table)}-এ সরান।`, `Move it to ${tableLabel(f.table)}.`),
    });
  }
  for (const d of s.decisions) {
    const right = d.options.find((o) => o.ok)!;
    const got = d.options.find((o) => o.id === a.decisions[d.id]);
    if (got?.ok) continue;
    findings.push({
      kind: 'decision', id: d.id, title: d.ask,
      where: got ? `${got.text}: ${got.breaks ?? ''}` : tr('এই সিদ্ধান্তটা নেননি।', 'You did not make this decision.'),
      why: d.why, fix: right.text, ref: d.ref,
    });
  }
  const total = s.fields.length + s.decisions.length;
  const right = total - findings.length;
  return { total, right, findings, verdict: right === total ? 'right' as const : right >= total - 2 ? 'close' as const : 'wrong' as const };
}

/** The answers a perfect design gives, for "fix it for me". */
export function rightAnswer(s: DbScenario, kind: 'field' | 'decision', id: string): string {
  return kind === 'field' ? s.fields.find((f) => f.id === id)!.table : s.decisions.find((d) => d.id === id)!.options.find((o) => o.ok)!.id;
}
