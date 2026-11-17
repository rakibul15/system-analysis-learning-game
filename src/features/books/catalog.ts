import { tr } from '@/shared/lib/i18n';

/**
 * The books a topic can point to. Only bibliographic facts live here: chapter and
 * section titles and printed page numbers. The books themselves are the learner's
 * own PDFs, kept in this browser ("My books"), opened at the right place.
 */
export type BookId = 'ddia2' | 'xu1' | 'xu2';

export interface BookInfo { id: BookId; short: string; title: string; by: string; buyUrl: string; chapters: Record<number, string> }

export const BOOKS: Record<BookId, BookInfo> = {
  ddia2: {
    id: 'ddia2', short: 'DDIA', title: tr('Designing Data-Intensive Applications (২য় edition)', 'Designing Data-Intensive Applications (2nd edition)'), by: 'Kleppmann & Riccomini',
    buyUrl: 'https://www.oreilly.com/library/view/designing-data-intensive/9781098119058/',
    chapters: {
      1: 'Trade-Offs in Data Systems Architecture', 2: 'Defining Nonfunctional Requirements', 3: 'Data Models and Query Languages', 4: 'Storage and Retrieval',
      5: 'Encoding and Evolution', 6: 'Replication', 7: 'Sharding', 8: 'Transactions', 9: 'The Trouble with Distributed Systems', 10: 'Consistency and Consensus',
      11: 'Batch Processing', 12: 'Stream Processing', 13: 'A Philosophy of Streaming Systems', 14: 'Doing the Right Thing',
    },
  },
  xu1: {
    id: 'xu1', short: 'Xu Vol 1', title: 'System Design Interview, Vol. 1', by: 'Alex Xu',
    buyUrl: 'https://bytebytego.com/',
    chapters: {
      1: 'Scale From Zero To Millions Of Users', 2: 'Back-of-the-envelope Estimation', 3: 'A Framework For System Design Interviews', 4: 'Design A Rate Limiter',
      5: 'Design Consistent Hashing', 6: 'Design A Key-value Store', 7: 'Design A Unique ID Generator In Distributed Systems', 8: 'Design A URL Shortener',
      9: 'Design A Web Crawler', 10: 'Design A Notification System', 11: 'Design A News Feed System', 12: 'Design A Chat System',
      13: 'Design A Search Autocomplete System', 14: 'Design YouTube', 15: 'Design Google Drive', 16: 'The Learning Continues',
    },
  },
  xu2: {
    id: 'xu2', short: 'Xu Vol 2', title: 'System Design Interview, Vol. 2', by: 'Alex Xu & Sahn Lam',
    buyUrl: 'https://bytebytego.com/',
    chapters: {
      1: 'Proximity Service', 2: 'Nearby Friends', 3: 'Google Maps', 4: 'Distributed Message Queue', 5: 'Metrics Monitoring and Alerting System',
      6: 'Ad Click Event Aggregation', 7: 'Hotel Reservation System', 8: 'Distributed Email Service', 9: 'S3-like Object Storage',
      10: 'Real-time Gaming Leaderboard', 11: 'Payment System', 12: 'Digital Wallet', 13: 'Stock Exchange',
    },
  },
};

/** A place in a book: a chapter, optionally one section of it, with printed pages when known. */
export interface BookRef { book: BookId; chapter: number; section?: string; pages?: [number, number] }

const D = (chapter: number, section: string, a: number, b: number): BookRef => ({ book: 'ddia2', chapter, section, pages: [a, b] });
const DC = (chapter: number, a: number, b: number): BookRef => ({ book: 'ddia2', chapter, pages: [a, b] });
const X1 = (chapter: number): BookRef => ({ book: 'xu1', chapter });
const X2 = (chapter: number): BookRef => ({ book: 'xu2', chapter });

