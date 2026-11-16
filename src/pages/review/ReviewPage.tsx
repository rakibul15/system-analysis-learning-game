import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { levelsById, questionsById } from '@/content/levels';
import { dueCards } from '@/entities/progress/selectors';
import { useProgress, type ReviewCard } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { DAY_MS, REVIEW_DAYS } from '@/shared/lib/scoring';
import { AppShell } from '@/shared/ui/AppShell';
import { QuestionCard } from '@/shared/ui/QuestionCard';

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
    const entry = questionsById[card.qid];
    return (
      <AppShell>
        <main className="mx-auto box-border flex max-w-[820px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 font-bold text-route-deep">Review {bn(k + 1)}/{bn(session.length)}</p>
            <button type="button" onClick={() => setSession(null)} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-3 font-semibold">থামুন</button>
          </div>
          <div className="flex gap-1">{session.map((_, i) => <span key={i} className="h-2 flex-1 rounded-full" style={{ background: i < k ? '#0B8A7A' : i === k ? '#FFC02E' : '#D7DED1' }} />)}</div>
          {entry ? (
            <QuestionCard
              key={card.qid}
              q={entry.q}
              label={`Level ${bn(entry.levelId)} · ${levelsById[entry.levelId]!.title} · ঘর ${bn(card.box + 1)}`}
              continueLabel={k + 1 < session.length ? 'পরের প্রশ্ন' : 'শেষ'}
              onDone={(r) => { answerReview(card.qid, r.correct, r.sure); if (r.correct) setRight((n) => n + 1); setK(k + 1); }}
            />
          ) : (
            <button type="button" onClick={() => setK(k + 1)} className="min-h-12 rounded-xl border-2 border-ink bg-white">এই প্রশ্ন আর নেই, পরেরটা</button>
          )}
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[960px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        {session && (
          <section className="pop-in rounded-[22px] border-[3px] border-ink bg-route-soft p-5 shadow-block">
            <h2 className="m-0 font-display text-2xl font-extrabold">Review শেষ: {bn(right)}/{bn(session.length)} ঠিক</h2>
            <p className="m-0 mt-1 text-ink-soft">নিশ্চিত হয়ে ঠিক বললে প্রশ্ন পরের ঘরে যায় (আরও দেরিতে ফেরে); ভুল হলে প্রথম ঘরে, কাল আবার।</p>
          </section>
        )}
        <section className="rounded-[22px] border-[3px] border-ink bg-white p-6 shadow-block">
          <p className="m-0 text-sm font-bold text-route-deep">Spaced repetition</p>
          <h1 className="m-0 font-display text-[32px] font-extrabold">আজকের review</h1>
          {all.length === 0 ? (
            <p className="mb-0 mt-2 text-ink-soft">এখনো কোনো প্রশ্ন জমেনি। একটা level শেষ করলে তার প্রশ্নগুলো এখানে আসবে, ১, ৩, ৭, ১৬ আর ৩৫ দিন পরপর।</p>
          ) : (
            <>
              <p className="mb-4 mt-2 text-ink-soft">
                {due.length ? `${bn(due.length)}টা প্রশ্ন আজ ফিরে এসেছে।` : `আজ কিছু বাকি নেই।${nextDue ? ` পরেরটা আসবে ${bn(Math.max(1, Math.ceil((nextDue.due - Date.now()) / DAY_MS)))} দিনের মধ্যে।` : ''}`}
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={!due.length} onClick={() => start(due)} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-parcel px-7 font-display text-xl font-extrabold shadow-[0_5px_0_#16252D] disabled:cursor-not-allowed disabled:opacity-50">
                  শুরু করুন{due.length ? ` · ${bn(Math.min(SESSION, due.length))}টা` : ''}
                </button>
                <button type="button" onClick={() => start(weakest)} className="btn-press min-h-[54px] cursor-pointer rounded-2xl border-[3px] border-ink bg-white px-6 font-bold shadow-[0_5px_0_#16252D]">
                  দুর্বল ১০টা আগেভাগে
                </button>
              </div>
            </>
          )}
        </section>

        {all.length > 0 && (
          <section className="rounded-[22px] border-[2.5px] border-ink bg-white p-6">
            <h2 className="m-0 mb-3 font-display text-xl font-bold">কোন ঘরে কতগুলো</h2>
            <div className="grid grid-cols-5 gap-2 text-center">
              {byBox.map((n, b) => (
                <div key={b} className="rounded-xl border-2 border-ink p-2">
                  <div className="font-mono text-2xl font-bold">{bn(n)}</div>
                  <div className="text-xs text-muted">ঘর {bn(b + 1)} · {bn(REVIEW_DAYS[b]!)} দিন</div>
                </div>
              ))}
            </div>
          </section>
        )}
        <p className="m-0 text-sm text-muted">নতুন প্রশ্ন জমাতে <Link to="/" className="font-semibold text-route-deep">শহরে</Link> একটা level খেলুন।</p>
      </main>
    </AppShell>
  );
}
