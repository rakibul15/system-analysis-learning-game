import { useMemo, useState } from 'react';
import { bankQuestion, conceptLabel, reviewVariant } from '@/content/bank';
import { Link } from '@tanstack/react-router';
import { levelsById, questionsById } from '@/content/levels';
import { dueCards } from '@/entities/progress/selectors';
import { useProgress, type ReviewCard } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { DAY_MS, REVIEW_DAYS } from '@/shared/lib/scoring';
import { AppShell } from '@/shared/ui/AppShell';
import { QuestionCard } from '@/shared/ui/QuestionCard';
import { tr } from '@/shared/lib/i18n';
import { dueRebuilds, rebuildQueue } from '@/features/rebuild/rebuild';

const SESSION = 20;

export function ReviewPage() {
  const p = useProgress();
  const answerReview = useProgress((s) => s.answerReview);
  const [session, setSession] = useState<ReviewCard[] | null>(null);
  const [k, setK] = useState(0);
  const [right, setRight] = useState(0);

  const due = dueCards(p);
  const all = Object.values(p.cards);
  const weakest = [...all].sort((a, b) => a.box - b.box || b.lapses - a.lapses).slice(0, 10);
  const nextDue = all.filter((c) => c.due > Date.now()).sort((a, b) => a.due - b.due)[0];
  const byBox = REVIEW_DAYS.map((_, b) => all.filter((c) => c.box === b).length);

  const start = (cards: ReviewCard[]) => { setSession(cards.slice(0, SESSION)); setK(0); setRight(0); };

  if (session && k < session.length) {
    const card = session[k]!;
    return <ReviewStep key={`${card.qid}-${k}`} card={card} k={k} total={session.length} session={session} onStop={() => setSession(null)} onAnswer={(r) => { answerReview(card.qid, r.correct, r.sure); if (r.correct) setRight((n) => n + 1); setK(k + 1); }} />;
  }

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[960px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {session && (
          <section className="pop-in rounded-[22px] border-[3px] border-ink bg-route-soft p-5 shadow-block">
            <h2 className="m-0 font-display text-2xl font-extrabold">{tr('Review শেষ:', 'Review done:')} {bn(right)}/{bn(session.length)} {tr('ঠিক', 'right')}</h2>
            <p className="m-0 mt-1 text-ink-soft">{tr('নিশ্চিত হয়ে ঠিক বললে প্রশ্ন পরের ঘরে যায় (আরও দেরিতে ফেরে); ভুল হলে প্রথম ঘরে, কাল আবার।', 'Right and sure moves a question to the next box (it returns later); wrong sends it back to the first box, due tomorrow.')}</p>
          </section>
        )}
        <section className="rounded-[22px] border-[3px] border-ink bg-white p-6 shadow-block">
          <p className="m-0 text-sm font-bold text-route-deep">Spaced repetition</p>
          <h1 className="m-0 font-display text-[32px] font-extrabold">{tr('আজকের review', 'Today\'s review')}</h1>
          {all.length === 0 ? (
            <p className="mb-0 mt-2 text-ink-soft">{tr('এখনো কোনো প্রশ্ন জমেনি। একটা level শেষ করলে তার প্রশ্নগুলো এখানে আসবে, ১, ৩, ৭, ১৬ আর ৩৫ দিন পরপর।', 'No questions yet. Finish a level and its questions come here, after 1, 3, 7, 16 and 35 days.')}</p>
          ) : (
            <>
              <p className="mb-4 mt-2 text-ink-soft">
                {due.length ? tr(`${bn(due.length)}টা প্রশ্ন আজ ফিরে এসেছে।`, `${due.length} questions came back today.`) : tr(`আজ কিছু বাকি নেই।${nextDue ? ` পরেরটা আসবে ${bn(Math.max(1, Math.ceil((nextDue.due - Date.now()) / DAY_MS)))} দিনের মধ্যে।` : ''}`, `Nothing left for today.${nextDue ? ` The next one is due within ${Math.max(1, Math.ceil((nextDue.due - Date.now()) / DAY_MS))} days.` : ''}`)}
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={!due.length} onClick={() => start(due)} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-7 font-display text-xl font-extrabold shadow-[0_5px_0_#16252D] disabled:cursor-not-allowed disabled:opacity-50">
                  {tr('শুরু করুন', 'Start')}{due.length ? ` · ${bn(Math.min(SESSION, due.length))}` : ''}
                </button>
                <button type="button" onClick={() => start(weakest)} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-white px-6 font-bold shadow-[0_5px_0_#16252D]">
                  {tr('দুর্বল ১০টা আগেভাগে', 'Your 10 weakest, early')}
                </button>
              </div>
            </>
          )}
        </section>

        <RebuildSection />

        {all.length > 0 && (
          <section className="rounded-[22px] border-[2.5px] border-ink bg-white p-6">
            <h2 className="m-0 mb-3 font-display text-xl font-bold">{tr('কোন ঘরে কতগুলো', 'How many in each box')}</h2>
            <div className="grid grid-cols-5 gap-2 text-center">
              {byBox.map((n, b) => (
                <div key={b} className="rounded-xl border-2 border-ink p-2">
                  <div className="font-mono text-2xl font-bold">{bn(n)}</div>
                  <div className="text-xs text-muted">{tr('ঘর', 'Box')} {bn(b + 1)} · {bn(REVIEW_DAYS[b]!)} {tr('দিন', 'days')}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        <p className="m-0 text-sm text-muted">{tr('নতুন প্রশ্ন জমাতে', 'To collect new questions, play a level in')} <Link to="/" className="font-semibold text-route-deep">{tr('শহরে', 'the city')}</Link>{tr(' একটা level খেলুন।', '.')}</p>
      </main>
    </AppShell>
  );
}

/** Architecture builder challenges due to be redrawn from memory. */
function RebuildSection() {
  const p = useProgress();
  const queue = rebuildQueue(p);
  const due = dueRebuilds(p);
  if (!queue.length) return null;
  const next = queue.find((r) => r.due > Date.now());
  return (
    <section className="rounded-[22px] border-[3px] border-ink bg-[#EDE6F8] p-6">
      <p className="m-0 text-sm font-bold text-[#4B2F7A]">Rebuild from memory</p>
      <h2 className="m-0 font-display text-2xl font-extrabold">{tr('না দেখে আবার আঁকুন', 'Redraw it from memory')}</h2>
      <p className="m-0 mt-1 text-ink-soft">{tr('যে level পাস করেছেন তার architecture খালি canvas-এ আবার আঁকুন, নিয়ম লুকানো। পুরো ঠিক হলে পরের বার ৩, ৭, ২১, ৬০ দিন পরে আসে।', 'Redraw the architecture of a level you passed on a blank canvas, with the rules hidden. Fully right, and it returns after 3, 7, 21, then 60 days.')}</p>
      {due.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {due.map((r) => (
            <Link key={r.challenge.id} to="/builder" search={{ memory: r.challenge.id }} className="btn-press flex min-h-12 items-center rounded-xl border-2 border-ink bg-white px-4 font-semibold text-ink no-underline shadow-[0_3px_0_#16252D]">
              {r.challenge.title}{r.first ? tr(' · প্রথমবার', ' · first time') : ''}
            </Link>
          ))}
        </div>
      ) : (
        <p className="m-0 mt-2 font-semibold">{tr(`আজ কিছু বাকি নেই।${next ? ` পরেরটা ${bn(Math.max(1, Math.ceil((next.due - Date.now()) / DAY_MS)))} দিনের মধ্যে।` : ''}`, `Nothing due today.${next ? ` The next one is within ${Math.max(1, Math.ceil((next.due - Date.now()) / DAY_MS))} days.` : ''}`)}</p>
      )}
    </section>
  );
}

/** One review question: a different question on the same concept when the bank has one. */
function ReviewStep({ card, k, total, session, onStop, onAnswer }: { card: ReviewCard; k: number; total: number; session: ReviewCard[]; onStop: () => void; onAnswer: (r: { correct: boolean; sure: boolean }) => void }) {
  const q = useMemo(() => reviewVariant(card.qid, questionsById[card.qid]?.q ?? bankQuestion(card.qid)), [card.qid]);
  const levelId = questionsById[card.qid]?.levelId ?? card.levelId;
  const concept = conceptLabel(card.qid);
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[820px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 font-bold text-route-deep">Review {bn(k + 1)}/{bn(total)}</p>
          <button type="button" onClick={onStop} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-3 font-semibold">{tr('থামুন', 'Stop')}</button>
        </div>
        <div className="flex gap-1">{session.map((_, i) => <span key={i} className="h-2 flex-1 rounded-full" style={{ background: i < k ? '#0B8A7A' : i === k ? '#FFC02E' : '#D7DED1' }} />)}</div>
        {q ? (
          <QuestionCard
            q={q}
            label={`Level ${bn(levelId)} · ${levelsById[levelId]?.title ?? ''}${concept ? ` · ${concept}` : ''} · ${tr('ঘর', 'Box')} ${bn(card.box + 1)}`}
            continueLabel={k + 1 < total ? tr('পরের প্রশ্ন', 'Next question') : tr('শেষ', 'Finish')}
            onDone={(r) => onAnswer(r)}
          />
        ) : (
          <button type="button" onClick={() => onAnswer({ correct: true, sure: false })} className="min-h-12 rounded-xl border-2 border-ink bg-white">{tr('এই প্রশ্ন আর নেই, পরেরটা', 'This question no longer exists, next one')}</button>
        )}
      </main>
    </AppShell>
  );
}
