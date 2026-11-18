import { setDisabled } from '@/content/disabled';
import { firebase } from '@/features/auth/auth';
import type { AnswerEvent, Crash, Report } from '@/shared/lib/outbox';
import type { Profile } from '@/features/auth/profile';

/* What the admin view reads and writes in Firestore (see firestore.rules). */

export type ReportStatus = 'open' | 'working' | 'fixed' | 'wontfix';
export const STATUSES: ReportStatus[] = ['open', 'working', 'fixed', 'wontfix'];
export type StoredReport = Report & { id: string; uid?: string; status: ReportStatus; adminNote?: string; at?: { seconds: number } };
export type Learner = Profile & { uid: string; lastSeenAt?: { seconds: number } };
export type Batch = { uid?: string; lang: string; items: AnswerEvent[] };
/** A crash report as stored (crash.ts, firestore.rules). */
export type StoredCrash = Omit<Crash, 't'> & { id: string; uid?: string; at?: { seconds: number } };
export interface Disabled { reason: string; /** When it was turned off (ms). */ at?: number }
export interface AdminData {
  reports: StoredReport[];
  batches: Batch[];
  disabled: Record<string, Disabled>;
  /** Signed-in learners, most recently seen first. */
  learners: Learner[];
  /** Why the learner list could not be read (e.g. the rules for it are not deployed). */
  learnersError?: string;
  /** What broke in the app, newest first. */
  crashes: StoredCrash[];
  /** Why the crash reports could not be read (e.g. the rules for them are not deployed). */
  crashesError?: string;
}

/*
 * End-to-end builds (VITE_E2E=1, never production) have no Firebase: a test can put
 * an AdminData fixture in localStorage['e2e-admin'] and the admin view works on it.
 */
const FIXTURE = 'e2e-admin';
const fixture = (): AdminData | null => {
  if (import.meta.env.VITE_E2E !== '1') return null;
  try { return JSON.parse(localStorage.getItem(FIXTURE) ?? 'null') as AdminData | null; } catch { return null; }
};
const saveFixture = (d: AdminData) => localStorage.setItem(FIXTURE, JSON.stringify(d));
export const usingFixture = () => fixture() !== null;

/** Reports from the first version used 'done' for resolved. */
const status = (s: unknown): ReportStatus => (s === 'done' ? 'fixed' : STATUSES.includes(s as ReportStatus) ? (s as ReportStatus) : 'open');

export async function isAdmin(uid: string): Promise<boolean> {
  if (usingFixture()) return true;
  const { store, db } = await firebase();
  return (await store.getDoc(store.doc(db, 'admins', uid))).exists();
}

export async function loadAdminData(): Promise<AdminData> {
  const fx = fixture();
  if (fx) { setDisabled(Object.keys(fx.disabled)); return { ...fx, learners: fx.learners ?? [], crashes: fx.crashes ?? [], reports: fx.reports.map((r) => ({ ...r, status: status(r.status) })) }; }
  const { store, db } = await firebase();
  const settle = <T,>(p: Promise<T>) => p.then((x) => ({ ok: true as const, x }), (e: unknown) => ({ ok: false as const, e: e instanceof Error ? e.message : String(e) }));
  const [r, q, c, people, broke] = await Promise.all([
    store.getDocs(store.query(store.collection(db, 'reports'), store.orderBy('at', 'desc'), store.limit(300))),
    store.getDocs(store.query(store.collection(db, 'qlog'), store.orderBy('at', 'desc'), store.limit(2000))),
    store.getDoc(store.doc(db, 'config', 'questions')),
    // the learner list and the crash reports must not take the rest of the page down with them
    settle(store.getDocs(store.query(store.collection(db, 'profiles'), store.orderBy('lastSeenAt', 'desc'), store.limit(1000)))),
    settle(store.getDocs(store.query(store.collection(db, 'crashes'), store.orderBy('at', 'desc'), store.limit(300)))),
  ]);
  const disabled = ((c.data() as { disabled?: Record<string, Disabled> } | undefined)?.disabled) ?? {};
  setDisabled(Object.keys(disabled));
  return {
    reports: r.docs.map((d) => { const x = d.data() as Omit<StoredReport, 'id'>; return { ...x, id: d.id, status: status(x.status) }; }),
    batches: q.docs.map((d) => d.data() as Batch),
    disabled,
    learners: people.ok ? people.x.docs.map((d) => ({ ...(d.data() as Omit<Learner, 'uid'>), uid: d.id })) : [],
    ...(people.ok ? {} : { learnersError: people.e }),
    crashes: broke.ok ? broke.x.docs.map((d) => ({ ...(d.data() as Omit<StoredCrash, 'id'>), id: d.id })) : [],
    ...(broke.ok ? {} : { crashesError: broke.e }),
  };
}

/** Clears crash reports (once the bug is fixed). */
export async function deleteCrashes(ids: string[]) {
  const fx = fixture();
  if (fx) { saveFixture({ ...fx, crashes: (fx.crashes ?? []).filter((x) => !ids.includes(x.id)) }); return; }
  const { store, db } = await firebase();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = store.writeBatch(db);
    for (const id of ids.slice(i, i + 400)) batch.delete(store.doc(db, 'crashes', id));
    await batch.commit();
  }
}

/** Sets the status (and the admin's own note) on every report of one question at once. */
export async function updateReports(ids: string[], next: ReportStatus, adminNote: string) {
  const fx = fixture();
  if (fx) { saveFixture({ ...fx, reports: fx.reports.map((r) => (ids.includes(r.id) ? { ...r, status: next, adminNote } : r)) }); return; }
  const { store, db } = await firebase();
  const batch = store.writeBatch(db);
  for (const id of ids) batch.update(store.doc(db, 'reports', id), { status: next, adminNote: adminNote.slice(0, 2000), updatedAt: store.serverTimestamp() });
  await batch.commit();
}

/** Turns a question off (it stops appearing for learners at their next sign-in) or back on. */
export async function setQuestionOff(qid: string, off: boolean, reason = ''): Promise<Record<string, Disabled>> {
  const change = (now: Record<string, Disabled>) => {
    const next = { ...now };
    if (off) next[qid] = { reason: reason.slice(0, 300), at: Date.now() };
    else delete next[qid];
    return next;
  };
  const fx = fixture();
  if (fx) { const next = change(fx.disabled); saveFixture({ ...fx, disabled: next }); setDisabled(Object.keys(next)); return next; }
  const { store, db } = await firebase();
  const ref = store.doc(db, 'config', 'questions');
  const next = change(((await store.getDoc(ref)).data() as { disabled?: Record<string, Disabled> } | undefined)?.disabled ?? {});
  await store.setDoc(ref, { disabled: next, updatedAt: store.serverTimestamp() });
  setDisabled(Object.keys(next));
  return next;
}
