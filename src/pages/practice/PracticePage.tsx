import { Suspense, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { makeDrill, type DrillQuestion } from '@/features/estimation/generate';
import { designPrompts, designRubric, speakPrompts, speakRubric, type DesignPrompt, type SpeakPrompt } from '@/features/practice/prompts';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { AppShell } from '@/shared/ui/AppShell';
import { levelList } from '@/content/levels';
import type { SimulatorId } from '@/content/schema';
import { simulators } from '@/simulators/registry';

type Tab = 'estimation' | 'design' | 'speak' | 'lab';
const TABS: { id: Tab; label: string; note: string }[] = [
  { id: 'estimation', label: 'Estimation drill', note: '১০টা হিসাব, প্রতিটায় ৩০ সেকেন্ড' },
  { id: 'design', label: 'Design challenge', note: 'খোলা প্রশ্ন, timer, নিজের rubric' },
  { id: 'speak', label: 'মুখে বলা', note: '২ মিনিটে একটা ধারণা জোরে বলা' },
  { id: 'lab', label: 'Simulator lab', note: 'যেকোনো simulator আবার খেলুন' },
];

export function PracticePage() {
  const [tab, setTab] = useState<Tab>('estimation');
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[960px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <div>
          <p className="m-0 text-sm font-bold text-route-deep">Practice</p>
          <h1 className="m-0 font-display text-[32px] font-extrabold">Interview-এর পেশি</h1>
        </div>
        <div role="tablist" aria-label="Practice-এর ধরন" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`flex min-h-[64px] flex-[1_1_200px] cursor-pointer flex-col items-start justify-center rounded-2xl border-[2.5px] border-ink px-4 text-left font-[inherit] ${tab === t.id ? 'bg-ink text-white shadow-[0_4px_0_#FFC02E]' : 'bg-white text-ink'}`}>
              <span className="font-display text-lg font-bold">{t.label}</span>
              <span className={`text-sm ${tab === t.id ? 'text-[#C9D6DC]' : 'text-muted'}`}>{t.note}</span>
            </button>
          ))}
        </div>
        {tab === 'estimation' && <EstimationDrill />}
        {tab === 'design' && <DesignChallenge />}
        {tab === 'speak' && <SpeakAloud />}
        {tab === 'lab' && <SimulatorLab />}
      </main>
    </AppShell>
  );
}

/* ---------- estimation ---------- */

const PER_Q = 30;

