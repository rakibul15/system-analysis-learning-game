import { useState } from 'react';
import { guidedProblems, STEP_MINUTES, STEP_TITLES, suggestCovered, type GuidedProblem } from '@/features/guided/problems';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { tr } from '@/shared/lib/i18n';

interface StepWork { answer: string; revealed: boolean; ticks: boolean[]; suggested: boolean[] }

/** Interview-shaped practice: five steps, write an answer, then mark it against a checklist and a model answer. */
export function GuidedPractice() {
  const history = useProgress((s) => s.design);
  const [problem, setProblem] = useState<GuidedProblem | null>(null);
  if (problem) return <Session key={problem.id} problem={problem} onExit={() => setProblem(null)} />;
  const best = (id: string) => {
    const runs = history.filter((d) => d.promptId === `guided:${id}`);
    return runs.length ? Math.max(...runs.map((r) => r.score / r.max)) : null;
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[20px] border-[3px] border-ink bg-surface p-5">
        <h2 className="m-0 font-display text-xl font-bold">{tr('ধাপে ধাপে design', 'Step-by-step design')}</h2>
        <p className="m-0 mt-1 max-w-[70ch] text-ink-soft">{tr('আসল interview-এর ক্রমে: প্রয়োজন → হিসাব → API আর data → high-level → deep dive। প্রতিটা ধাপে আগে নিজে লিখুন, তারপর checklist আর model answer-এর সাথে মেলান। বাংলা, English বা মিশিয়ে লিখুন।', 'In real interview order: requirements → estimation → API and data → high-level → deep dive. At each step write your own answer first, then compare it with a checklist and a model answer. Write in Bangla, English or a mix.')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {guidedProblems.map((p) => {
          const b = best(p.id);
          return (
            <button key={p.id} type="button" onClick={() => setProblem(p)} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-[18px] border-[2.5px] border-ink bg-surface p-4 text-left font-[inherit] shadow-[0_4px_0_var(--color-shadow)]">
              <span className="text-xs font-bold text-route-deep">Level {bn(p.level)} · ~{bn(Object.values(STEP_MINUTES).reduce((a, x) => a + x, 0))} {tr('মিনিট', 'min')}</span>
              <span className="font-display text-lg font-bold">{p.title}</span>
              <span className="text-sm text-ink-soft">{p.brief}</span>
              {b !== null && <span className="mt-1 font-mono text-sm font-bold">{tr('সেরা:', 'Best:')} {bn(Math.round(b * 100))}%</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Session({ problem, onExit }: { problem: GuidedProblem; onExit: () => void }) {
  const record = useProgress((s) => s.recordDesign);
  const [k, setK] = useState(0);
  const [startedAt] = useState(Date.now());
  const [work, setWork] = useState<StepWork[]>(() => problem.steps.map((s) => ({ answer: '', revealed: false, ticks: s.items.map(() => false), suggested: s.items.map(() => false) })));
  const [hint, setHint] = useState(false);
  const [saved, setSaved] = useState(false);
  const finished = k >= problem.steps.length;

  const update = (i: number, f: (w: StepWork) => StepWork) => setWork((ws) => ws.map((w, j) => (j === i ? f(w) : w)));
  const reveal = () => {
    const step = problem.steps[k]!;
    update(k, (w) => { const sug = suggestCovered(w.answer, step.items); return { ...w, revealed: true, suggested: sug, ticks: sug }; });
    play('tap');
  };
  const covered = work.reduce((s, w) => s + w.ticks.filter(Boolean).length, 0);
  const total = problem.steps.reduce((s, st) => s + st.items.length, 0);

  const finish = () => {
    if (saved) return;
    record({ promptId: `guided:${problem.id}`, score: covered, max: total, minutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)), notes: work.map((w, i) => `${STEP_TITLES[problem.steps[i]!.id]}: ${w.answer}`).join('\n\n').slice(0, 4000), at: new Date().toISOString() });
    setSaved(true);
    play(covered / total >= 0.7 ? 'level' : 'mission');
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onExit} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-surface px-4 font-bold">{tr('← সব সমস্যা', '← All problems')}</button>
        <span className="font-mono text-sm font-bold">{tr('মিলেছে', 'Covered')} {bn(covered)}/{bn(total)}</span>
      </div>
      <div className="rounded-[20px] border-[3px] border-ink bg-surface p-5">
        <p className="m-0 text-xs font-bold text-route-deep">{problem.title}</p>
        <p className="m-0 mt-1">{problem.brief}</p>
      </div>
      <ol className="m-0 flex list-none gap-1.5 overflow-x-auto p-0" aria-label={tr('ধাপ', 'Steps')}>
        {problem.steps.map((s, i) => {
          const w = work[i]!;
          const state = i === k ? 'now' : w.revealed ? 'done' : 'todo';
          return (
            <li key={s.id} className="flex-none">
              <button type="button" disabled={!w.revealed && i > k} onClick={() => { setK(i); setHint(false); }} aria-current={i === k ? 'step' : undefined}
                className={`min-h-10 cursor-pointer whitespace-nowrap rounded-full border-2 border-ink px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${state === 'now' ? 'bg-ink text-white' : state === 'done' ? 'bg-route-soft' : 'bg-surface'}`}>
                {bn(i + 1)}. {STEP_TITLES[s.id]}
              </button>
            </li>
          );
        })}
        <li className="flex-none"><button type="button" disabled={!work.every((w) => w.revealed)} onClick={() => setK(problem.steps.length)} className={`min-h-10 cursor-pointer whitespace-nowrap rounded-full border-2 border-ink px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${finished ? 'bg-ink text-white' : 'bg-surface'}`}>{tr('ফল', 'Result')}</button></li>
      </ol>

      {!finished ? (() => {
        const step = problem.steps[k]!;
        const w = work[k]!;
        return (
          <div className="flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-display text-xl font-bold">{bn(k + 1)}. {STEP_TITLES[step.id]}</h2>
              <span className="text-sm text-muted">{tr(`interview-এ ~${bn(STEP_MINUTES[step.id])} মিনিট`, `~${STEP_MINUTES[step.id]} min in an interview`)}</span>
            </div>
            <p className="m-0 font-semibold">{step.ask}</p>
            {hint ? <p className="m-0 rounded-lg bg-parcel-soft px-3 py-2 text-sm">💡 {step.hint}</p> : <button type="button" onClick={() => setHint(true)} className="self-start cursor-pointer text-sm font-semibold text-route-deep underline">{tr('একটু ইঙ্গিত', 'A small hint')}</button>}
            <label className="flex flex-col gap-1 text-sm font-semibold">{tr('আপনার উত্তর', 'Your answer')}
              <textarea value={w.answer} onChange={(e) => update(k, (x) => ({ ...x, answer: e.target.value }))} rows={6} disabled={w.revealed}
                placeholder={tr('Interviewer-কে যা বলতেন, সেটাই লিখুন…', 'Write what you would say to the interviewer…')}
                className="rounded-xl border-2 border-ink p-3 font-[inherit] text-base font-normal disabled:bg-surface-sunk" />
            </label>
            {!w.revealed ? (
              <button type="button" onClick={reveal} disabled={w.answer.trim().length < 15} className="btn-press min-h-12 cursor-pointer self-start rounded-2xl border-[3px] border-ink bg-parcel px-6 font-display text-lg font-extrabold shadow-[0_4px_0_var(--color-shadow)] disabled:cursor-not-allowed disabled:opacity-50">{tr('মিলিয়ে দেখুন', 'Compare')}</button>
            ) : (
              <div className="pop-in flex flex-col gap-3">
                <div>
                  <h3 className="m-0 text-base font-bold">{tr('ভালো উত্তরে যা থাকে', 'What a good answer covers')}</h3>
                  <p className="m-0 text-xs text-muted">{tr('হলুদ দাগ = আপনার লেখায় এমন শব্দ পেয়েছি। আসলে বলেছেন কিনা নিজে ঠিক করুন।', 'Yellow mark = your answer has words like this. Decide yourself whether you really covered it.')}</p>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                    {step.items.map((it, j) => (
                      <li key={it.text}>
                        <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-3 py-2 ${w.ticks[j] ? 'bg-route-soft' : 'bg-surface-2'}`}>
                          <input type="checkbox" checked={w.ticks[j]} onChange={(e) => update(k, (x) => ({ ...x, ticks: x.ticks.map((t, m) => (m === j ? e.target.checked : t)) }))} className="mt-0.5 h-5 w-5 flex-none" />
                          <span className="min-w-0 flex-1">{it.text}</span>
                          {w.suggested[j] && <span className="flex-none rounded-full bg-parcel px-2 text-xs font-bold">{tr('পাওয়া গেছে', 'found')}</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-dashed border-ink p-3">
                  <h3 className="m-0 text-sm font-bold text-route-deep">Model answer</h3>
                  <p className="m-0 mt-1 leading-relaxed">{step.model}</p>
                </div>
                <button type="button" onClick={() => { setK(k + 1); setHint(false); }} className="btn-press min-h-12 cursor-pointer self-start rounded-2xl border-[3px] border-ink bg-ink px-6 font-bold text-white shadow-[0_4px_0_var(--color-parcel)]">
                  {k + 1 < problem.steps.length ? tr('পরের ধাপ →', 'Next step →') : tr('ফল দেখুন →', 'See the result →')}
                </button>
              </div>
            )}
          </div>
        );
      })() : (
        <div className="flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-surface p-5">
          <h2 className="m-0 font-display text-2xl font-extrabold">{tr('ফল', 'Result')}: {bn(Math.round((covered / total) * 100))}%</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {problem.steps.map((s, i) => {
              const got = work[i]!.ticks.filter(Boolean).length;
              const pct = got / s.items.length;
              return (
                <li key={s.id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm font-semibold"><span>{STEP_TITLES[s.id]}</span><span className="font-mono">{bn(got)}/{bn(s.items.length)}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-locked"><div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: pct >= 0.75 ? 'var(--color-route)' : pct >= 0.5 ? 'var(--color-parcel)' : 'var(--color-coral)' }} /></div>
                </li>
              );
            })}
          </ul>
          {(() => {
            const weakest = problem.steps.map((s, i) => ({ s, pct: work[i]!.ticks.filter(Boolean).length / s.items.length })).sort((a, b) => a.pct - b.pct)[0]!;
            return weakest.pct < 1 && <p className="m-0 rounded-lg bg-parcel-soft px-3 py-2">{tr(`সবচেয়ে দুর্বল ধাপ: ${STEP_TITLES[weakest.s.id]}। পরের বার এখানে বেশি সময় দিন।`, `Weakest step: ${STEP_TITLES[weakest.s.id]}. Spend more time here next time.`)}</p>;
          })()}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={finish} disabled={saved} className="btn-press min-h-12 cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-6 font-bold shadow-[0_4px_0_var(--color-shadow)] disabled:opacity-60">{saved ? tr('Save হয়েছে ✓', 'Saved ✓') : tr('ফল save করুন', 'Save the result')}</button>
            <button type="button" onClick={onExit} className="min-h-12 cursor-pointer rounded-2xl border-2 border-ink bg-surface px-5 font-semibold">{tr('অন্য সমস্যা', 'Another problem')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
