import { tr } from '@/shared/lib/i18n';

/**
 * Migration mode: change a live system without losing data or stopping it.
 * Every scenario uses the same six safe moves (expand → copy → verify → shift reads →
 * shift writes → contract) plus two tempting shortcuts, worded for its own story.
 */
export type Move = 'expand' | 'copy' | 'verify' | 'reads' | 'writes' | 'contract' | 'downtime' | 'bigbang';
export const SAFE_ORDER: Move[] = ['expand', 'copy', 'verify', 'reads', 'writes', 'contract'];

export interface Scenario { id: string; title: string; level: number; brief: string; steps: Record<Move, string> }

export const scenarios: Scenario[] = [
  {
    id: 'dbsplit', title: tr('Order database বদল', 'Moving the order database'), level: 5,
    brief: tr('৫ কোটি order পুরনো এক database-এ। নতুন sharded database-এ সরাতে হবে, app এক মিনিটও বন্ধ না রেখে, একটা order-ও না হারিয়ে।', '50 million orders sit in one old database. Move them to a new sharded database without stopping the app for a minute or losing a single order.'),
    steps: {
      expand: tr('নতুন DB-তেও লেখা শুরু (dual write)', 'Start writing to the new DB too (dual write)'),
      copy: tr('পুরনো order নতুন DB-তে কপি (backfill)', 'Copy old orders into the new DB (backfill)'),
      verify: tr('দুই DB মিলিয়ে দেখা (shadow read)', 'Compare the two DBs (shadow reads)'),
      reads: tr('ধীরে ধীরে পড়া নতুন DB থেকে (১% → ১০০%)', 'Shift reads to the new DB gradually (1% → 100%)'),
      writes: tr('পুরনো DB-তে লেখা বন্ধ', 'Stop writing to the old DB'),
      contract: tr('পুরনো DB বন্ধ করে দেওয়া', 'Switch the old DB off'),
      downtime: tr('App ২ ঘণ্টা বন্ধ রেখে সব কপি', 'Stop the app for 2 hours and copy everything'),
      bigbang: tr('এক রাতে সব read আর write নতুন DB-তে', 'Move all reads and writes to the new DB in one night'),
    },
  },
  {
    id: 'strangler', title: tr('Monolith থেকে payment আলাদা', 'Pulling payments out of the monolith'), level: 26,
    brief: tr('পুরো ParcelGo একটা বড় app। Payment অংশটা আলাদা service বানাতে হবে, যাতে payment team আলাদা deploy করতে পারে। টাকার হিসাবে একটা ভুলও চলবে না।', 'All of ParcelGo is one big app. Payments must become a separate service so the payment team can deploy on its own. Not a single error in the money.'),
    steps: {
      expand: tr('নতুন payment service চালু, দুই জায়গাতেই লেখা', 'Run the new payment service, writing to both'),
      copy: tr('পুরনো payment record নতুন service-এ কপি', 'Copy old payment records into the new service'),
      verify: tr('দুটোর হিসাব মিলিয়ে দেখা (shadow traffic)', 'Compare both ledgers (shadow traffic)'),
      reads: tr('Gateway থেকে কিছু request নতুন service-এ (১% → ১০০%)', 'Route some requests to the new service (1% → 100%)'),
      writes: tr('Monolith-এর payment code-এ লেখা বন্ধ', 'Stop writes in the monolith\'s payment code'),
      contract: tr('Monolith থেকে payment code মুছে ফেলা', 'Delete the payment code from the monolith'),
      downtime: tr('Weekend-এ app বন্ধ রেখে payment কেটে আলাদা', 'Take the app down for a weekend and cut payments out'),
      bigbang: tr('নতুন service deploy, এক ধাক্কায় সব traffic সেখানে', 'Deploy the service and send all traffic at once'),
    },
  },
  {
    id: 'rename', title: tr('৫ কোটি row-এর column বদল', 'Renaming a column on 50 million rows'), level: 22,
    brief: tr('orders table-এর phone column-এর নাম হবে customer_phone। Table-এ ৫ কোটি row, আর app সেকেন্ডে ৩০০ বার এই table-এ লেখে।', 'The phone column in the orders table becomes customer_phone. The table has 50 million rows and the app writes to it 300 times a second.'),
    steps: {
      expand: tr('নতুন column যোগ, code দুটোতেই লেখে', 'Add the new column; code writes to both'),
      copy: tr('পুরনো row-এর মান নতুন column-এ কপি, ছোট batch-এ', 'Copy old rows into the new column in small batches'),
      verify: tr('দুই column মিলিয়ে দেখা', 'Compare the two columns'),
      reads: tr('Code নতুন column থেকে পড়ে', 'Code reads from the new column'),
      writes: tr('Code পুরনো column-এ লেখা বন্ধ', 'Code stops writing the old column'),
      contract: tr('পুরনো column মুছে ফেলা', 'Drop the old column'),
      downtime: tr('Maintenance window-এ ALTER TABLE RENAME (৪০ মিনিট lock)', 'ALTER TABLE RENAME in a maintenance window (40-minute lock)'),
      bigbang: tr('Column rename আর নতুন code একসাথে deploy', 'Deploy the rename and the new code together'),
    },
  },
];