function EstimationDrill() {
  const record = useProgress((s) => s.recordEstimationRound);
  const stats = useProgress((s) => s.estimation);
  const [round, setRound] = useState<DrillQuestion[] | null>(null);
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(PER_Q);

  useEffect(() => {
    if (!round || picked !== null || k >= round.length) return;
    if (left <= 0) { setPicked(-1); return; }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [round, picked, left, k]);

  const start = () => { setRound(makeDrill(Date.now() % 1e9)); setK(0); setPicked(null); setScore(0); setLeft(PER_Q); };
  const next = () => {
    const correct = picked === round![k]!.answer;
    const s = score + (correct ? 1 : 0);
    setScore(s);
    if (k + 1 >= round!.length) record(s, round!.length);
    setK(k + 1); setPicked(null); setLeft(PER_Q);
  };

  if (!round || k >= round.length) {
    return (
      <section className="pop-in rounded-[22px] border-[3px] border-ink bg-white p-6 shadow-block">
        {round && <h2 className="m-0 mb-1 font-display text-2xl font-extrabold">এই round: {bn(score)}/{bn(round.length)}</h2>}
        <p className="m-0 text-ink-soft">উত্তরগুলো একে অন্যের ১০ গুণ দূরে, তাই আসল দক্ষতা মাত্রা (order of magnitude) ঠিক রাখা। দিনে ~১ লাখ সেকেন্ড, peak ≈ ২×।</p>
        <p className="m-0 mt-2 text-sm text-muted">মোট {bn(stats.attempts)}টা প্রশ্নে {bn(stats.correct)}টা ঠিক · সেরা round {bn(stats.bestRound)}/১০</p>
        <button type="button" onClick={start} className="btn-press mt-4 min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-8 font-display text-xl font-extrabold shadow-[0_5px_0_#16252D]">{round ? 'আরেক round' : 'শুরু করুন'}</button>
      </section>
    );
  }

  const q = round[k]!;
  const done = picked !== null;
  return (
    <section key={k} className="pop-in rounded-[22px] border-[3px] border-ink bg-white p-6 shadow-block">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm font-bold">
        <span className="text-route-deep">প্রশ্ন {bn(k + 1)}/{bn(round.length)} · ঠিক {bn(score)}</span>
        <span className="font-mono">{bn(Math.max(0, left))} সে.</span>
      </div>
      <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-locked"><div className="h-full transition-[width] duration-1000 ease-linear" style={{ width: `${(left / PER_Q) * 100}%`, background: left < 8 ? '#E0483E' : '#0B8A7A' }} /></div>
      <h2 className="m-0 mb-4 font-display text-[22px] font-bold leading-snug">{q.prompt}</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((o, i) => {
          const right = done && i === q.answer, wrong = done && i === picked && i !== q.answer;
          return (
            <button key={i} type="button" disabled={done} onClick={() => setPicked(i)}
              className={`min-h-[60px] cursor-pointer rounded-[14px] border-2 font-mono text-lg font-bold ${right ? 'border-route bg-route-soft' : wrong ? 'border-coral bg-coral-soft' : 'border-ink bg-white'} disabled:cursor-default`}>
              {o}
            </button>
          );
        })}
      </div>
      {done && (
        <div className={`pop-in mt-4 rounded-[14px] border-2 p-4 ${picked === q.answer ? 'border-route bg-route-soft' : 'border-coral bg-coral-soft'}`}>
          <strong className="font-display text-lg">{picked === q.answer ? 'ঠিক!' : picked === -1 ? 'সময় শেষ' : 'হয়নি'}</strong>
          <p className="m-0 mt-1">{q.explain}</p>
          <button type="button" autoFocus onClick={next} className="btn-press mt-3 min-h-12 w-full cursor-pointer rounded-xl border-[3px] border-ink bg-white font-bold shadow-[0_4px_0_#16252D]">{k + 1 < round.length ? 'পরেরটা' : 'ফল দেখুন'}</button>
        </div>
      )}
    </section>
  );
}

/* ---------- design challenge ---------- */

