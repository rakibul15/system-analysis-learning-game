import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { chapters } from '@/content/meta';
import { loadBank } from '@/content/load';
import { useProgress } from '@/entities/progress/store';
import { answerPlacement, CORE_CHAPTERS, currentChapter, MAX_QUESTIONS, placementResult, skipChapter, startPlacement, type PlacementResult, type PlacementState } from '@/features/placement/engine';
import { pickQuestion, type Picked } from '@/features/placement/pick';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { AppShell } from '@/shared/ui/AppShell';
import { LoadFailed, PageLoading } from '@/shared/ui/Loading';
import { QuestionCard } from '@/shared/ui/QuestionCard';

/*
 * The placement test: a few questions per chapter, so someone who already knows the basics
 * starts where it gets new for them. See features/placement/engine.ts for the rules.
 */

const chapterOf = (id: number) => chapters.find((c) => c.id === id)!;

export function PlacementPage() {
  const [phase, setPhase] = useState<'intro' | 'test' | 'result'>('intro');
  const [result, setResult] = useState<{ r: PlacementResult; cards: number } | null>(null);
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[820px] flex-col gap-5 px-4 pb-14 pt-6 sm:px-8">
        {phase === 'intro' && <Intro onStart={() => setPhase('test')} />}
        {phase === 'test' && <Test onFinish={(r, cards) => { setResult({ r, cards }); setPhase('result'); }} />}
        {phase === 'result' && result && <Result r={result.r} cards={result.cards} onAgain={() => setPhase('test')} />}
      </main>
    </AppShell>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const placement = useProgress((s) => s.placement);
  const setSkip = useProgress((s) => s.setSkipPlacement);
  const navigate = useNavigate();
  return (
    <section className="rounded-[24px] border-[3px] border-ink bg-surface p-6 shadow-block">
      <p className="m-0 text-sm font-bold text-route-deep">Placement test</p>
      <h1 className="m-0 mt-1 font-display text-[30px] font-extrabold [text-wrap:balance]">{tr('কোথা থেকে শুরু করবেন, ৫ মিনিটে জেনে নিন', 'Find out where to start, in 5 minutes')}</h1>
      <ul className="m-0 mt-4 flex flex-col gap-2 pl-5 text-ink-soft">
        <li>{tr(`প্রতিটা অধ্যায় থেকে ২–৩টা প্রশ্ন, মোট বড়জোর ${bn(MAX_QUESTIONS)}টা। জানা না থাকলে আগেই থেমে যাবে।`, `Two or three questions per chapter, ${MAX_QUESTIONS} at most. It stops early when the questions get new for you.`)}</li>
        <li>{tr('যে অধ্যায় জানেন সেটা খুলে যাবে। নম্বর বা তারা বসবে না, ওগুলো খেললেই আসে।', 'Chapters you know open up. No scores or stars are given; those come from playing.')}</li>
        <li>{tr('প্রতিটা প্রশ্নে বলুন নিশ্চিত না আন্দাজ। আন্দাজে ঠিক হলে অধ্যায় খোলে না। উত্তরগুলো পরে review-তে আসবে।', 'Say whether you are sure or guessing. A lucky guess does not open a chapter. The questions come back later in review.')}</li>
        <li>{tr('ভুল হলে কোনো ক্ষতি নেই: শুধু শুরুর জায়গা ঠিক হয়। আবার দিলে আগের খোলা কিছু বন্ধ হয় না।', 'Nothing is lost for a wrong answer: it only decides where you start. Taking it again never closes anything.')}</li>
      </ul>
      {placement && <p className="m-0 mt-4 rounded-xl bg-route-soft px-3 py-2 text-sm font-semibold text-route-deep">{tr(`আগের বার: ${placement.mastered.length ? `অধ্যায় ${placement.mastered.map((c) => bn(c)).join(', ')} খুলেছে` : 'কোনো অধ্যায় খোলেনি'}।`, `Last time: ${placement.mastered.length ? `chapters ${placement.mastered.join(', ')} opened` : 'no chapter opened'}.`)}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onStart} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-7 font-display text-xl font-extrabold shadow-[0_5px_0_var(--color-shadow)]">{tr('শুরু করুন', 'Start')}</button>
        <button type="button" onClick={() => { setSkip(true); void navigate({ to: '/level/$levelId', params: { levelId: '1' } }); }} className="min-h-[54px] cursor-pointer rounded-2xl border-[2.5px] border-ink bg-surface px-5 font-semibold">{tr('বাদ দিন, Level ১ থেকে শুরু', 'Skip it, start at level 1')}</button>
      </div>
    </section>
  );
}