export const levelRefs: Record<number, BookRef[]> = {
  1: [X1(1), D(2, 'Scalability', 49, 52), D(2, 'Fault Tolerance', 43, 48), D(6, 'Single-Leader Replication', 198, 208)],
  2: [X1(1), D(4, 'Keeping Everything in Memory', 133, 134), D(2, 'Describing Performance', 37, 42), D(13, 'Combining Specialized Tools by Deriving Data', 540, 543)],
  3: [X1(2), X1(3), D(2, 'Describing Performance', 37, 42), D(2, 'Understanding Load', 50, 50)],
  4: [X1(4), D(2, 'Understanding Load', 50, 50), D(8, 'Preventing Lost Updates', 299, 302)],
  5: [X1(5), D(7, 'Sharding by Hash of Key', 258, 262), D(7, 'Operations: Automatic Versus Manual Rebalancing', 264, 264), D(7, 'Request Routing', 265, 267)],
  6: [X1(6), D(6, 'Problems with Replication Lag', 209, 214), D(6, 'Leaderless Replication', 229, 242), D(10, 'The Cost of Linearizability', 413, 416)],
  7: [X1(7), D(10, 'ID Generators and Logical Clocks', 417, 424), D(9, 'Unreliable Clocks', 358, 370)],
  8: [X1(8), D(4, 'Log-Structured Storage', 118, 124), D(10, 'Linearizable ID Generators', 423, 424)],
  9: [X1(9), D(11, 'Batch Processing in Distributed Systems', 457, 465), D(11, 'Batch Use Cases', 476, 480)],
  10: [X1(10), D(12, 'Messaging Systems', 489, 494), D(8, 'Exactly-Once Message Processing Revisited', 334, 335), D(13, 'The End-to-End Argument for Databases', 562, 565)],
  11: [X1(11), D(2, 'Case Study: Social Network Home Timelines', 34, 36), D(3, 'Event Sourcing and CQRS', 101, 104)],
  12: [X1(12), D(12, 'Log-Based Message Brokers', 495, 499), D(10, 'Logical Clocks', 420, 422), D(6, 'Sync Engines and Local-First Software', 220, 221)],
  13: [X1(13), D(4, 'Multidimensional and Full-Text Indexes', 145, 149)],
  14: [X1(14), D(11, 'Object Stores', 460, 460)],
  15: [X1(15), D(6, 'Sync Engines and Local-First Software', 220, 221), D(6, 'Dealing with Conflicting Writes', 222, 228)],
  16: [X2(1), D(4, 'Multidimensional and Full-Text Indexes', 145, 145), D(7, 'Sharding by Key Range', 256, 257)],
  17: [X2(2), D(12, 'Processing Streams', 513, 517), D(14, 'Privacy and Tracking', 589, 596)],
  18: [X2(3), D(3, 'Graph-Like Data Models', 84, 100)],
  19: [X2(4), D(12, 'Transmitting Event Streams', 488, 499), D(12, 'Fault Tolerance', 526, 528)],
  20: [X2(5), D(2, 'Describing Performance', 37, 42), D(4, 'Column-Oriented Storage', 136, 141)],
  21: [X2(6), D(12, 'Reasoning About Time', 518, 522), D(12, 'Stream Joins', 523, 525), D(12, 'Fault Tolerance', 526, 528)],
  22: [X2(7), D(8, 'Weak Isolation Levels', 288, 307), D(8, 'Serializability', 308, 322)],
  23: [X2(8)],
  24: [X2(9), D(11, 'Object Stores', 460, 460), D(2, 'Hardware and Software Faults', 44, 46)],
  25: [X2(10), D(4, 'Keeping Everything in Memory', 133, 134)],
  26: [X2(11), D(8, 'The Meaning of ACID', 279, 283), D(13, 'The End-to-End Argument for Databases', 562, 565), D(13, 'Trust, but Verify', 575, 578)],
  27: [X2(12), D(8, 'Distributed Transactions', 323, 334), D(3, 'Event Sourcing and CQRS', 101, 104), D(13, 'Enforcing Constraints', 566, 570)],
  28: [X2(13), D(8, 'Actual Serial Execution', 309, 312), D(10, 'Consensus', 425, 439)],
  29: [X1(10), X2(11), D(9, 'Timeouts and Unbounded Delays', 352, 354), D(12, 'Change Data Capture', 503, 507), D(5, 'Durable Execution and Workflows', 187, 188)],
  30: [X1(3), DC(1, 1, 32), DC(2, 33, 64)],
};

/** Incidents point at the section about their failure; otherwise they fall back to their level's refs. */
export const incidentRefs: Record<string, BookRef[]> = {
  replicalag: [D(6, 'Problems with Replication Lag', 209, 214)],
  hotshard: [D(7, 'Skewed Workloads and Relieving Hot Spots', 263, 263)],
  clockskew: [D(9, 'Unreliable Clocks', 358, 370)],
  doublecharge: [D(8, 'The Meaning of ACID', 279, 283), D(13, 'The End-to-End Argument for Databases', 562, 565)],
  retrystorm: [D(9, 'Faults and Partial Failures', 346, 346), D(9, 'Timeouts and Unbounded Delays', 352, 354)],
  cascade: [D(9, 'Faults and Partial Failures', 346, 346), D(9, 'Timeouts and Unbounded Delays', 352, 354)],
  overload: [D(2, 'Understanding Load', 50, 50), D(2, 'Describing Performance', 37, 42)],
};

export const costRefs: BookRef[] = [D(1, 'Cloud Versus Self-Hosting', 12, 18), D(2, 'Scalability', 49, 52)];
export const migrationRefs: BookRef[] = [DC(5, 161, 196), D(7, 'Operations: Automatic Versus Manual Rebalancing', 264, 264)];
export const ddiaChapterRef = (n: number, pages: [number, number]): BookRef => DC(n, pages[0], pages[1]);

/** Guess which book a PDF is from its file name or embedded title. */
export function detectBook(text: string): BookId | null {
  const t = text.toLowerCase();
  if (/data.?intensive/.test(t)) return 'ddia2';
  if (/system.?design.?interview|alex.?xu|bytebytego/.test(t)) {
    return /(vol(ume)?[\s._-]*(2|ii)\b|\bv2\b|volume[\s._-]*two)/.test(t) ? 'xu2' : 'xu1';
  }
  return null;
}

export const refLabel = (r: BookRef) => {
  const b = BOOKS[r.book];
  const ch = b.chapters[r.chapter] ?? '';
  return { book: b.short, where: r.section ? `${r.chapter} › ${r.section}` : `${tr('অধ্যায়', 'Ch.')} ${r.chapter} · ${ch}` };
};
