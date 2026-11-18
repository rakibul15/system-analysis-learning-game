import { create } from 'zustand';
import { useProgress, type ProgressData } from '@/entities/progress/store';
import { mergeProgress, normalize, sameProgress } from './merge';
import { firebaseConfig } from './firebaseConfig';
import { newCache, syncParts, type CloudStore, type PartCache } from './cloud';
import { setSender, type Sender } from '@/shared/lib/outbox';
import { setDisabled } from '@/content/disabled';
import { lang } from '@/shared/lib/i18n';
import { summarize } from './profile';

export interface AuthUser { uid: string; name: string; email: string; photo: string | null }
type SyncState = 'off' | 'syncing' | 'saved' | 'error';

interface AuthState {
  user: AuthUser | null;
  /** 'idle' until Firebase has been asked; guests never load it. */
  status: 'idle' | 'loading' | 'ready';
  sync: SyncState;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useAuth = create<AuthState>(() => ({ user: null, status: 'idle', sync: 'off', lastSyncedAt: null, error: null }));

/** Remembered so a returning learner's session is restored without a click, and guests never download Firebase. */
const FLAG = 'salg-auth';
const OWNER = 'salg-owner';
/** Which account the progress in this browser belongs to, so two people on one browser never mix. */
const owner = { get: () => { try { return localStorage.getItem(OWNER); } catch { return null; } }, set: (uid: string | null) => { try { uid ? localStorage.setItem(OWNER, uid) : localStorage.removeItem(OWNER); } catch { /* storage blocked */ } } };
const clearLocal = () => { applying = true; useProgress.getState().reset(); applying = false; };

const flag = { get: () => { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } }, set: (on: boolean) => { try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG); } catch { /* storage blocked */ } } };

type Fb = Awaited<ReturnType<typeof loadFirebase>>;
let fbPromise: Promise<Fb> | null = null;

async function loadFirebase() {
  const [{ initializeApp }, authMod, store] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore/lite'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = store.getFirestore(app);
  return { auth, authMod, db, store };
}
const fb = () => (fbPromise ??= loadFirebase());

const pick = (s: ProgressData): ProgressData => normalize(s);

/** Progress in parts (users/{uid} plus users/{uid}/progress/*), see parts.ts. */
function partsStore(f: Fb, uid: string): CloudStore {
  const { store, db } = f;
  const user = store.doc(db, 'users', uid);
  const part = (k: string) => store.doc(db, 'users', uid, 'progress', k);
  return {
    async getSummary() {
      const snap = await store.getDoc(user);
      return snap.exists() ? (snap.data() as { revs?: Record<string, string>; data?: unknown }) : null;
    },
    async getParts(names) {
      const snaps = await Promise.all(names.map((k) => store.getDoc(part(k))));
      return Object.fromEntries(names.map((k, i) => {
        const d = snaps[i]!.data() as { data?: unknown } | undefined;
        return [k, typeof d?.data === 'string' ? d.data : null];
      }));
    },
    async commit(parts, revs, dropLegacy) {
      const batch = store.writeBatch(db);
      for (const [k, json] of Object.entries(parts)) batch.set(part(k), { data: json, updatedAt: store.serverTimestamp() });
      batch.set(user, { v: 4, revs, updatedAt: store.serverTimestamp(), ...(dropLegacy ? { data: store.deleteField() } : {}) }, { merge: true });
      await batch.commit();
    },
  };
}

/** The one-document format, used only while the database rules do not yet allow the parts. */
async function legacySync(f: Fb, uid: string, local: ProgressData, overwrite: boolean): Promise<ProgressData> {
  const ref = f.store.doc(f.db, 'users', uid);
  let cloud: ProgressData | null = null;
  if (!overwrite) {
    const snap = await f.store.getDoc(ref);
    const raw = snap.exists() ? (snap.data() as { data?: string }) : {};
    try { cloud = raw.data ? normalize(JSON.parse(raw.data)) : null; } catch { cloud = null; }
  }
  const merged = cloud ? mergeProgress(local, cloud) : local;
  if (!cloud || !sameProgress(merged, cloud)) await f.store.setDoc(ref, { data: JSON.stringify(merged), v: 3, updatedAt: f.store.serverTimestamp() }, { merge: true });
  return merged;
}

/** Answer batches go to qlog/, problem reports to reports/, crash reports to crashes/ (see firestore.rules). */
function feedbackSender(f: Fb, uid: string): Sender {
  const { store, db } = f;
  return {
    async sendAnswers(items, lang) {
      await store.addDoc(store.collection(db, 'qlog'), { uid, at: store.serverTimestamp(), lang, items });
    },
    async sendReport(r) {
      await store.addDoc(store.collection(db, 'reports'), {
        uid, at: store.serverTimestamp(), lang: r.lang, qid: r.qid, levelId: r.levelId, kind: r.kind,
        note: r.note, prompt: r.prompt, options: r.options, status: 'open',
      });
    },
    async sendCrash(c) {
      await store.addDoc(store.collection(db, 'crashes'), {
        uid, at: store.serverTimestamp(), lang: c.lang, msg: c.msg, stack: c.stack, where: c.where, route: c.route, ver: c.ver, ua: c.ua,
      });
    },
  };
}

/** Questions an admin turned off (config/questions), fetched once per sign-in. */
async function loadDisabled(f: Fb) {
  try {
    const snap = await f.store.getDoc(f.store.doc(f.db, 'config', 'questions'));
    const off = (snap.data() as { disabled?: Record<string, unknown> } | undefined)?.disabled;
    setDisabled(off && typeof off === 'object' ? Object.keys(off) : []);
  } catch { /* offline or rules not deployed: keep the copy in this browser */ }
}

