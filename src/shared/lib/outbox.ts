import { lang, type Lang } from '@/shared/lib/i18n';

/*
 * What learners answer, and the problems they report, wait here (in this browser) until
 * they can be sent: answers in batches of up to 100, so a whole level is one write.
 * Nothing is lost offline or before sign-in; the queue is capped so it cannot grow forever.
 */

export type Where = 'predict' | 'lesson' | 'mission' | 'boss' | 'review' | 'placement' | 'other';
/**
 * One answer: question, right (1/0), sure (1/0), which option (a short key of its text),
 * which version of the question (a short key of its prompt), where, when.
 */
export interface AnswerEvent { q: string; c: 0 | 1; s: 0 | 1; o: string; p?: string; w: Where; t: number }
export type ReportKind = 'wrong' | 'unclear' | 'typo' | 'other';
export interface Report { qid: string; levelId: number; kind: ReportKind; note: string; prompt: string; options: string[]; t: number; lang: Lang }

/** Where an error was caught: a screen's render, the router, a handler or timer, a promise nobody awaited. */
export type CrashWhere = 'render' | 'route' | 'window' | 'promise';
/** Something in the app broke (see crash.ts). */
export interface Crash { msg: string; stack: string; where: CrashWhere; route: string; ver: string; ua: string; t: number; lang: Lang }

interface Box { answers: (AnswerEvent & { l: Lang })[]; reports: Report[]; crashes: Crash[] }

const KEY = 'salg-outbox';
const MAX_ANSWERS = 600;
const MAX_REPORTS = 30;
const MAX_CRASHES = 20;
export const BATCH = 100;

/** A short, stable key for an option's text (so rotating distractors can still be counted). */
export function optionKey(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).slice(0, 8);
}

const read = (): Box => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Box> | null;
    return { answers: Array.isArray(v?.answers) ? v.answers : [], reports: Array.isArray(v?.reports) ? v.reports : [], crashes: Array.isArray(v?.crashes) ? v.crashes : [] };
  } catch { return { answers: [], reports: [], crashes: [] }; }
};
const write = (b: Box) => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* storage full or blocked: drop */ } };

export const levelOfQid = (qid: string) => Number(/^l(\d+)-/.exec(qid)?.[1] ?? 0);

export function logAnswer(e: Omit<AnswerEvent, 't'>) {
  const b = read();
  b.answers.push({ ...e, t: Date.now(), l: lang });
  if (b.answers.length > MAX_ANSWERS) b.answers.splice(0, b.answers.length - MAX_ANSWERS);
  write(b);
  schedule();
}

export function addReport(r: Omit<Report, 't' | 'lang' | 'levelId'>) {
  const b = read();
  b.reports.push({ ...r, note: r.note.slice(0, 600), prompt: r.prompt.slice(0, 2000), options: r.options.slice(0, 8).map((o) => o.slice(0, 500)), levelId: levelOfQid(r.qid), t: Date.now(), lang });
  if (b.reports.length > MAX_REPORTS) b.reports.splice(0, b.reports.length - MAX_REPORTS);
  write(b);
  schedule(0);
}

export function addCrash(c: Omit<Crash, 't' | 'lang'>) {
  const b = read();
  b.crashes.push({ ...c, t: Date.now(), lang });
  if (b.crashes.length > MAX_CRASHES) b.crashes.splice(0, b.crashes.length - MAX_CRASHES);
  write(b);
  schedule(0);
}

export const pending = () => { const b = read(); return { answers: b.answers.length, reports: b.reports.length }; };
export const pendingCrashes = () => read().crashes.length;

/** How queued items reach the cloud; set while a learner is signed in. */
export interface Sender {
  sendAnswers(items: AnswerEvent[], lang: Lang): Promise<void>;
  sendReport(r: Report): Promise<void>;
  sendCrash?(c: Crash): Promise<void>;
}
let sender: Sender | null = null;
let blocked = false;
/** Crash reports have their own collection and rules; a refusal there must not stop answers and reports. */
let crashesBlocked = false;
export function setSender(s: Sender | null) { sender = s; blocked = false; crashesBlocked = false; if (s) schedule(0); }

let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(ms = 20_000) {
  if (!sender || blocked) return;
  clearTimeout(timer);
  timer = setTimeout(() => { timer = undefined; void flush(); }, ms);
}

let flushing: Promise<void> | null = null;
/** Sends what is queued. Items leave the queue only after they were sent. */
export function flush(): Promise<void> {
  if (!sender || blocked) return Promise.resolve();
  return (flushing ??= (async () => {
    const s = sender!;
    try {
      for (let guard = 0; guard < 20; guard++) {
        const b = read();
        if (b.reports.length) {
          const r = b.reports[0]!;
          await s.sendReport(r);
          const now = read();
          write({ ...now, reports: now.reports.filter((x) => !(x.t === r.t && x.qid === r.qid)) });
          continue;
        }
        if (b.crashes.length && s.sendCrash && !crashesBlocked) {
          const c = b.crashes[0]!;
          try {
            await s.sendCrash(c);
          } catch (e) {
            if ((e as { code?: string })?.code !== 'permission-denied') throw e;
            crashesBlocked = true; // the crashes rules are not deployed yet: keep them, carry on with the rest
            continue;
          }
          const now = read();
          write({ ...now, crashes: now.crashes.filter((x) => !(x.t === c.t && x.msg === c.msg)) });
          continue;
        }
        if (!b.answers.length) break;
        const l = b.answers[0]!.l;
        const take = b.answers.slice(0, BATCH);
        const cut = take.findIndex((a) => a.l !== l);
        const batch = cut < 0 ? take : take.slice(0, cut);
        await s.sendAnswers(batch.map(({ l: _l, ...a }) => a), l);
        const sent = new Set(batch.map((a) => `${a.t}|${a.q}`));
        const now = read();
        write({ ...now, answers: now.answers.filter((a) => !sent.has(`${a.t}|${a.q}`)) });
      }
    } catch (e) {
      // the database rules for these collections are not deployed yet: keep the queue, stop trying for now
      if ((e as { code?: string })?.code === 'permission-denied') blocked = true;
    } finally {
      flushing = null;
    }
  })());
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
}