function Test({ onFinish }: { onFinish: (r: PlacementResult, cards: number) => void }) {
  const finishPlacement = useProgress((s) => s.finishPlacement);
  const seen = useMemo(() => new Set(Object.keys(useProgress.getState().cards)), []);
  const [state, setState] = useState<PlacementState>(() => startPlacement());
  const [current, setCurrent] = useState<Picked | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const asked = useRef({ used: new Set<string>(), usedLevels: new Set<number>(), gens: 0, levels: new Map<string, number>() });
  const chapter = currentChapter(state);

  // fetch this chapter's questions (and the next chapter's, while this one is answered), then pick one
  useEffect(() => {
    if (chapter === null) return;
    let alive = true;
    setFailed(false);
    const next = state.order[state.at + 1];
    loadBank(chapter).then(() => {
      if (!alive) return;
      if (next !== undefined) void loadBank(next).catch(() => undefined);
      const a = asked.current;
      const picked = pickQuestion(chapterOf(chapter).levels, { used: a.used, usedLevels: a.usedLevels, seen, allowGen: a.gens < 1, rand: Math.random });
      if (!picked) { setState((s) => skipChapter(s)); return; }
      a.used.add(picked.q.id);
      a.usedLevels.add(picked.levelId);
      a.levels.set(picked.q.id, picked.levelId);
      if (picked.generated) a.gens += 1;
      setCurrent(picked);
    }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [chapter, state.answers.length, state.at, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  // the test is over: save once and show the result
  const saved = useRef(false);
  useEffect(() => {
    if (chapter !== null || saved.current) return;
    saved.current = true;
    const r = placementResult(state);
    finishPlacement(r, state.answers.map(({ qid, correct, sure }) => ({ qid, correct, sure })));
    onFinish(r, state.answers.length);
  }, [chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return <LoadFailed onRetry={() => setRetry((n) => n + 1)} />;
  if (chapter === null || !current) return <PageLoading label={tr('প্রশ্ন আনা হচ্ছে…', 'Fetching questions…')} />;

  const ch = chapterOf(chapter);
  const n = state.answers.length;
  const isLast = n + 1 >= MAX_QUESTIONS;
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="m-0 font-bold text-route-deep">Placement · {tr(`অধ্যায় ${bn(ch.id)}: ${ch.title}`, `Chapter ${ch.id}: ${ch.title}`)}</p>
          <p className="m-0 text-sm font-semibold text-muted">{tr(`প্রশ্ন ${bn(n + 1)}`, `Question ${n + 1}`)}</p>
        </div>
        <ol className="m-0 flex list-none gap-1.5 p-0" aria-label={tr('অধ্যায়গুলো', 'Chapters')}>
          {CORE_CHAPTERS.map((c) => {
            const v = state.verdicts[c];
            const now = c === chapter;
            return <li key={c} title={`${tr('অধ্যায়', 'Chapter')} ${bn(c)}`} className="h-2.5 flex-1 rounded-full" style={{ background: v === 'mastered' ? 'var(--color-route)' : v === 'weak' ? 'var(--color-coral)' : now ? 'var(--color-parcel)' : 'var(--color-line)' }} />;
          })}
        </ol>
      </div>
      <QuestionCard
        key={current.q.id}
        q={current.q}
        where="placement"
        instant
        label={tr(`নম্বর নেই · অধ্যায় ${bn(ch.id)}`, `No points · chapter ${ch.id}`)}
        continueLabel={isLast ? tr('ফল দেখুন', 'See the result') : tr('পরের প্রশ্ন →', 'Next question →')}
        onDone={(r) => { setCurrent(null); setState((s) => answerPlacement(s, { qid: r.qid, correct: r.correct, sure: r.sure })); }}
      />
      <p className="m-0 text-sm text-muted">{tr('এখানে ঠিক-ভুল দেখানো হয় না, যাতে দ্রুত শেষ হয়। প্রশ্নগুলো পরে review-তে ব্যাখ্যা সহ আসবে।', 'Right and wrong are not shown here, to keep it quick. The questions come back in review with their explanations.')}</p>
    </>
  );
}

function Result({ r, cards, onAgain }: { r: PlacementResult; cards: number; onAgain: () => void }) {
  const start = r.start !== null ? chapterOf(r.start) : null;
  // the bonus chapter opens through its gate level; a known chapter counts as passing it
  const bonus = chapters.find((c) => c.gate);
  const bonusOpen = !!bonus && r.mastered.includes(chapters.find((c) => c.levels.includes(bonus.gate!))?.id ?? -1);
  const status = (c: number) => (r.mastered.includes(c) ? 'mastered' : c === r.start ? 'start' : 'later');
  const look = {
    mastered: [tr('জানা, খুলে গেছে', 'Known, now open'), 'bg-route-soft text-route-deep', '✓'],
    start: [tr('এখান থেকে শুরু', 'Start here'), 'bg-parcel-soft text-parcel-deep', '→'],
    later: [r.tested.length ? tr('পরে, খেলে খেলে খুলবে', 'Later, opens as you play') : '', 'bg-surface-2 text-muted', '·'],
  } as const;
  return (
    <section className="flex flex-col gap-4 rounded-[24px] border-[3px] border-ink bg-surface p-6 shadow-block">
      <p className="m-0 text-sm font-bold text-route-deep">{tr('Placement-এর ফল', 'Placement result')}</p>
      <h1 className="m-0 font-display text-[28px] font-extrabold [text-wrap:balance]">
        {start ? tr(`অধ্যায় ${bn(start.id)} থেকে শুরু করুন`, `Start at chapter ${start.id}`) : tr('মূল ছয় অধ্যায়ই জানা! এবার bonus অধ্যায় আর review।', 'You know all six core chapters! Now the bonus chapter and review.')}
      </h1>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {CORE_CHAPTERS.map((c) => {
          const [label, cls, mark] = look[status(c)];
          const ch = chapterOf(c);
          return (
            <li key={c} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${cls}`}>
              <span className="min-w-0 font-semibold"><span aria-hidden="true">{mark} </span>{tr(`অধ্যায় ${bn(c)}`, `Chapter ${c}`)} · {ch.title}</span>
              <span className="flex-none text-sm font-bold">{label}</span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-sm text-ink-soft">
        {tr(`${bn(cards)}টা প্রশ্ন review-তে গেছে; ভুল আর আন্দাজেরগুলো আগে আসবে।`, `${cards} questions went to review; the missed and guessed ones come back first.`)}
        {bonusOpen ? ` ${tr('Bonus অধ্যায়ও খুলে গেছে।', 'The bonus chapter is open too.')}` : ''}
      </p>
      <div className="flex flex-wrap gap-3">
        {start
          ? <Link to="/level/$levelId" params={{ levelId: String(start.levels[0]) }} className="btn-press inline-flex min-h-[54px] items-center rounded-2xl border-[3px] border-ink bg-parcel px-7 font-display text-xl font-extrabold text-ink no-underline shadow-[0_5px_0_var(--color-shadow)]">{tr(`Level ${bn(start.levels[0]!)} থেকে শুরু →`, `Start at level ${start.levels[0]} →`)}</Link>
          : <Link to="/review" className="btn-press inline-flex min-h-[54px] items-center rounded-2xl border-[3px] border-ink bg-parcel px-7 font-display text-xl font-extrabold text-ink no-underline shadow-[0_5px_0_var(--color-shadow)]">{tr('Review শুরু →', 'Start reviewing →')}</Link>}
        <Link to="/" className="inline-flex min-h-[54px] items-center rounded-2xl border-[2.5px] border-ink bg-surface px-5 font-semibold text-ink no-underline">{tr('শহরে ফিরুন', 'Back to the city')}</Link>
        <button type="button" onClick={onAgain} className="min-h-[54px] cursor-pointer rounded-2xl border-0 bg-transparent px-2 font-semibold text-route-deep underline">{tr('আবার দিন', 'Take it again')}</button>
      </div>
    </section>
  );
}
