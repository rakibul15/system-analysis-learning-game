import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { tr } from '@/shared/lib/i18n';
import { signInWithGoogle, signOutUser, syncProgressNow, useAuth } from './auth';

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
    : <span className="grid place-items-center rounded-full border-2 border-ink bg-parcel font-bold" style={{ width: size, height: size }}>{name.slice(0, 1).toUpperCase()}</span>;

/** Header control: a Google sign-in button for guests, the learner's avatar once signed in. */
export function AuthButton() {
  const { user, status, sync } = useAuth();
  const [busy, setBusy] = useState(false);
  if (user) {
    const dot = sync === 'error' ? '#E0483E' : sync === 'syncing' ? '#FFC02E' : '#0B8A7A';
    return (
      <Link to="/profile" title={`${user.name} · ${sync === 'error' ? tr('Sync হয়নি', 'Not synced') : sync === 'syncing' ? tr('Sync হচ্ছে…', 'Syncing…') : tr('Cloud-এ সংরক্ষিত', 'Saved to the cloud')}`}
        className="relative flex h-10 items-center rounded-xl border-[2.5px] border-ink bg-white px-1.5 no-underline">
        <Avatar photo={user.photo} name={user.name} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white" style={{ background: dot }} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" disabled={busy || status === 'loading'}
      onClick={async () => { setBusy(true); await signInWithGoogle(); setBusy(false); }}
      className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border-[2.5px] border-ink bg-white px-3 font-bold disabled:cursor-wait disabled:opacity-60">
      <GoogleMark /> {busy || status === 'loading' ? tr('অপেক্ষা…', 'Wait…') : tr('Login', 'Sign in')}
    </button>
  );
}

/** Profile card: who is signed in, sync state, and sign out; or why to sign in. */
export function AccountCard() {
  const { user, sync, lastSyncedAt, error } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-[24px] border-[3px] border-ink bg-white p-6">
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
            <button type="button" onClick={() => void syncProgressNow()} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('এখনই sync করুন', 'Sync now')}</button>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); await signOutUser(); setBusy(false); }} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('Logout', 'Sign out')}</button>
          </div>
          <p className="m-0 text-xs text-muted">{tr('Logout করলেও এই browser-এর progress থেকে যায়।', 'Signing out keeps the progress in this browser.')}</p>
        </>
      ) : (
        <>
          <p className="m-0">{tr('Login ছাড়াও খেলা যায়, progress এই browser-এ থাকে। Google দিয়ে login করলে progress cloud-এ থাকবে আর ফোন, laptop সব জায়গায় একসাথে চলবে।', 'You can play without signing in; progress stays in this browser. Sign in with Google to keep it in the cloud and carry it across your phone and laptop.')}</p>
          <div><AuthButton /></div>
          {error && <p role="alert" className="m-0 text-sm text-coral-deep">{error}</p>}
        </>
      )}
    </section>
  );
}
