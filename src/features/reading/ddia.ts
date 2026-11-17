import { tr } from '@/shared/lib/i18n';

/**
 * A reading track for "Designing Data-Intensive Applications", 2nd edition
 * (Kleppmann & Riccomini, O'Reilly 2026). Only chapter titles come from the book;
 * the questions are our own prompts, and the links point at practice in this app.
 */
export type Practice =
  | { kind: 'level'; id: number }
  | { kind: 'incident'; id: string }
  | { kind: 'builder' }
  | { kind: 'migrate' }
  | { kind: 'lab' };

export interface Chapter { id: string; n: number; part: number; title: string; weeks: number; /** First and last page in the printed book. */ pages: [number, number]; look: string[]; practice: Practice[] }

export const BOOK = {
  title: 'Designing Data-Intensive Applications',
  edition: tr('২য় edition', '2nd edition'),
  authors: 'Martin Kleppmann, Chris Riccomini',
  url: 'https://www.oreilly.com/library/view/designing-data-intensive/9781098119058/',
};

export const PART_TITLES = [
  tr('ভিত্তি', 'Foundations'),
  tr('এক machine-এ data', 'Data on one machine'),
  tr('অনেক machine-এ data', 'Data across machines'),
  tr('Data-র প্রবাহ', 'Data in motion'),
];

const L = (id: number): Practice => ({ kind: 'level', id });
const I = (id: string): Practice => ({ kind: 'incident', id });

