import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { chapters, levelsById } from '@/content/levels';
import { masteryOf, readiness, streak, totalXp } from '@/entities/progress/selectors';
import { exportProgress, useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { masteryLabel, type Mastery } from '@/shared/lib/scoring';
import { AppShell } from '@/shared/ui/AppShell';
import { tr } from '@/shared/lib/i18n';
import { AccountCard } from '@/features/auth/AuthUi';
import { replaceCloudWithLocal, useAuth } from '@/features/auth/auth';

const MASTERY_COLOR: Record<Mastery, string> = { none: '#EEF1EA', seen: '#FFE9C7', understood: '#FFC02E', skilled: '#3FB37A', solid: '#0B8A7A' };

export function ProfilePage() {
  const p = useProgress();
  const { setUnlockAll, importData, reset } = p;
  const r = readiness(p);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const played = Object.keys(p.levels).length;
  const passed = Object.values(p.levels).filter((l) => l.best >= 50).length;
  const reviews = Object.values(p.cards).reduce((s, c) => s + c.reviews, 0);

  const download = () => {
    const blob = new Blob([exportProgress(p)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `parcelgo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const C = 2 * Math.PI * 52;
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1080px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <section className="grid items-center gap-6 rounded-[24px] border-[3px] border-ink bg-white p-6 shadow-block sm:grid-cols-[auto_1fr]">
          <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label={`Interview readiness ${bn(r.total)}%`}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#E3E8DE" strokeWidth="14" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="#0B8A7A" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(C * r.total) / 100} ${C}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 1s' }} />
            <text x="60" y="58" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700" fontSize="28" fill="#16252D">{bn(r.total)}%</text>
            <text x="60" y="80" textAnchor="middle" fontSize="11" fill="#4A5A62">Readiness</text>
          </svg>
          <div className="min-w-0">
            <h1 className="m-0 font-display text-[30px] font-extrabold">{tr('Interview-এর জন্য কতটা তৈরি', 'How ready you are for the interview')}</h1>
            <p className="m-0 mt-1 text-ink-soft">{tr('Plan-এর ওজন ধরে। যে অংশ এখনো তৈরি হয়নি সেটা আপাতত ০।', 'Weighted as in the plan.')}</p>
            <div className="mt-4 grid gap-2.5">
              {r.parts.map((x) => (
                <div key={x.id} className={x.available ? '' : 'opacity-50'}>
                  <div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{x.label} <span className="font-normal text-muted">· {x.note}</span></span><span className="font-mono">{bn(Math.round(x.weight * x.score))}/{bn(x.weight)}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-locked"><div className="h-full rounded-full bg-route" style={{ width: `${x.score * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [tr('XP', 'XP'), bn(totalXp(p))], [tr('টানা দিন', 'Day streak'), bn(streak(p))], [tr('Level পাস', 'Levels passed'), `${bn(passed)}/${bn(30)}`], [tr('Review দিয়েছেন', 'Reviews done'), bn(reviews)],
            [tr('Level খেলেছেন', 'Levels played'), bn(played)], [tr('Estimation নির্ভুলতা', 'Estimation accuracy'), p.estimation.attempts ? `${bn(Math.round((p.estimation.correct / p.estimation.attempts) * 100))}%` : '—'], ['Design challenge', bn(p.design.length)], [tr('মুখে বলা', 'Speak aloud'), bn(p.speak.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border-[2.5px] border-ink bg-white p-4">
              <div className="text-sm text-muted">{k}</div>
              <div className="font-mono text-2xl font-bold">{v}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[24px] border-[3px] border-ink bg-white p-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 font-display text-xl font-bold">{tr('৩০ level-এর দখল', 'Mastery of the 30 levels')}</h2>
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0 text-xs">
              {(Object.keys(MASTERY_COLOR) as Mastery[]).map((m) => <li key={m} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-ink" style={{ background: MASTERY_COLOR[m] }} />{masteryLabel[m]}</li>)}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            {chapters.map((c) => (
              <div key={c.id}>
                <div className="mb-1 text-sm font-semibold">{tr('অধ্যায়', 'Chapter')} {bn(c.id)} · {c.title}</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {c.levels.map((id) => {
                    const m = masteryOf(id, p);
                    return (
                      <Link key={id} to="/level/$levelId" params={{ levelId: String(id) }} title={`${levelsById[id]!.title} · ${masteryLabel[m]}`}
                        className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-ink text-ink no-underline" style={{ background: MASTERY_COLOR[m], color: m === 'solid' ? '#FFFFFF' : '#16252D' }}>
                        <span className="font-display text-xl font-extrabold leading-none">{bn(id)}</span>
                        <span className="font-mono text-[11px]">{p.levels[id] ? bn(p.levels[id]!.best) : ''}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <AccountCard />

        <section className="flex flex-col gap-4 rounded-[24px] border-[3px] border-ink bg-white p-6">
          <h2 className="m-0 font-display text-xl font-bold">{tr('Setting আর data', 'Settings and data')}</h2>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={p.settings.unlockAll} onChange={(e) => setUnlockAll(e.target.checked)} className="h-5 w-5" />
            <span><strong>{tr('সব level খুলে দিন', 'Unlock every level')}</strong> <span className="text-sm text-muted">{tr('· ক্রম না মেনে যেকোনো level খেলতে (নিজের জানা অংশ বাদ দিতে)', '· play any level out of order (to skip what you already know)')}</span></span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={download} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">Progress download (JSON)</button>
            <button type="button" onClick={() => file.current?.click()} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('File থেকে ফেরত আনুন', 'Restore from a file')}</button>
            <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { setMsg(importData(JSON.parse(await f.text())) ? tr('Progress ফেরত আনা হয়েছে।', 'Progress restored.') : tr('এটা ParcelGo-র progress file মনে হচ্ছে না।', 'This does not look like a ParcelGo progress file.')); }
              catch { setMsg(tr('File পড়া গেল না।', 'Could not read the file.')); }
              e.target.value = '';
            }} />
            {!confirmReset
              ? <button type="button" onClick={() => setConfirmReset(true)} className="min-h-12 cursor-pointer rounded-xl border-2 border-coral bg-white px-4 font-semibold text-coral-deep">{tr('সব মুছে নতুন করে', 'Wipe everything and start over')}</button>
              : <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-coral-deep">{tr('নিশ্চিত? সব নম্বর আর review মুছে যাবে।', 'Sure? Every score and review will be deleted.')}</span>
                  <button type="button" onClick={() => { reset(); if (useAuth.getState().user) void replaceCloudWithLocal(); setConfirmReset(false); setMsg(tr('সব মুছে ফেলা হয়েছে।', 'Everything has been deleted.')); }} className="min-h-12 cursor-pointer rounded-xl border-2 border-coral bg-coral px-4 font-semibold text-white">{tr('হ্যাঁ, মুছুন', 'Yes, delete')}</button>
                  <button type="button" onClick={() => setConfirmReset(false)} className="min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('না', 'No')}</button></span>}
          </div>
          {msg && <p role="status" className="m-0 font-semibold text-route-deep">{msg}</p>}
          <p className="m-0 text-sm text-muted">{tr('Login না করলে সব data শুধু এই browser-এ থাকে। Login করলে cloud-এও থাকে।', 'Without signing in, all data lives only in this browser. Signed in, it is also kept in the cloud.')}</p>
        </section>
      </main>
    </AppShell>
  );
}
