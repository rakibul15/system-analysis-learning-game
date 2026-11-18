import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { tr } from '@/shared/lib/i18n';
import { whenIdle } from '@/shared/lib/idle';
import { signInWithGoogle, signOutUser, syncProgressNow, useAuth, warmAuth } from './auth';
import { embeddedIn, isAndroid, signInProblem } from './signInProblem';

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);
const siteUrl = () => `${location.origin}${location.pathname}`;

/** Links to open this site in the phone's own browser: Chrome directly on Android, and a copy of the link anywhere. */
function OpenElsewhere() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(siteUrl()); setCopied(true); } catch { window.prompt?.(tr('Link copy করুন', 'Copy the link'), siteUrl()); }
  };
  const chrome = `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {isAndroid(ua()) && <a href={chrome} className="inline-flex min-h-10 items-center rounded-xl border-2 border-ink bg-surface px-3 text-sm font-bold text-ink no-underline">{tr('Chrome-এ খুলুন', 'Open in Chrome')}</a>}
      <button type="button" onClick={() => void copy()} className="min-h-10 cursor-pointer rounded-xl border-2 border-ink bg-surface px-3 text-sm font-bold text-ink">
        {copied ? tr('Link copy হয়েছে ✓', 'Link copied ✓') : tr('Link copy করুন', 'Copy the link')}
      </button>
    </span>
  );
}

/** Why the last sign-in did not finish, and what to do: tap again, or open the site in the phone's own browser. */
export function SignInHelp({ code }: { code: string }) {
  const p = signInProblem(code);
  return (
    <div role="alert" className="flex max-w-[46ch] flex-col items-start gap-2 rounded-xl border-2 border-coral bg-coral-soft px-3 py-2 text-sm text-ink">
      <p className="m-0 font-semibold">{p.text} <span className="font-mono text-[11px] font-normal text-muted">({code})</span></p>
      {p.elsewhere && <OpenElsewhere />}
    </div>
  );
}

/** Before any tap: inside Facebook, Messenger and similar apps Google refuses to sign in, so say so up front. */
export function EmbeddedNote() {
  const app = embeddedIn(ua());
  if (!app) return null;
  const name = app === 'app' ? tr('এই app', 'this app') : app;
  return (
    <div className="flex max-w-[46ch] flex-col items-start gap-2 rounded-xl border-2 border-ink bg-parcel-soft px-3 py-2 text-sm">
      <p className="m-0 font-semibold">{tr(`${name}-এর ভেতরের browser-এ Google login চলে না। উপরের ⋮ মেনু থেকে "Open in browser" বেছে নিন, বা নিচ থেকে খুলুন।`, `Google sign-in does not work in ${name}'s built-in browser. Choose "Open in browser" from the ⋮ menu, or use a button below.`)}</p>
      <OpenElsewhere />
    </div>
  );
}

/**
 * Gets sign-in ready once a sign-in button is on screen, so a tap opens Google's window at once
 * (see warmAuth). Returns handlers that start it sooner if the learner reaches for the button first.
 */
export function useWarmAuth() {
  useEffect(() => whenIdle(warmAuth, 1500), []);
  return { onPointerDown: warmAuth, onFocus: warmAuth, onPointerEnter: warmAuth };
}

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6a24 24 0 0 0 0 21.4l7.8-6z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

const Avatar = ({ photo, name, size = 28 }: { photo: string | null; name: string; size?: number }) =>
  photo
    ? <img src={photo} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full border-2 border-ink" />
    : <span className="grid place-items-center rounded-full border-2 border-ink bg-parcel text-night font-bold" style={{ width: size, height: size }}>{name.slice(0, 1).toUpperCase()}</span>;