export type Tone = 'good' | 'warn' | 'bad';
export interface Event { move: Move; tone: Tone; text: string }
export interface Outcome {
  events: Event[];
  lostData: boolean;
  downtime: number;
  rollbackSafe: boolean;
  finished: boolean;
  /** 0..4: finished, no data loss, no downtime, safe rollback. */
  score: number;
}

/** Plays a migration plan step by step and reports what happened to the data and the users. */
export function runPlan(plan: Move[]): Outcome {
  const st = { dual: false, stopped: false, copied: false, consistent: false, verified: false, readsNew: false, writesNew: false, retired: false };
  let lostData = false, downtime = 0, rollbackSafe = true;
  const events: Event[] = [];
  const say = (move: Move, tone: Tone, text: string) => events.push({ move, tone, text });

  for (const m of plan) {
    switch (m) {
      case 'downtime':
        st.stopped = true; downtime += 120;
        say(m, 'warn', tr('App বন্ধ: ২ ঘণ্টা কেউ order দিতে পারল না। কপি নিরাপদ, কিন্তু "এক মিনিটও বন্ধ নয়" ভাঙল।', 'App down: nobody could order for 2 hours. The copy is safe, but "not one minute down" is broken.'));
        break;
      case 'expand':
        st.dual = true;
        say(m, 'good', tr('এখন থেকে প্রতিটা নতুন লেখা দুই জায়গায় যায়। পুরনোটা এখনো আসল।', 'From now on every new write goes to both places. The old one is still the source of truth.'));
        break;
      case 'copy':
        st.copied = true;
        st.consistent = st.dual || st.stopped;
        say(m, st.consistent ? 'good' : 'warn', st.consistent
          ? tr('পুরনো data কপি হলো; কপির সময়ের নতুন লেখাও dual write ধরে রেখেছে।', 'Old data copied; new writes during the copy were caught by the dual write.')
          : tr('কপি হলো, কিন্তু কপির ৬ ঘণ্টায় আসা নতুন লেখা নতুন জায়গায় নেই। ফাঁক রয়ে গেল।', 'Copied, but the writes that arrived during the 6-hour copy are missing in the new place. A gap remains.'));
        break;
      case 'verify':
        st.verified = true;
        if (!st.copied) say(m, 'warn', tr('মেলানোর কিছু নেই: নতুন জায়গায় এখনো পুরনো data-ই আসেনি।', 'Nothing to compare: the old data has not reached the new place yet.'));
        else if (!st.consistent) { st.consistent = true; say(m, 'warn', tr('অমিল ধরা পড়ল: ৩,২১০টা record নেই। আবার কপি করে মেলানো হলো: ভাগ্যিস যাচাই করেছিলেন।', 'Mismatch caught: 3,210 records missing. Re-copied and matched: lucky you checked.')); }
        else say(m, 'good', tr('দুই জায়গা হুবহু এক। এখন সরানো নিরাপদ।', 'Both places match exactly. Now it is safe to move.'));
        break;
      case 'reads':
      case 'bigbang': {
        if (m === 'bigbang') { st.writesNew = true; if (!st.verified) rollbackSafe = false; }
        st.readsNew = true;
        if (!st.copied) { lostData = true; say(m, 'bad', tr('Customer-রা পুরনো order দেখতে পাচ্ছে না: নতুন জায়গায় data কপিই হয়নি!', 'Customers cannot see their old orders: the data was never copied to the new place!')); }
        else if (!st.consistent) { lostData = true; say(m, 'bad', tr('কিছু customer-এর order উধাও: কপির ফাঁক কেউ ধরেনি।', 'Some customers\' orders vanished: nobody caught the copy gap.')); }
        else if (m === 'bigbang') say(m, st.verified ? 'warn' : 'bad', st.verified ? tr('এক ধাক্কায় সব সরল। এবার কাজ করল, কিন্তু সমস্যা হলে সব user একসাথে ভুগত।', 'Everything moved in one go. It worked this time, but any problem would hit every user at once.') : tr('যাচাই ছাড়াই সব একসাথে: সমস্যা হলে ফেরার পথ নেই।', 'Everything at once with no check: if something breaks, there is no way back.'));
        else say(m, st.verified ? 'good' : 'warn', st.verified ? tr('১% user থেকে শুরু, error দেখে দেখে ১০০%। দরকার হলে এক switch-এ ফেরা যায়।', 'Start with 1% of users, watch errors, grow to 100%. One switch rolls it back if needed.') : tr('পড়া সরল, কিন্তু আগে মিলিয়ে দেখেননি: ঝুঁকি নিয়ে চলছেন।', 'Reads moved, but without checking first: you are running on luck.'));
        if (m === 'reads' && !st.verified) rollbackSafe = false;
        if (m === 'bigbang' && !st.dual && !st.stopped && st.copied) { lostData = true; say(m, 'bad', tr('কপি শেষ থেকে switch পর্যন্ত আসা লেখা পুরনো জায়গায় আটকে রইল।', 'Writes between the end of the copy and the switch were stranded in the old place.')); }
        break;
      }
      case 'writes':
        if (!st.readsNew) { lostData = true; say(m, 'bad', tr('নতুন লেখা শুধু নতুন জায়গায়, অথচ পড়া এখনো পুরনো থেকে: customer নিজের নতুন order দেখছে না!', 'New writes go only to the new place, yet reads still come from the old one: customers cannot see their new orders!')); }
        else if (!st.dual) { lostData = true; say(m, 'bad', tr('Dual write ছিল না, তাই কপির পরের লেখাগুলো নতুন জায়গায় পৌঁছায়নি।', 'There was no dual write, so writes after the copy never reached the new place.')); }
        else say(m, 'good', tr('নতুন জায়গাই এখন আসল। পুরনোটা শুধু পেছনের সাক্ষী।', 'The new place is now the source of truth. The old one is just a witness.'));
        st.writesNew = true;
        break;
      case 'contract':
        if (!st.writesNew) { lostData = true; say(m, 'bad', tr('পুরনোটা বন্ধ, অথচ লেখা এখনো সেখানেই যাচ্ছিল: সেই data হারাল।', 'The old one is gone, yet writes were still going there: that data is lost.')); }
        else if (!st.verified) { rollbackSafe = false; say(m, 'warn', tr('বন্ধ করা হলো, কিন্তু কখনো মিলিয়ে দেখা হয়নি। এখন ভুল ধরা পড়লে ফেরার জায়গা নেই।', 'Switched off, but never compared. If an error shows up now, there is nowhere to go back to.')); }
        else say(m, 'good', tr('পুরনোটা সরানো হলো। Migration শেষ, কেউ কিছু টেরও পায়নি।', 'The old one is removed. Migration done, and nobody noticed a thing.'));
        st.retired = true;
        break;
    }
  }
  const finished = st.readsNew && st.writesNew && st.retired;
  if (!finished) events.push({ move: plan.at(-1) ?? 'expand', tone: 'warn', text: tr('Migration শেষ হয়নি: পড়া, লেখা দুটোই নতুন জায়গায় সরিয়ে পুরনোটা বন্ধ করতে হবে।', 'The migration is not finished: move both reads and writes, then switch the old one off.') });
  const score = [finished, !lostData, downtime === 0, rollbackSafe].filter(Boolean).length;
  return { events, lostData, downtime, rollbackSafe, finished, score };
}