function useCountdown(seconds: number | null) {
  const [left, setLeft] = useState(seconds ?? 0);
  useEffect(() => { setLeft(seconds ?? 0); }, [seconds]);
  useEffect(() => {
    if (seconds === null || left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, seconds]);
  return left;
}
const mmss = (s: number) => bn(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, { grouping: false });

function DesignChallenge() {
  const history = useProgress((s) => s.design);
  const record = useProgress((s) => s.recordDesign);
  const [prompt, setPrompt] = useState<DesignPrompt | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [running, setRunning] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<boolean[]>(designRubric.map(() => false));
  const [saved, setSaved] = useState(false);
  const left = useCountdown(running);

  const begin = (p: DesignPrompt) => { setPrompt(p); setRunning(minutes * 60); setNotes(''); setChecks(designRubric.map(() => false)); setSaved(false); };

  if (!prompt) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-ink bg-white p-3">
          <span className="font-semibold">সময়:</span>
          {[15, 30, 45].map((m) => (
            <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={`min-h-11 cursor-pointer rounded-xl border-2 border-ink px-4 font-bold ${minutes === m ? 'bg-ink text-white' : 'bg-white'}`}>{bn(m)} মিনিট</button>
          ))}
          <span className="text-sm text-muted">কাগজে আঁকুন, নোট এখানে লিখুন, শেষে rubric-এ নিজে নম্বর দিন।</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {designPrompts.map((p) => (
            <button key={p.id} type="button" onClick={() => begin(p)} className="btn-press flex cursor-pointer flex-col items-start rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
              <span className="text-xs font-bold text-route-deep">Level {bn(p.level)}-এর বিষয়</span>
              <span className="font-display text-lg font-bold">{p.title}</span>
              <span className="mt-1 text-sm text-ink-soft">{p.prompt}</span>
            </button>
          ))}
        </div>
        {history.length > 0 && (
          <div className="rounded-2xl border-2 border-ink bg-white p-4">
            <h3 className="m-0 mb-2 font-display text-lg font-bold">আগের চেষ্টা</h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {[...history].reverse().slice(0, 8).map((h, i) => (
                <li key={i} className="flex justify-between gap-3"><span>{designPrompts.find((p) => p.id === h.promptId)?.title ?? h.promptId}</span><span className="font-mono">{bn(h.score)}/{bn(h.max)} · {bn(h.minutes)} মি</span></li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  const score = checks.filter(Boolean).length;
  return (
    <section className="pop-in flex flex-col gap-4 rounded-[22px] border-[3px] border-ink bg-white p-6 shadow-block">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold text-route-deep">Design challenge · Level {bn(prompt.level)}</p>
          <h2 className="m-0 font-display text-2xl font-extrabold">{prompt.title}</h2>
          <p className="m-0 mt-1 text-[17px]">{prompt.prompt}</p>
        </div>
        <div className={`rounded-2xl border-[3px] border-ink px-4 py-2 font-mono text-3xl font-bold ${left < 60 ? 'bg-coral text-white' : 'bg-parcel-soft'}`} role="timer" aria-live="off">{mmss(left)}</div>
      </div>
      <label className="flex flex-col gap-1 font-semibold">
        নোট (প্রয়োজন, হিসাব, API, data model, diagram-এর কথা)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className="rounded-xl border-2 border-ink p-3 font-[inherit] text-base font-normal" />
      </label>
      <fieldset className="m-0 rounded-xl border-2 border-ink p-4">
        <legend className="px-1 font-semibold">নিজের rubric · {bn(score)}/{bn(designRubric.length)}</legend>
        <div className="flex flex-col gap-2">
          {designRubric.map((r, i) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))} className="h-5 w-5" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={saved} onClick={() => {
          record({ promptId: prompt.id, score, max: designRubric.length, minutes: Math.round((minutes * 60 - left) / 60), notes, at: new Date().toISOString() });
          setSaved(true); setRunning(null);
        }} className="btn-press min-h-[52px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-6 font-display text-lg font-extrabold shadow-[0_5px_0_#16252D] disabled:opacity-50">
          {saved ? 'রাখা হয়েছে' : 'শেষ, নম্বর রাখুন'}
        </button>
        <a href={prompt.ref.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[52px] items-center rounded-2xl border-[2.5px] border-ink px-5 font-semibold text-ink no-underline">বইয়ের design দেখুন ↗</a>
        <Link to="/level/$levelId" params={{ levelId: String(prompt.level) }} className="inline-flex min-h-[52px] items-center rounded-2xl border-[2.5px] border-ink px-5 font-semibold text-ink no-underline">Level {bn(prompt.level)}</Link>
        <button type="button" onClick={() => { setPrompt(null); setRunning(null); }} className="min-h-[52px] cursor-pointer rounded-2xl border-2 border-ink bg-white px-5 font-semibold">অন্য প্রশ্ন</button>
      </div>
    </section>
  );
}

/* ---------- speak aloud ---------- */

function SpeakAloud() {
  const record = useProgress((s) => s.recordSpeak);
  const done = useProgress((s) => s.speak.length);
  const [p, setP] = useState<SpeakPrompt>(() => speakPrompts[Math.floor(Math.random() * speakPrompts.length)]!);
  const [running, setRunning] = useState<number | null>(null);
  const [checks, setChecks] = useState<boolean[]>(speakRubric.map(() => false));
  const [saved, setSaved] = useState(false);
  const left = useCountdown(running);
  const another = () => { setP(speakPrompts[(speakPrompts.indexOf(p) + 1 + Math.floor(Math.random() * (speakPrompts.length - 1))) % speakPrompts.length]!); setRunning(null); setChecks(speakRubric.map(() => false)); setSaved(false); };

  return (
    <section className="pop-in flex flex-col gap-4 rounded-[22px] border-[3px] border-ink bg-white p-6 shadow-block">
      <p className="m-0 text-xs font-bold text-route-deep">মুখে বলা · Level {bn(p.level)} · এ পর্যন্ত {bn(done)}বার</p>
      <h2 className="m-0 font-display text-[26px] font-extrabold leading-snug">{p.prompt}</h2>
      <p className="m-0 text-ink-soft">Interviewer-কে বোঝাচ্ছেন এমনভাবে জোরে বলুন। ফোনে record করে পরে শুনলে আরও ভালো।</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`rounded-2xl border-[3px] border-ink px-4 py-2 font-mono text-3xl font-bold ${running !== null && left === 0 ? 'bg-coral text-white' : 'bg-parcel-soft'}`} role="timer">{mmss(running === null ? 120 : left)}</div>
        <button type="button" onClick={() => setRunning(120)} className="btn-press min-h-[52px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-6 font-display text-lg font-extrabold shadow-[0_5px_0_#16252D]">{running === null ? 'শুরু (২ মিনিট)' : 'আবার শুরু'}</button>
        <button type="button" onClick={another} className="min-h-[52px] cursor-pointer rounded-2xl border-2 border-ink bg-white px-5 font-semibold">অন্য প্রশ্ন</button>
      </div>
      <fieldset className="m-0 rounded-xl border-2 border-ink p-4">
        <legend className="px-1 font-semibold">বলার পর নিজেকে নম্বর দিন</legend>
        {speakRubric.map((r, i) => (
          <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={checks[i]} onChange={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))} className="h-5 w-5" />
            {r}
          </label>
        ))}
      </fieldset>
      <button type="button" disabled={saved} onClick={() => { record({ promptId: p.id, score: checks.filter(Boolean).length, max: speakRubric.length, at: new Date().toISOString() }); setSaved(true); }} className="btn-press min-h-[52px] cursor-pointer self-start rounded-2xl border-[3px] border-ink bg-white px-6 font-bold shadow-[0_5px_0_#16252D] disabled:opacity-50">
        {saved ? 'রাখা হয়েছে' : `রাখুন · ${bn(checks.filter(Boolean).length)}/${bn(speakRubric.length)}`}
      </button>
    </section>
  );
}

/** Replay any level's simulator freely; nothing here is scored. */
function SimulatorLab() {
  const [open, setOpen] = useState<SimulatorId | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const withSim = levelList.filter((l) => l.simulator);
  if (open) {
    const Sim = simulators[open];
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setOpen(null)} className="self-start cursor-pointer rounded-xl border-2 border-ink bg-white px-4 py-2 font-bold">← সব simulator</button>
        <Suspense fallback={<p className="text-muted">Simulator আসছে…</p>}>
          <Sim onFinish={(n) => { setLast(`শেষবার ${bn(n)}/৩ mission`); setOpen(null); }} />
        </Suspense>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {last && <p className="m-0 rounded-xl bg-route-soft px-4 py-2 font-semibold">{last}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {withSim.map((l) => (
          <button key={l.id} type="button" onClick={() => setOpen(l.simulator!)} className="btn-press flex cursor-pointer flex-col items-start gap-1 rounded-2xl border-[2.5px] border-ink bg-white p-4 text-left font-[inherit] shadow-[0_4px_0_#16252D]">
            <span className="text-sm font-bold text-route-deep">Level {bn(l.id)}</span>
            <span className="font-display text-lg font-extrabold">{l.title}</span>
            <span className="text-sm text-muted">{l.concept}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