/** Header control: a Google sign-in button for guests, the learner's avatar once signed in. */
export function AuthButton() {
  const { user, status, sync, signInError } = useAuth();
  const [busy, setBusy] = useState(false);
  const warm = useWarmAuth();
  if (user) {
    const dot = sync === 'error' ? 'var(--color-coral)' : sync === 'syncing' ? 'var(--color-parcel)' : 'var(--color-route)';
    return (
      <Link to="/profile" title={`${user.name} · ${sync === 'error' ? tr('Sync হয়নি', 'Not synced') : sync === 'syncing' ? tr('Sync হচ্ছে…', 'Syncing…') : tr('Cloud-এ সংরক্ষিত', 'Saved to the cloud')}`}
        className="relative flex h-10 items-center rounded-xl border-[2.5px] border-ink bg-surface px-1.5 no-underline">
        <Avatar photo={user.photo} name={user.name} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white" style={{ background: dot }} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <span className="relative">
      <button type="button" disabled={busy || status === 'loading'} {...warm}
        onClick={async () => { setBusy(true); await signInWithGoogle(); setBusy(false); }}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border-[2.5px] border-ink bg-surface px-3 font-bold disabled:cursor-wait disabled:opacity-60">
        <GoogleMark /> {busy || status === 'loading' ? tr('অপেক্ষা…', 'Wait…') : tr('Login', 'Sign in')}
      </button>
      {signInError && !busy && <span className="absolute right-0 top-full z-30 mt-2 w-[min(18rem,80vw)] font-normal"><SignInHelp code={signInError} /></span>}
    </span>
  );
}

/** Profile card: who is signed in, sync state, and sign out; or why to sign in. */
export function AccountCard() {
  const { user, sync, lastSyncedAt, error } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-[24px] border-[3px] border-ink bg-surface p-6">
      <h2 className="m-0 font-display text-xl font-bold">{tr('Account', 'Account')}</h2>
      {user ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Avatar photo={user.photo} name={user.name} size={48} />
            <div className="min-w-0">
              <div className="font-bold">{user.name}</div>
              <div className="break-all text-sm text-muted">{user.email}</div>
            </div>
          </div>
          <p role="status" className="m-0 text-sm">
            {sync === 'syncing' && tr('Cloud-এর সাথে মেলানো হচ্ছে…', 'Syncing with the cloud…')}
            {sync === 'saved' && tr(`সব progress cloud-এ সংরক্ষিত${lastSyncedAt ? ` (${new Date(lastSyncedAt).toLocaleTimeString()})` : ''}। অন্য ফোন বা computer-এ একই Google account দিয়ে login করলেই পাবেন।`, `All progress is saved to the cloud${lastSyncedAt ? ` (${new Date(lastSyncedAt).toLocaleTimeString()})` : ''}. Sign in with the same Google account on another phone or computer to pick it up.`)}
            {sync === 'error' && <span className="text-coral-deep">{tr('Sync হয়নি। Internet দেখে আবার চেষ্টা করুন।', 'Sync failed. Check the connection and try again.')}{error ? ` (${error})` : ''}</span>}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void syncProgressNow()} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-surface px-4 font-semibold">{tr('এখনই sync করুন', 'Sync now')}</button>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); await signOutUser(); setBusy(false); }} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-surface px-4 font-semibold">{tr('Logout', 'Sign out')}</button>
          </div>
          <p className="m-0 text-xs text-muted">{tr('Logout করলে progress এই browser থেকে সরে যায়, আপনার account-এ (cloud-এ) থেকে যায়। আবার login করলেই ফিরে আসবে।', 'Signing out removes the progress from this browser; it stays in your account in the cloud and comes back when you sign in.')}</p>
          <p className="m-0 text-xs text-muted">{tr('ParcelGo-র admin আপনার নাম, email আর progress-এর সারাংশ (কয়টা level, শেষ কবে খেলেছেন) দেখতে পান, যোগাযোগ করতে আর হারানো progress খুঁজে দিতে। প্রশ্নগুলো ভালো করতে কোন প্রশ্নে কোন উত্তর বাছলেন সেটাও আপনার account-এর সাথে যায়। পুরো progress শুধু আপনিই দেখেন।', 'The ParcelGo admin can see your name, email and a progress summary (how many levels, when you last played), to contact you and to help find lost progress. Which option you pick on each question is also sent with your account, to improve the questions. Your full progress is visible only to you.')}</p>
        </>
      ) : (
        <>
          <p className="m-0">{tr('Login ছাড়াও খেলা যায়, progress এই browser-এ থাকে। Google দিয়ে login করলে progress cloud-এ থাকবে আর ফোন, laptop সব জায়গায় একসাথে চলবে। তখন আপনার নাম, email আর progress-এর সারাংশ admin দেখতে পান।', 'You can play without signing in; progress stays in this browser. Sign in with Google to keep it in the cloud and carry it across your phone and laptop. The admin can then see your name, email and a progress summary.')}</p>
          <div><AuthButton /></div>
          {error && <p role="alert" className="m-0 text-sm text-coral-deep">{error}</p>}
        </>
      )}
    </section>
  );
}
