import { create } from 'zustand';
import { useProgress, type ProgressData } from '@/entities/progress/store';
import { mergeProgress, normalize, sameProgress } from './merge';
import { firebaseConfig } from './firebaseConfig';

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

async function readCloud(f: Fb, uid: string): Promise<ProgressData | null> {
  const snap = await f.store.getDoc(f.store.doc(f.db, 'users', uid));
  if (!snap.exists()) return null;
  const raw = snap.data() as { data?: string };
  try { return raw.data ? normalize(JSON.parse(raw.data)) : null; } catch { return null; }
}
async function writeCloud(f: Fb, uid: string, data: ProgressData) {
  await f.store.setDoc(f.store.doc(f.db, 'users', uid), { data: JSON.stringify(data), v: 3, updatedAt: f.store.serverTimestamp() });
}

/** Pull the cloud copy, merge it with this device, and save the result in both places. */
async function syncNow(overwrite = false) {
  const user = useAuth.getState().user;
  if (!user) return;
  useAuth.setState({ sync: 'syncing', error: null });
  try {
    const f = await fb();
    const local = pick(useProgress.getState());
    const cloud = overwrite ? null : await readCloud(f, user.uid);
    const merged = cloud ? mergeProgress(local, cloud) : local;
    if (!sameProgress(merged, local)) { applying = true; useProgress.setState(merged); applying = false; }
    if (!cloud || !sameProgress(merged, cloud)) await writeCloud(f, user.uid, merged);
    useAuth.setState({ sync: 'saved', lastSyncedAt: Date.now() });
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
    timer = setTimeout(() => void syncNow(), 2500);
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
/** After a deliberate reset, replace the cloud copy instead of merging the old progress back. */
export const replaceCloudWithLocal = () => syncNow(true);