/** profiles/{uid}: name, email and a progress summary for the admin view; written only when it changes. */
let profileSent: string | null = null;
async function saveProfile(f: Fb, user: AuthUser, p: ProgressData) {
  const profile = { name: user.name.slice(0, 200), email: user.email.slice(0, 320), lang, summary: summarize(p) };
  const key = JSON.stringify([user.uid, profile]);
  if (key === profileSent) return;
  try {
    await f.store.setDoc(f.store.doc(f.db, 'profiles', user.uid), { ...profile, lastSeenAt: f.store.serverTimestamp() });
    profileSent = key;
  } catch { /* offline, or the rules for profiles are not deployed yet: try again next sync */ }
}

const denied = (e: unknown) => (e as { code?: string })?.code === 'permission-denied';
let partsBlocked = false;
let cache: { uid: string; parts: PartCache } | null = null;
const cacheFor = (uid: string) => (cache?.uid === uid ? cache.parts : (cache = { uid, parts: newCache() }).parts);
let running: Promise<void> | null = null;
let again = false;
let wantOverwrite = false;

/** Pull what changed in the cloud, merge it with this device, and save the result in both places. */
function syncNow(overwrite = false): Promise<void> {
  // a reset asked for during a sync must not be lost, or the old cloud copy would merge back
  if (overwrite) wantOverwrite = true;
  // one sync at a time; a request during a sync runs once more afterwards
  if (running) { again = true; return running; }
  running = (async () => {
    do {
      again = false;
      const ow = wantOverwrite;
      wantOverwrite = false;
      await syncOnce(ow);
    } while (again);
  })().finally(() => { running = null; });
  return running;
}

async function syncOnce(overwrite: boolean) {
  const user = useAuth.getState().user;
  if (!user) return;
  useAuth.setState({ sync: 'syncing', error: null });
  try {
    const f = await fb();
    const local = pick(useProgress.getState());
    let merged: ProgressData;
    if (partsBlocked) merged = await legacySync(f, user.uid, local, overwrite);
    else {
      try {
        merged = (await syncParts(partsStore(f, user.uid), cacheFor(user.uid), local, overwrite)).merged;
      } catch (e) {
        if (!denied(e)) throw e;
        partsBlocked = true;
        merged = await legacySync(f, user.uid, local, overwrite);
      }
    }
    // the learner may have played on while the sync ran: keep that too
    const now = pick(useProgress.getState());
    const next = sameProgress(now, local) ? merged : mergeProgress(now, merged);
    if (!sameProgress(next, now)) { applying = true; useProgress.setState(next); applying = false; }
    if (!sameProgress(next, merged)) again = true;
    useAuth.setState({ sync: 'saved', lastSyncedAt: Date.now() });
    void saveProfile(f, user, next);
  } catch (e) {
    useAuth.setState({ sync: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let unsubProgress: (() => void) | null = null;

function watchProgress() {
  unsubProgress?.();
  unsubProgress = useProgress.subscribe(() => {
    if (applying || !useAuth.getState().user) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; void syncNow(); }, 2500);
  });
}

// leaving the app (switching tabs, locking the phone) saves a pending change right away
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer !== undefined) { clearTimeout(timer); timer = undefined; void syncNow(); }
  });
}

let started = false;
/** Connect to Firebase and follow the signed-in user. Safe to call many times. */
export async function startAuth() {
  if (started) return;
  started = true;
  useAuth.setState({ status: 'loading' });
  try {
    const f = await fb();
    await f.authMod.getRedirectResult(f.auth).catch(() => null);
    f.authMod.onAuthStateChanged(f.auth, (u) => {
      if (!u) {
        unsubProgress?.(); unsubProgress = null;
        setSender(null);
        // progress is safe in the cloud; leave nothing behind for the next person on this browser
        if (owner.get()) { clearLocal(); owner.set(null); }
        useAuth.setState({ user: null, status: 'ready', sync: 'off' });
        flag.set(false);
        return;
      }
      flag.set(true);
      // another account's progress in this browser must not merge into this one;
      // progress made before any sign-in (no owner) is claimed by the first account
      const prev = owner.get();
      if (prev && prev !== u.uid) clearLocal();
      owner.set(u.uid);
      useAuth.setState({ user: { uid: u.uid, name: u.displayName ?? u.email ?? 'Learner', email: u.email ?? '', photo: u.photoURL }, status: 'ready' });
      watchProgress();
      setSender(feedbackSender(f, u.uid));
      void loadDisabled(f);
      void syncNow();
    });
  } catch (e) {
    started = false;
    useAuth.setState({ status: 'idle', error: e instanceof Error ? e.message : String(e) });
  }
}

/** Restore a previous session on load, only if this browser signed in before. */
/** True when this browser signed in before (the session may still be restoring). */
export const hasSession = () => flag.get();

export function resumeAuth() { if (flag.get()) void startAuth(); }

export async function signInWithGoogle() {
  useAuth.setState({ error: null });
  try {
    await startAuth();
    const f = await fb();
    const provider = new f.authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await f.authMod.signInWithPopup(f.auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        flag.set(true);
        await f.authMod.signInWithRedirect(f.auth, provider);
        return;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      throw e;
    }
  } catch (e) {
    useAuth.setState({ error: e instanceof Error ? e.message : String(e) });
  }
}

export async function signOutUser() {
  clearTimeout(timer);
  if (useAuth.getState().user) await syncNow();
  const f = await fb();
  await f.authMod.signOut(f.auth);
}

export const syncProgressNow = () => syncNow();
/** Firebase for screens that read other collections (the admin view); only after sign-in. */
export const firebase = () => fb();
/** After a deliberate reset, replace the cloud copy instead of merging the old progress back. */
export const replaceCloudWithLocal = () => syncNow(true);
