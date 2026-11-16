import { useEffect, useState } from 'react';
import { designPrompts, designRubric, type DesignPrompt } from '@/features/practice/prompts';
import { followUps, mockPhases } from '@/features/mock/script';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { AppShell } from '@/shared/ui/AppShell';

const TOTAL_MIN = mockPhases.reduce((s, p) => s + p.minutes, 0);
const mmss = (s: number) => `${bn(Math.floor(Math.abs(s) / 60))}:${bn(String(Math.abs(s) % 60).padStart(2, '0'), { grouping: false })}`;
const EXTRA = ['প্রতিটা ধাপ মোটামুটি সময়ের মধ্যে শেষ করেছি', 'Interviewer-এর প্রতিটা প্রশ্নের উত্তর দিয়েছি'] as const;
const RUBRIC = [...designRubric, ...EXTRA];

/** A 45-minute mock interview: one prompt, five timed phases, an interviewer script, then self-scoring. */
export function MockPage() {
  const history = useProgress((s) => s.design.filter((d) => d.promptId.startsWith('mock:')));
  const record = useProgress((s) => s.recordDesign);
  const [prompt, setPrompt] = useState<DesignPrompt | null>(null);
  const [phase, setPhase] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [phaseAt, setPhaseAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState<string[]>(mockPhases.map(() => ''));
  const [checks, setChecks] = useState<boolean[]>(RUBRIC.map(() => false));
  const [saved, setSaved] = useState(false);
  const scoring = phase >= mockPhases.length;

  useEffect(() => {
    if (!prompt || scoring) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [prompt, scoring]);

  const start = (p: DesignPrompt) => { const t = Date.now(); setPrompt(p); setPhase(0); setStartedAt(t); setPhaseAt(t); setNow(t); setNotes(mockPhases.map(() => '')); setChecks(RUBRIC.map(() => false)); setSaved(false); };
  const random = () => start(designPrompts[Math.floor(Math.random() * designPrompts.length)]!);
  const next = () => { setPhase((p) => p + 1); setPhaseAt(Date.now()); };

  if (!prompt) {
    return (
      <AppShell>
        <main className="mx-auto box-border flex max-w-[960px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
          <div>
            <p className="m-0 text-sm font-bold text-route-deep">Mock interview</p>
            <h1 className="m-0 font-display text-[32px] font-extrabold">{bn(TOTAL_MIN)} মিনিটের মহড়া</h1>
            <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">আসল interview-এর মতো পাঁচটা ধাপ, প্রতিটার নিজের সময়। Interviewer-এর প্রশ্ন পর্দায় আসবে; জোরে বলুন, কাগজে আঁকুন, মূল কথা এখানে লিখুন। শেষে নিজে নম্বর দিন।</p>
          </div>
          <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-5">
            {mockPhases.map((p, i) => (
              <li key={p.id} className="rounded-2xl border-2 border-ink bg-white p-3">
                <div className="text-xs font-bold text-muted">ধাপ {bn(i + 1)}</div>
                <div className="font-display font-bold">{p.title}</div>
                <div className="font-mono text-sm">{bn(p.minutes)} মিনিট</div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={random} className="btn-press min-h-[58px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-[22px] font-extrabold shadow-[0_5px_0_#16252D]">অজানা প্রশ্ন দিয়ে শুরু করুন</button>
          <details className="rounded-2xl border-2 border-ink bg-white p-4">
            <summary className="cursor-pointer font-bold">নিজে প্রশ্ন বাছবেন?</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {designPrompts.map((p) => (
                <button key={p.id} type="button" onClick={() => start(p)} className="cursor-pointer rounded-xl border-2 border-ink bg-white p-3 text-left font-[inherit]">
                  <span className="block font-bold">{p.title}</span>
                  <span className="block text-sm text-muted">{p.prompt}</span>
                </button>
              ))}
            </div>
          </details>
          {history.length > 0 && (
            <section className="rounded-2xl border-2 border-ink bg-white p-4">
              <h2 className="m-0 mb-2 font-display text-lg font-bold">আগের mock</h2>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                {[...history].reverse().slice(0, 8).map((h, i) => (
                  <li key={i} className="flex justify-between gap-3"><span>{designPrompts.find((p) => `mock:${p.id}` === h.promptId)?.title ?? h.promptId}</span><span className="font-mono">{bn(h.score)}/{bn(h.max)} · {bn(h.minutes)} মি</span></li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </AppShell>
    );
  }

  const elapsed = Math.floor((now - startedAt) / 1000);
  const ph = mockPhases[Math.min(phase, mockPhases.length - 1)]!;
  const phaseLeft = ph.minutes * 60 - Math.floor((now - phaseAt) / 1000);
  const asks = ph.id === 'deep' ? followUps[prompt.id] ?? [] : ph.ask;
  const score = checks.filter(Boolean).length;

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[960px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-bold text-route-deep">Mock interview · Level {bn(prompt.level)}-এর বিষয়</p>
            <h1 className="m-0 font-display text-[28px] font-extrabold leading-tight">{prompt.title}</h1>
            <p className="m-0 mt-1 text-[17px]">{prompt.prompt}</p>
          </div>
          <div className="rounded-2xl border-[3px] border-ink bg-white px-4 py-2 text-right">
            <div className="text-xs font-semibold text-muted">মোট</div>
            <div className="font-mono text-2xl font-bold">{mmss(elapsed)} / {bn(TOTAL_MIN)}:০০</div>
          </div>
        </div>

        <ol className="m-0 flex list-none gap-1.5 p-0" aria-label="ধাপ">
          {mockPhases.map((p, i) => (
            <li key={p.id} className={`h-2.5 flex-1 rounded-full border-2 border-ink ${i < phase ? 'bg-route' : i === phase ? 'bg-parcel' : 'bg-white'}`} title={p.title} />
          ))}
        </ol>

        {!scoring ? (
          <section key={ph.id} className="pop-in flex flex-col gap-4 rounded-[22px] border-[3px] border-ink bg-white p-5 shadow-[0_5px_0_#16252D]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 font-display text-2xl font-extrabold">ধাপ {bn(phase + 1)} · {ph.title}</h2>
              <div role="timer" className={`rounded-xl border-[3px] border-ink px-3 py-1 font-mono text-2xl font-bold ${phaseLeft < 0 ? 'bg-coral text-white' : phaseLeft < 60 ? 'bg-parcel' : 'bg-parcel-soft'}`}>{phaseLeft < 0 ? '+' : ''}{mmss(phaseLeft)}</div>
            </div>
            <div className="rounded-2xl bg-ink p-4 text-white">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#C9D6DC]">Interviewer</div>
              <ul className="m-0 flex flex-col gap-2 pl-5 text-[17px]">
                {asks.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
            <label className="flex flex-col gap-1 font-semibold">
              আপনার মূল কথা
              <textarea value={notes[phase]} onChange={(e) => setNotes(notes.map((n, i) => (i === phase ? e.target.value : n)))} rows={7} className="rounded-xl border-2 border-ink p-3 font-[inherit] text-base font-normal" />
            </label>
            <button type="button" onClick={next} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-xl font-extrabold shadow-[0_5px_0_#16252D]">
              {phase < mockPhases.length - 1 ? `পরের ধাপ: ${mockPhases[phase + 1]!.title} →` : 'শেষ, নম্বর দিই →'}
            </button>
          </section>
        ) : (
          <section className="pop-in flex flex-col gap-4 rounded-[22px] border-[3px] border-ink bg-white p-5 shadow-[0_5px_0_#16252D]">
            <h2 className="m-0 font-display text-2xl font-extrabold">নিজে নম্বর দিন</h2>
            <p className="m-0 text-ink-soft">মোট সময় {mmss(elapsed)}। সৎভাবে টিক দিন; এই নম্বর আপনার interview readiness-এ যাবে।</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {RUBRIC.map((r, i) => (
                <li key={r}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-ink px-3">
                    <input type="checkbox" checked={checks[i]} onChange={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))} className="h-5 w-5 accent-[#0B8A7A]" />
                    {r}
                  </label>
                </li>
              ))}
            </ul>
            <details className="rounded-xl border-2 border-dashed border-ink p-3">
              <summary className="cursor-pointer font-bold">আমার নোট</summary>
              {mockPhases.map((p, i) => notes[i] ? <div key={p.id} className="mt-2"><b>{p.title}:</b> <span className="whitespace-pre-wrap">{notes[i]}</span></div> : null)}
            </details>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-bold">{bn(score)}/{bn(RUBRIC.length)}</span>
              <button type="button" disabled={saved} onClick={() => { record({ promptId: `mock:${prompt.id}`, score, max: RUBRIC.length, minutes: Math.round(elapsed / 60), notes: mockPhases.map((p, i) => `${p.title}: ${notes[i]}`).join('\n'), at: new Date().toISOString() }); setSaved(true); }} className="btn-press min-h-[50px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-6 font-display text-lg font-extrabold shadow-[0_4px_0_#16252D] disabled:opacity-50">
                {saved ? 'রাখা হয়েছে ✓' : 'রেখে দিন'}
              </button>
              <button type="button" onClick={() => setPrompt(null)} className="min-h-[50px] cursor-pointer rounded-2xl border-2 border-ink bg-white px-5 font-bold">আরেকটা mock</button>
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
