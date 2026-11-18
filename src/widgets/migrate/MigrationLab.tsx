import { useEffect, useMemo, useState } from 'react';
import { runPlan, SAFE_ORDER, scenarios, type Move, type Outcome, type Scenario } from '@/features/migrate/migrate';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { tr } from '@/shared/lib/i18n';
import { BookRefs } from '@/features/books/BookRefs';
import { levelRefs, migrationRefs } from '@/features/books/catalog';

const ALL: Move[] = ['expand', 'copy', 'verify', 'reads', 'writes', 'contract', 'downtime', 'bigbang'];
/** A fixed shuffle per scenario, so the safe order is never just top to bottom. */
const shuffled = (seed: string) => {
  let h = [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const out = [...ALL];
  for (let i = out.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [out[i], out[j]] = [out[j]!, out[i]!]; }
  return out;
};

/** Pick a live-migration scenario, order the steps, run it and see what happens to the data. */
export function MigrationLab() {
  const best = useProgress((s) => s.builds);
  const [open, setOpen] = useState<Scenario | null>(null);
  if (open) return <Session key={open.id} sc={open} onBack={() => setOpen(null)} />;
  return (
    <div className="keep-light light-board flex flex-col gap-4">
      <div className="rounded-[20px] border-[3px] border-ink bg-white p-5">
        <h2 className="m-0 font-display text-xl font-bold">{tr('চলন্ত system বদলান', 'Change a running system')}</h2>
        <p className="m-0 mt-1 max-w-[70ch] text-ink-soft">{tr('নতুন কিছু বানানো সহজ; কঠিন হলো লাখো user চালু রেখে পুরনোটা বদলানো। ধাপগুলো সাজান, চালান, দেখুন data হারাল কি না, app বন্ধ হলো কি না, আর ভুল হলে ফেরার পথ ছিল কি না।', 'Building something new is easy; the hard part is changing the old while millions of users keep going. Order the steps, run them, and see whether data was lost, the app went down, or there was a way back if it went wrong.')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {scenarios.map((s) => (
          <button key={s.id} type="button" onClick={() => setOpen(s)} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
            <span className="text-xs font-bold text-route-deep">Migration · Level {bn(s.level)}</span>
            <span className="font-display text-lg font-bold">{s.title}</span>
            <span className="text-sm text-ink-soft">{s.brief}</span>
            {best[`migrate:${s.id}`] !== undefined && <span className="mt-1 font-mono text-sm font-bold">{tr('সেরা:', 'Best:')} {bn(Math.round(best[`migrate:${s.id}`]! * 4))}/{bn(4)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Session({ sc, onBack }: { sc: Scenario; onBack: () => void }) {
  const record = useProgress((s) => s.recordBuild);
  const pool = useMemo(() => shuffled(sc.id), [sc.id]);
  const [plan, setPlan] = useState<Move[]>([]);
  const [result, setResult] = useState<Outcome | null>(null);
  const [shown, setShown] = useState(0);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!result || shown >= result.events.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setShown((n) => n + 1), reduced ? 0 : 650);
    return () => clearTimeout(t);
  }, [result, shown]);

  const edit = (f: (p: Move[]) => Move[]) => { setPlan(f); setResult(null); setShown(0); };
  const run = () => {
    const r = runPlan(plan);
    setResult(r); setShown(0);
    record(`migrate:${sc.id}`, r.score / 4);
    play(r.score === 4 ? 'level' : r.lostData ? 'wrong' : 'mission');
  };
  const done = result && shown >= result.events.length;

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start cursor-pointer rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">{tr('← সব migration', '← All migrations')}</button>
      <div>
        <p className="m-0 text-xs font-bold text-route-deep">Migration · Level {bn(sc.level)}</p>
        <h2 className="m-0 font-display text-[26px] font-extrabold">{sc.title}</h2>
        <p className="m-0 mt-1 max-w-[70ch]">{sc.brief}</p>
        <BookRefs refs={[...migrationRefs, ...(levelRefs[sc.level] ?? []).filter((r) => r.book === 'ddia2').slice(0, 1)]} className="mt-3 max-w-[560px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label={tr('ধাপগুলো', 'Steps')} className="flex flex-col gap-2 rounded-[20px] border-[3px] border-ink bg-white p-4">
          <h3 className="m-0 font-display text-lg font-bold">{tr('ধাপ বাছুন', 'Pick steps')}</h3>
          <p className="m-0 text-xs text-muted">{tr('Click করলে plan-এ যোগ হয়। সব ধাপ লাগবে না, কিছু ফাঁদও আছে।', 'Click to add to the plan. You will not need every step; some are traps.')}</p>
          {pool.map((m) => {
            const used = plan.includes(m);
            return (
              <button key={m} type="button" disabled={used} onClick={() => { edit((p) => [...p, m]); play('tap'); }}
                className="btn-press min-h-12 cursor-pointer rounded-xl border-2 border-ink bg-[#F7F8F3] px-3 py-2 text-left font-[inherit] text-[15px] font-semibold disabled:cursor-default disabled:opacity-35">
                + {sc.steps[m]}
              </button>
            );
          })}
        </section>
        <section aria-label={tr('আপনার plan', 'Your plan')} className="flex flex-col gap-2 rounded-[20px] border-[3px] border-ink bg-white p-4">
          <h3 className="m-0 font-display text-lg font-bold">{tr('আপনার plan', 'Your plan')}</h3>
          {plan.length === 0 && <p className="m-0 text-sm text-muted">{tr('বাঁ দিক থেকে ধাপ যোগ করুন, ক্রম ঠিক করুন।', 'Add steps from the left and put them in order.')}</p>}
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {plan.map((m, i) => {
              const ev = result && i < shown ? result.events.filter((e) => e.move === m)[0] : undefined;
              return (
                <li key={m} className={`flex flex-col gap-1 rounded-xl border-2 border-ink px-3 py-2 ${ev ? (ev.tone === 'good' ? 'bg-route-soft' : ev.tone === 'warn' ? 'bg-parcel-soft' : 'bg-coral-soft') : 'bg-white'}`}>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold">{bn(i + 1)}.</span>
                    <span className="min-w-0 flex-1 font-semibold">{sc.steps[m]}</span>
                    {!result && (
                      <span className="flex flex-none gap-1">
                        <button type="button" aria-label={tr('উপরে', 'Move up')} disabled={i === 0} onClick={() => edit((p) => { const n = [...p]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; return n; })} className="h-8 w-8 cursor-pointer rounded-lg border-2 border-ink bg-white disabled:opacity-30">↑</button>
                        <button type="button" aria-label={tr('নিচে', 'Move down')} disabled={i === plan.length - 1} onClick={() => edit((p) => { const n = [...p]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; return n; })} className="h-8 w-8 cursor-pointer rounded-lg border-2 border-ink bg-white disabled:opacity-30">↓</button>
                        <button type="button" aria-label={tr('বাদ দিন', 'Remove')} onClick={() => edit((p) => p.filter((x) => x !== m))} className="h-8 w-8 cursor-pointer rounded-lg border-2 border-ink bg-white">✕</button>
                      </span>
                    )}
                  </div>
                  {ev && <p className="pop-in m-0 text-sm">{ev.text}</p>}
                </li>
              );
            })}
          </ol>
          {!result
            ? <button type="button" disabled={!plan.length} onClick={run} className="btn-press mt-1 min-h-[50px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_4px_0_#16252D] disabled:cursor-not-allowed disabled:opacity-50">{tr('Migration চালান', 'Run the migration')}</button>
            : <button type="button" onClick={() => { setResult(null); setShown(0); }} className="mt-1 min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white font-semibold">{tr('Plan বদলান', 'Change the plan')}</button>}
        </section>
      </div>
      {done && result && (
        <section className="pop-in flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-white p-5" aria-live="polite">
          <h3 className="m-0 font-display text-2xl font-extrabold">{tr('ফল', 'Result')}: {bn(result.score)}/{bn(4)}</h3>
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {[
              [result.finished, tr('Migration শেষ', 'Migration finished')],
              [!result.lostData, tr('কোনো data হারায়নি', 'No data lost')],
              [result.downtime === 0, result.downtime ? tr(`App ${bn(result.downtime)} মিনিট বন্ধ`, `App down ${result.downtime} minutes`) : tr('App এক মিনিটও বন্ধ হয়নি', 'App never went down')],
              [result.rollbackSafe, tr('সরানোর আগে যাচাই, ফেরার পথ খোলা', 'Checked before moving; a way back stayed open')],
            ].map(([ok, label]) => <li key={String(label)} className={`rounded-lg px-3 py-2 font-semibold ${ok ? 'bg-route-soft' : 'bg-coral-soft'}`}>{ok ? '✓' : '✕'} {label}</li>)}
          </ul>
          {result.events.filter((e) => !plan.includes(e.move) || e.text.includes('শেষ হয়নি') || e.text.includes('not finished')).slice(-1).map((e) => <p key="tail" className="m-0 text-sm text-ink-soft">{e.text}</p>)}
          {result.score < 4 && (reveal
            ? <div className="rounded-xl border-2 border-dashed border-ink p-3"><p className="m-0 text-sm font-bold">{tr('নিরাপদ ক্রম (expand → contract):', 'The safe order (expand → contract):')}</p><ol className="m-0 mt-1 pl-5 text-sm">{SAFE_ORDER.map((m) => <li key={m}>{sc.steps[m]}</li>)}</ol></div>
            : <button type="button" onClick={() => setReveal(true)} className="self-start cursor-pointer text-sm font-semibold text-route-deep underline">{tr('নিরাপদ ক্রমটা দেখুন', 'Show the safe order')}</button>)}
        </section>
      )}
    </div>
  );
}