export const chapters: Chapter[] = [
  { id: 'ddia2:1', n: 1, pages: [1, 32], part: 0, weeks: 1, title: 'Trade-Offs in Data Systems Architecture',
    look: [tr('কোন সিদ্ধান্তে একটা জিনিস পেতে আরেকটা ছাড়তে হয়?', 'Which decisions buy one thing by giving up another?'), tr('CarryBee-তে কোন trade-off সবচেয়ে বেশি চোখে পড়ে?', 'Which trade-off is most visible in CarryBee?')],
    practice: [L(1), { kind: 'builder' }] },
  { id: 'ddia2:2', n: 2, pages: [33, 64], part: 0, weeks: 1, title: 'Defining Nonfunctional Requirements',
    look: [tr('Latency মাপতে গড় কেন যথেষ্ট নয়, percentile কেন?', 'Why is an average not enough for latency, and why percentiles?'), tr('"Scalable" বললে আসলে কোন সংখ্যা বাড়ার কথা?', 'When we say "scalable", which number is supposed to grow?')],
    practice: [L(20), I('overload'), { kind: 'builder' }] },
  { id: 'ddia2:3', n: 3, pages: [65, 114], part: 1, weeks: 1, title: 'Data Models and Query Languages',
    look: [tr('Document, relational আর graph: কোন data-র আকৃতিতে কোনটা মানায়?', 'Document, relational and graph: which shape of data suits which?'), tr('Merchant–order–rider সম্পর্ক কোন model-এ সহজ?', 'Which model makes merchant–order–rider relations easy?')],
    practice: [L(11), L(16)] },
  { id: 'ddia2:4', n: 4, pages: [115, 160], part: 1, weeks: 2, title: 'Storage and Retrieval',
    look: [tr('Log-structured আর B-tree storage-এর পড়া-লেখার খরচে পার্থক্য কী?', 'How do log-structured and B-tree storage differ in read and write cost?'), tr('Index যোগ করলে কী লাভ, কী খরচ?', 'What does adding an index buy, and what does it cost?')],
    practice: [L(6), L(13), L(24)] },
  { id: 'ddia2:5', n: 5, pages: [161, 196], part: 1, weeks: 1, title: 'Encoding and Evolution',
    look: [tr('পুরনো আর নতুন code একসাথে চললে data-র format কীভাবে বদলাবেন?', 'How do you change a data format while old and new code run side by side?'), tr('Backward আর forward compatibility, দুটোর উদাহরণ নিজের কাজ থেকে।', 'Backward and forward compatibility: an example of each from your own work.')],
    practice: [{ kind: 'migrate' }] },
  { id: 'ddia2:6', n: 6, pages: [197, 250], part: 2, weeks: 2, title: 'Replication',
    look: [tr('Replica পিছিয়ে থাকলে user কী কী অদ্ভুত জিনিস দেখতে পারে?', 'What odd things can users see when a replica lags?'), tr('Single-leader, multi-leader আর leaderless: কখন কোনটা?', 'Single-leader, multi-leader and leaderless: when each?')],
    practice: [L(6), I('replicalag'), L(1)] },
  { id: 'ddia2:7', n: 7, pages: [251, 276], part: 2, weeks: 2, title: 'Sharding',
    look: [tr('Key দিয়ে ভাগ আর hash দিয়ে ভাগ: hot spot কোথায় জন্মায়?', 'Splitting by key versus by hash: where do hot spots come from?'), tr('Shard বাড়ালে data সরাবেন কীভাবে, app না থামিয়ে?', 'How do you move data when adding shards without stopping the app?')],
    practice: [L(5), I('hotshard'), { kind: 'migrate' }] },
  { id: 'ddia2:8', n: 8, pages: [277, 344], part: 2, weeks: 2, title: 'Transactions',
    look: [tr('Isolation level-গুলো কোন কোন ভুল আটকায়, কোনগুলো আটকায় না?', 'Which anomalies does each isolation level prevent, and which slip through?'), tr('Double booking বা দুবার টাকা কাটা কোন anomaly?', 'Which anomaly is a double booking or a double charge?')],
    practice: [L(22), L(26), I('doublecharge')] },
  { id: 'ddia2:9', n: 9, pages: [345, 400], part: 2, weeks: 2, title: 'The Trouble with Distributed Systems',
    look: [tr('Network-এ উত্তর না এলে, অন্য machine মরে গেছে না ধীর, কীভাবে জানবেন?', 'When no reply comes, how do you tell a dead machine from a slow one?'), tr('ঘড়ির ওপর ভরসা করা কোথায় বিপজ্জনক?', 'Where is trusting the clock dangerous?')],
    practice: [L(7), I('clockskew'), I('cascade'), I('retrystorm')] },
  { id: 'ddia2:10', n: 10, pages: [401, 450], part: 2, weeks: 2, title: 'Consistency and Consensus',
    look: [tr('"সবাই একই জিনিস দেখে" বলতে আসলে কত রকম গ্যারান্টি?', 'How many kinds of guarantee hide behind "everyone sees the same thing"?'), tr('কখন consensus লাগে, আর তার দাম কী?', 'When do you need consensus, and what does it cost?')],
    practice: [L(6), L(27), L(28)] },
  { id: 'ddia2:11', n: 11, pages: [451, 486], part: 3, weeks: 1, title: 'Batch Processing',
    look: [tr('পুরো data একবারে প্রক্রিয়া করলে কী সহজ হয়?', 'What becomes easy when you process all the data in one go?'), tr('কাজ মাঝপথে ব্যর্থ হলে আবার চালানো নিরাপদ কেন?', 'Why is it safe to rerun a job that failed half way?')],
    practice: [L(9), L(24)] },
  { id: 'ddia2:12', n: 12, pages: [487, 538], part: 3, weeks: 2, title: 'Stream Processing',
    look: [tr('দেরিতে আসা event কীভাবে সামলাবেন?', 'How do you handle events that arrive late?'), tr('Exactly-once আসলে কোথায় সম্ভব, কোথায় শুধু ভান?', 'Where is exactly-once real, and where is it only pretend?')],
    practice: [L(19), L(21), I('poison')] },
  { id: 'ddia2:13', n: 13, pages: [539, 584], part: 3, weeks: 1, title: 'A Philosophy of Streaming Systems',
    look: [tr('Database-কে event-এর log হিসেবে ভাবলে কী বদলায়?', 'What changes if you think of a database as a log of events?'), tr('Outbox আর change data capture কোন সমস্যা মেটায়?', 'Which problem do the outbox and change data capture solve?')],
    practice: [L(29), L(19), { kind: 'migrate' }] },
  { id: 'ddia2:14', n: 14, pages: [585, 602], part: 3, weeks: 1, title: 'Doing the Right Thing',
    look: [tr('আমাদের system কোন data রাখে যা না রাখলেও চলত?', 'What data does our system keep that it could do without?'), tr('Customer-এর location আর phone নিয়ে কোন সিদ্ধান্ত আবার ভাবা উচিত?', 'Which decisions about customers\' location and phone numbers deserve a second look?')],
    practice: [L(17)] },
];

export const TOTAL_WEEKS = chapters.reduce((s, c) => s + c.weeks, 0);
