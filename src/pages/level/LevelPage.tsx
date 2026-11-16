import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { chapters, levelsById } from '@/content/levels';
import type { Level } from '@/content/schema';
import { masteryOf, lockReason } from '@/entities/progress/selectors';
import { useProgress, type AnswerLog } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { BOSS_POINTS, LEVEL_PARTS, MISSION_POINTS, PASS_MARK, masteryLabel, starsForTotal, trafficPlayPoints } from '@/shared/lib/scoring';
import { QuestionCard, type AnswerResult } from '@/shared/ui/QuestionCard';
import { Stars } from '@/shared/ui/Stars';
import { LessonPlayer } from '@/widgets/lesson-player/LessonPlayer';
import { TrafficGame } from '@/widgets/traffic-stage/TrafficGame';
import { simulators } from '@/simulators/registry';

type Step = 'briefing' | 'predict' | 'lesson' | 'summary' | 'play' | 'boss' | 'result';
const FLOW: { id: Step; label: string }[] = [
  { id: 'briefing', label: 'ব্রিফিং' }, { id: 'predict', label: 'অনুমান' }, { id: 'lesson', label: 'গল্প' },
  { id: 'play', label: 'খেলা' }, { id: 'boss', label: 'Boss' }, { id: 'result', label: 'ফল' },
];
const flowIndex = (s: Step) => FLOW.findIndex((f) => f.id === (s === 'summary' ? 'lesson' : s));

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function LevelPage({ level }: { level: Level }) {
  const progress = useProgress();
  const locked = lockReason(level.id, progress);
  const [step, setStep] = useState<Step>('briefing');
  const [lesson, setLesson] = useState<AnswerResult[]>([]);
  const [play, setPlay] = useState<{ points: number; answers: AnswerResult[] }>({ points: 0, answers: [] });
  const [boss, setBoss] = useState<AnswerResult[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mi, setMi] = useState(0);
  const [bi, setBi] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => { top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [step, mi, bi]);

  const parts = useMemo(() => ({
    lesson: clamp(lesson.reduce((s, r) => s + r.earned, 0), 0, LEVEL_PARTS.lesson),
    play: clamp(play.points, 0, LEVEL_PARTS.play),
    boss: clamp(boss.reduce((s, r) => s + r.earned, 0), 0, LEVEL_PARTS.boss),
    noHints: hintsUsed === 0 ? LEVEL_PARTS.noHints : 0,
  }), [lesson, play, boss, hintsUsed]);
  const total = Math.round(parts.lesson + parts.play + parts.boss + parts.noHints);

  const restart = () => {
    setLesson([]); setPlay({ points: 0, answers: [] }); setBoss([]); setHintsUsed(0); setMi(0); setBi(0); setStep('briefing');
  };

  const chapter = chapters.find((c) => c.id === level.chapter)!;
  const nextLevel = levelsById[level.id + 1];

  return (
    <div className="min-h-screen" ref={top}>
      <header className={`sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-b-[3px] border-ink px-4 py-3 sm:px-8 ${step === 'boss' ? 'bg-[#16252D] text-white' : 'bg-white'}`}>
        <Link to="/" className={`inline-flex min-h-11 items-center gap-1.5 font-bold no-underline ${step === 'boss' ? 'text-parcel' : 'text-route-deep hover:text-ink'}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          শহর
        </Link>
        <h1 className="m-0 font-display text-[22px] font-extrabold">Level {bn(level.id)} · {level.title}</h1>
        <ol aria-label="Level-এর ধাপ" className="m-0 ml-auto flex list-none flex-wrap gap-1.5 p-0 text-[13px] font-semibold">
          {FLOW.map((f, k) => {
            const cur = flowIndex(step);
            return (
              <li key={f.id} aria-current={k === cur ? 'step' : undefined}
                className={k < cur ? 'rounded-full bg-route px-2.5 py-1 text-white' : k === cur ? 'rounded-full border-2 border-ink bg-parcel px-3 py-1 text-ink' : step === 'boss' ? 'rounded-full bg-[#2A3B44] px-2.5 py-1 text-[#9FB2BC]' : 'rounded-full bg-locked px-2.5 py-1 text-muted'}>
                {f.label}
              </li>
            );
          })}
        </ol>
      </header>

      <main className="mx-auto box-border flex max-w-[1080px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {step === 'briefing' && (
          <section className="pop-in grid gap-5 rounded-[26px] border-[3px] border-ink bg-white p-6 shadow-block sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="grid h-28 w-28 place-items-center rounded-full border-[3px] border-ink font-display text-[56px] font-extrabold leading-none shadow-[0_5px_0_#16252D]" style={{ background: chapter.accent, color: '#FFFFFF' }}>
              {bn(level.id)}
            </div>
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold" style={{ color: chapter.accent }}>অধ্যায় {bn(chapter.id)} · {chapter.title}</p>
              <h2 className="m-0 mt-1 font-display text-[34px] font-extrabold leading-tight">{level.title}</h2>
              <span className="mt-2 inline-block rounded-lg bg-route-soft px-2.5 py-1 text-sm font-bold text-route-deep">{level.concept}</span>
              <blockquote className="m-0 mt-4 border-0 border-l-0 font-display text-xl font-bold text-coral-deep">“{level.story}”</blockquote>
              <p className="mb-0 mt-2 text-[17px] leading-relaxed text-ink-soft">{level.briefing}</p>
              <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0 text-sm">
                <li className="rounded-lg bg-[#F0F2EC] px-2.5 py-1">~{bn(level.minutes)} মিনিট</li>
                <li className="rounded-lg bg-[#F0F2EC] px-2.5 py-1">৬ ধাপ · ১০০ নম্বর</li>
                <li className="rounded-lg bg-[#F0F2EC] px-2.5 py-1">পাস {bn(PASS_MARK)}</li>
                {progress.levels[level.id] && <li className="rounded-lg bg-parcel-soft px-2.5 py-1 font-semibold">আপনার সেরা {bn(progress.levels[level.id]!.best)} · {masteryLabel[masteryOf(level.id, progress)]}</li>}
              </ul>
              {locked && <p className="mb-0 mt-4 rounded-xl border-2 border-dashed border-[#9AA69F] px-4 py-3 font-semibold text-muted">তালাবদ্ধ: {locked}। চাইলে প্রোফাইল থেকে "সব খুলে দিন" চালু করুন।</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" disabled={!!locked} onClick={() => setStep('predict')} className="btn-press min-h-[56px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-8 font-display text-[22px] font-extrabold text-ink shadow-[0_5px_0_#16252D] disabled:cursor-not-allowed disabled:opacity-50">
                  শুরু করুন
                </button>
                <a href={level.ref.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[56px] items-center rounded-2xl border-[2.5px] border-ink px-5 font-semibold text-ink no-underline hover:bg-[#F0F2EC]">
                  বই-এর পাতা: {level.ref.label} ↗
                </a>
              </div>
            </div>
          </section>
        )}

        {step === 'predict' && (
          <>
            <Intro kicker="ধাপ ২ · অনুমান" title="আগে একটা অনুমান" body="নম্বর নেই। শুধু নিজের ধারণাটা যাচাই করুন, তারপর lesson-এ দেখবেন কেন।" />
            <QuestionCard q={level.predict} label="অনুমান · নম্বর নেই" continueLabel="Lesson শুরু →" onDone={() => setStep('lesson')} />
          </>
        )}

        {step === 'lesson' && (
          <>
            <Intro kicker="ধাপ ৩ · গল্প" title={level.concept} body="ধাপে ধাপে animation। দুইবার থেমে প্রশ্ন আসবে; উত্তর দিলে তবে এগোবে।" />
            <LessonPlayer nodes={level.nodes} steps={level.steps} onCheckpoint={(r) => setLesson((l) => [...l.filter((x) => x.qid !== r.qid), r])} onFinish={() => setStep('summary')} />
          </>
        )}

        {step === 'summary' && (
          <section className="pop-in rounded-[26px] border-[3px] border-ink bg-white p-6 shadow-block sm:p-8">
            <p className="m-0 text-sm font-bold text-route-deep">তিন লাইনে নিয়মটা</p>
            <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {level.summary.map((s, k) => (
                <li key={k} className="pop-in flex gap-3 text-[18px] leading-snug" style={{ animationDelay: `${k * 0.15}s` }}>
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ink font-bold text-white">{bn(k + 1)}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mb-0 mt-5 text-sm text-muted">Lesson-এ পেয়েছেন {bn(Math.round(parts.lesson * 10) / 10, { grouping: false })}/{bn(LEVEL_PARTS.lesson)} · বিস্তারিত: <a href={level.ref.url} target="_blank" rel="noreferrer" className="font-semibold text-route-deep">{level.ref.label} ↗</a></p>
            <button type="button" onClick={() => setStep('play')} className="btn-press mt-5 min-h-[56px] w-full cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel font-display text-[22px] font-extrabold text-ink shadow-[0_5px_0_#16252D]">
              এবার নিজে করুন →
            </button>
          </section>
        )}

        {step === 'play' && level.play.kind === 'traffic' && (
          <>
            <Intro kicker="ধাপ ৪ · খেলা" title="Simulator" body="নিজে হাতে চালান, তারপর দেখুন system নিজে কীভাবে করে। তারা অনুযায়ী ২৫ নম্বরের মধ্যে।" />
            <TrafficGame play={level.play} onComplete={(stars) => { setPlay({ points: trafficPlayPoints(stars), answers: [] }); setStep('boss'); }} />
          </>
        )}

        {step === 'play' && level.play.kind === 'missions' && level.simulator && (() => {
          const Sim = simulators[level.simulator];
          return (
            <Suspense fallback={<p className="text-muted">Simulator আসছে…</p>}>
              <Sim onFinish={(n) => { setPlay({ points: (LEVEL_PARTS.play * n) / 3, answers: [] }); setStep('boss'); }} />
            </Suspense>
          );
        })()}

        {step === 'play' && level.play.kind === 'missions' && !level.simulator && (
          <>
            <Intro kicker={`ধাপ ৪ · Mission ${bn(mi + 1)}/৩`} title="Mission" body={level.play.intro} />
            <MissionBar done={play.answers} total={3} />
            <QuestionCard
              key={level.play.missions[mi]!.id}
              q={level.play.missions[mi]!}
              label={`Mission ${bn(mi + 1)}/৩`}
              points={MISSION_POINTS}
              continueLabel={mi < 2 ? 'পরের mission' : 'Boss-এর দিকে →'}
              onDone={(r) => {
                setPlay((p) => ({ points: p.points + r.earned, answers: [...p.answers, r] }));
                if (mi < 2) setMi(mi + 1); else setStep('boss');
              }}
            />
          </>
        )}

        {step === 'boss' && (
          <div className="flex flex-col gap-5">
            <div className="pop-in rounded-[22px] border-[3px] border-ink bg-ink p-5 text-white shadow-[0_6px_0_#E0483E]">
              <p className="m-0 text-sm font-bold text-parcel">ধাপ ৫ · Boss challenge</p>
              <h2 className="m-0 mt-1 font-display text-[30px] font-extrabold">{level.story}</h2>
              <p className="mb-0 mt-1 text-[#C9D6DC]">৫টা প্রশ্ন, ৫৫ নম্বর। Hint নিলে "hint ছাড়া" বোনাসের ১০ নম্বর যাবে।</p>
              <div className="mt-3 flex gap-1.5" aria-label={`প্রশ্ন ${bn(bi + 1)}/৫`}>
                {level.boss.map((b, k) => {
                  const r = boss.find((x) => x.qid === b.id);
                  return <span key={b.id} className="h-2.5 flex-1 rounded-full" style={{ background: r ? (r.correct ? '#3FD38A' : '#E0483E') : k === bi ? '#FFC02E' : '#2A3B44' }} />;
                })}
              </div>
            </div>
            <QuestionCard
              key={level.boss[bi]!.id}
              tone="boss"
              q={level.boss[bi]!}
              label={`Boss ${bn(bi + 1)}/৫`}
              points={BOSS_POINTS}
              hintUsed={hintsUsed > 0}
              onHint={() => setHintsUsed((h) => h + 1)}
              continueLabel={bi < 4 ? 'পরের প্রশ্ন' : 'ফলাফল দেখুন'}
              onDone={(r) => {
                setBoss((b) => [...b, r]);
                if (bi < 4) setBi(bi + 1); else setStep('result');
              }}
            />
          </div>
        )}

        {step === 'result' && (
          <Result
            level={level}
            total={total}
            parts={parts}
            answers={[...lesson, ...play.answers, ...boss].map(({ qid, correct, sure }) => ({ qid, correct, sure }))}
            nextId={nextLevel?.id}
            onRetry={restart}
          />
        )}
      </main>
    </div>
  );
}

function Intro({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="pop-in">
      <p className="m-0 text-sm font-bold text-route-deep">{kicker}</p>
      <h2 className="m-0 font-display text-[28px] font-extrabold leading-tight">{title}</h2>
      <p className="m-0 mt-1 text-ink-soft">{body}</p>
    </div>
  );
}

function MissionBar({ done, total }: { done: AnswerResult[]; total: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, k) => {
        const r = done[k];
        return <span key={k} className="h-2.5 flex-1 rounded-full" style={{ background: r ? (r.correct ? '#0B8A7A' : '#E0483E') : k === done.length ? '#FFC02E' : '#D7DED1' }} />;
      })}
    </div>
  );
}

function Result({ level, total, parts, answers, nextId, onRetry }: {
  level: Level; total: number; parts: { lesson: number; play: number; boss: number; noHints: number };
  answers: AnswerLog[]; nextId?: number; onRetry: () => void;
}) {
  const finishLevel = useProgress((s) => s.finishLevel);
  const progress = useProgress();
  const saved = useRef(false);
  const prevBest = useRef(progress.levels[level.id]?.best ?? 0);
  const stars = starsForTotal(total);
  const [t0] = useState(() => performance.now());
  const [, force] = useState(0);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    finishLevel(level.id, { total, stars, parts, answers });
  }, [finishLevel, level.id, total, stars, parts, answers]);

  // count-up animation
  useEffect(() => {
    let raf = 0;
    const loop = () => { force((n) => n + 1); if (performance.now() - t0 < 2200) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [t0]);
  const age = (performance.now() - t0) / 1000;
  const shown = Math.round(total * Math.min(1, age / 1.2));
  const passed = total >= PASS_MARK;
  const nextOpen = nextId ? !lockReason(nextId, progress) : false;
  const rows: [string, number, number][] = [
    ['Lesson checkpoint', parts.lesson, LEVEL_PARTS.lesson],
    [level.play.kind === 'traffic' || level.simulator ? 'Simulator' : 'Mission', parts.play, LEVEL_PARTS.play],
    ['Boss', parts.boss, LEVEL_PARTS.boss],
    ['Hint ছাড়া', parts.noHints, LEVEL_PARTS.noHints],
  ];

  return (
    <section className="pop-in rounded-[26px] border-[3px] border-ink bg-white p-6 text-center shadow-block sm:p-8">
      <Stars count={stars} size={64} age={age - 0.9} />
      <p className="m-0 mt-3 font-mono text-[64px] font-bold leading-none">{bn(shown)}<span className="text-[28px] text-muted">/১০০</span></p>
      <h2 className="m-0 mt-2 font-display text-[30px] font-extrabold">
        {total >= 90 ? 'অসাধারণ!' : total >= 70 ? 'খুব ভালো!' : passed ? 'পাস করেছেন' : 'আরেকবার চেষ্টা করুন'}
      </h2>
      {total > prevBest.current && prevBest.current > 0 && <p className="m-0 mt-1 font-bold text-route-deep">নতুন সেরা! আগে ছিল {bn(prevBest.current)}</p>}
      <div className="mx-auto mt-5 grid max-w-[520px] gap-2 text-left">
        {rows.map(([label, got, max]) => (
          <div key={label}>
            <div className="flex justify-between text-sm font-semibold"><span>{label}</span><span className="font-mono">{bn(Math.round(got * 10) / 10, { grouping: false })}/{bn(max)}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-locked"><div className="h-full rounded-full bg-route transition-[width] duration-700" style={{ width: `${(got / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <p className="mx-auto mb-0 mt-5 max-w-[560px] text-ink-soft">
        {passed ? `দখল: ${masteryLabel[masteryOf(level.id, progress)]}। ` : `পাস নম্বর ${bn(PASS_MARK)}। `}
        ভুল আর আন্দাজের প্রশ্নগুলো review-তে ফিরে আসবে।
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {nextId && nextOpen && (
          <Link to="/level/$levelId" params={{ levelId: String(nextId) }} className="btn-press inline-flex min-h-[54px] items-center rounded-2xl border-[3px] border-ink bg-parcel px-7 font-display text-xl font-extrabold text-ink no-underline shadow-[0_5px_0_#16252D]">
          পরের level →
          </Link>
        )}
        <button type="button" onClick={onRetry} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-white px-6 font-bold shadow-[0_5px_0_#16252D]">আবার খেলুন</button>
        <Link to="/" className="inline-flex min-h-[54px] items-center rounded-2xl border-[2.5px] border-ink px-6 font-semibold text-ink no-underline">শহরে ফিরুন</Link>
      </div>
      <p className="sr-only">{bn(stars)}টা তারা</p>
    </section>
  );
}
