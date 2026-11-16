import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { incidents, type Incident, type Series } from '@/features/incident/incidents';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { shuffledOrder } from '@/shared/lib/scoring';
import { play } from '@/shared/lib/sound';
import { AppShell } from '@/shared/ui/AppShell';
import { tr } from '@/shared/lib/i18n';

/** Incident mode: read the dashboard and logs, then make three calls under pressure. */
export function IncidentPage() {
  const best = useProgress((s) => s.incidents);
  const [open, setOpen] = useState<Incident | null>(null);
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1040px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {open ? <Run key={open.id} inc={open} onBack={() => setOpen(null)} /> : (
          <>
            <div>
              <p className="m-0 text-sm font-bold text-coral-deep">Incident mode</p>
              <h1 className="m-0 font-display text-[32px] font-extrabold">{tr('রাত ৩টার pager', 'The 3 a.m. pager')}</h1>
              <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">{tr('Production-এ alert বাজছে। Dashboard আর log পড়ে তিনটা সিদ্ধান্ত: কোথায় তাকাবেন, কারণ কী, কী করবেন। প্রথম চেষ্টায় ঠিক হলে পূর্ণ নম্বর।', 'An alert is firing in production. Read the dashboard and logs, then make three calls: where to look, what the cause is, what to do. Full marks for getting it first time.')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {incidents.map((inc) => {
                const b = best[inc.id];
                return (
                  <button key={inc.id} type="button" onClick={() => setOpen(inc)} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
                    <span className="flex w-full items-center justify-between gap-2 text-xs font-bold">
                      <span className={`rounded-md px-2 py-0.5 text-white ${inc.severity === 'SEV-1' ? 'bg-coral' : 'bg-[#B8730A]'}`}>{inc.severity}</span>
                      <span className="text-route-deep">{tr(`Level ${bn(inc.level)}-এর বিষয়`, `Topic of level ${inc.level}`)}</span>
                    </span>
                    <span className="font-display text-lg font-bold">{inc.title}</span>
                    <span className="text-sm text-ink-soft">{inc.alert}</span>
                    {b !== undefined && <span className="mt-1 font-mono text-sm font-bold">{tr('সেরা:', 'Best:')} {bn(Math.round(b * 100))}%</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}

function Spark({ s }: { s: Series }) {
  const max = Math.max(...s.values), min = Math.min(0, ...s.values);
  const pts = s.values.map((v, i) => `${(i / (s.values.length - 1)) * 100},${36 - ((v - min) / (max - min || 1)) * 32}`).join(' ');
  const last = s.values[s.values.length - 1]!;
  return (
    <div className={`rounded-2xl border-[2.5px] border-ink p-3 ${s.bad ? 'bg-coral-soft' : 'bg-white'}`}>
      <div className="flex items-baseline justify-between gap-2 text-xs font-semibold"><span>{s.label}</span><span className="font-mono text-sm font-bold">{bn(String(last), { grouping: false })}{s.unit}</span></div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-1 block h-14 w-full" aria-label={`${s.label}: ${s.values.join(', ')}`} role="img">
        <polyline points={pts} fill="none" stroke={s.bad ? '#E0483E' : '#0B8A7A'} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted"><span>{tr('১ ঘণ্টা আগে', '1 hour ago')}</span><span>{tr('এখন', 'now')}</span></div>
    </div>
  );
}

function Run({ inc, onBack }: { inc: Incident; onBack: () => void }) {
  const record = useProgress((s) => s.recordIncident);
  const [stage, setStage] = useState(0);
  const [tries, setTries] = useState<number[][]>([[], [], []]);
  const [solved, setSolved] = useState(false);
  const st = inc.stages[Math.min(stage, 2)]!;
  const order = useMemo(() => shuffledOrder(`${inc.id}-${stage}`, 4), [inc.id, stage]);
  const finished = stage >= 3;
  const points: number[] = tries.map((t) => (t[0] === 0 ? 1 : t.length === 2 && t[1] === 0 ? 0.5 : 0));
  const total = points.reduce((a, b) => a + b, 0);

  const pick = (i: number) => {
    if (solved || tries[stage]!.includes(i)) return;
    const next = tries.map((t, k) => (k === stage ? [...t, i] : t));
    setTries(next);
    if (i === 0) { setSolved(true); play('right'); } else play('wrong');
  };
  const advance = () => {
    const n = stage + 1;
    setStage(n); setSolved(false);
    if (n === 3) { const score = tries.reduce((s, t) => s + (t[0] === 0 ? 1 : t.length >= 2 && t[1] === 0 ? 0.5 : 0), 0) / 3; record(inc.id, score); play(score >= 0.5 ? 'level' : 'wrong'); }
  };
  const failedOut = !solved && tries[stage] && tries[stage]!.length >= 2;

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start cursor-pointer rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">{tr('← সব incident', '← All incidents')}</button>
      <div className={`rounded-[20px] border-[3px] border-ink p-4 text-white shadow-[0_5px_0_#16252D] ${finished ? 'bg-route' : 'bg-coral'}`} role="alert">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          {!finished && <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-white" />}
          {finished ? 'Resolved' : `${inc.severity} · alert`}
        </div>
        <div className="mt-1 font-display text-xl font-extrabold">{inc.title}</div>
        <p className="m-0">{inc.alert}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{inc.series.map((s) => <Spark key={s.label} s={s} />)}</div>
      <pre className="m-0 overflow-x-auto rounded-2xl border-[2.5px] border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-[#C9F5D9]">{inc.logs.join('\n')}</pre>

      {!finished ? (
        <section className="pop-in flex flex-col gap-3 rounded-[22px] border-[3px] border-ink bg-white p-5 shadow-[0_5px_0_#16252D]" key={stage}>
          <div className="text-sm font-bold text-route-deep">{tr('সিদ্ধান্ত', 'Decision')} {bn(stage + 1)}/{bn(3)} · {[tr('কোথায় তাকাবেন', 'Where to look'), tr('কারণ', 'Cause'), tr('সমাধান', 'Fix')][stage]}</div>
          <h2 className="m-0 font-display text-xl font-bold">{st.prompt}</h2>
          <div className="flex flex-col gap-2">
            {order.map((i) => {
              const tried = tries[stage]!.includes(i);
              const right = tried && i === 0;
              return (
                <button key={i} type="button" disabled={solved || tried || !!failedOut} onClick={() => pick(i)}
                  className={`min-h-[52px] cursor-pointer rounded-xl border-2 px-4 py-2 text-left font-[inherit] text-[16px] disabled:cursor-default ${right ? 'border-route bg-route-soft font-semibold' : tried ? 'shake-x border-coral bg-coral-soft line-through' : failedOut && i === 0 ? 'border-route bg-route-soft' : 'border-ink bg-white'}`}>
                  {st.options[i]}
                </button>
              );
            })}
          </div>
          {(solved || failedOut) && (
            <div className="pop-in rounded-xl bg-[#F0F2EC] p-3">
              <p className="m-0">{st.explain}</p>
              <button type="button" onClick={advance} className="btn-press mt-3 min-h-[50px] w-full cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-lg font-extrabold shadow-[0_4px_0_#16252D]">{stage < 2 ? tr('পরের সিদ্ধান্ত →', 'Next decision →') : tr('Incident বন্ধ করুন', 'Close the incident')}</button>
            </div>
          )}
          {!solved && !failedOut && tries[stage]!.length === 1 && <p className="m-0 text-sm font-semibold text-coral-deep">{tr('হয়নি। আরেকবার চেষ্টা করুন (অর্ধেক নম্বর)।', 'Not quite. Try once more (half marks).')}</p>}
        </section>
      ) : (
        <section className="pop-in flex flex-col gap-3 rounded-[22px] border-[3px] border-ink bg-white p-5 shadow-[0_5px_0_#16252D]">
          <h2 className="m-0 font-display text-2xl font-extrabold">Postmortem</h2>
          <ol className="m-0 flex flex-col gap-2 pl-5">
            {inc.stages.map((s, i) => <li key={i}><b>{s.options[0]}</b> <span className="font-mono text-sm">({bn(points[i]!, { grouping: false })}/{bn(1)})</span><br /><span className="text-sm text-ink-soft">{s.explain}</span></li>)}
          </ol>
          <p className="m-0 font-mono text-xl font-bold">{bn(Math.round((total / 3) * 100))}%</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/level/$levelId" params={{ levelId: String(inc.level) }} className="rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold text-ink no-underline">{tr(`Level ${bn(inc.level)} আবার দেখুন`, `Revisit level ${inc.level}`)}</Link>
            <button type="button" onClick={onBack} className="cursor-pointer rounded-xl border-2 border-ink bg-parcel px-4 py-2 font-bold">{tr('পরের incident', 'Next incident')}</button>
          </div>
        </section>
      )}
    </div>
  );
}
