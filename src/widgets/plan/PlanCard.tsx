import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useProgress } from '@/entities/progress/store';
import { challenges } from '@/features/builder/model';
import { levelTitle, planToday, type PlanTask } from '@/features/plan/plan';
import { bn } from '@/shared/lib/bn';
import { dayKey } from '@/shared/lib/scoring';
import { tr } from '@/shared/lib/i18n';

const MINUTES = [15, 30, 45, 60, 90] as const;

function taskText(t: PlanTask): { title: string; note: string } {
  switch (t.kind) {
    case 'review': return { title: tr(`${bn(t.count ?? 0)}টা review`, `${t.count} reviews`), note: tr('ভুলে যাওয়ার আগে ফিরে আসা প্রশ্ন', 'Questions back just before you forget') };
    case 'rebuild': return { title: tr(`না দেখে আঁকুন: ${challenges.find((c) => c.id === t.challengeId)?.title}`, `Redraw from memory: ${challenges.find((c) => c.id === t.challengeId)?.title}`), note: tr('নিয়ম লুকানো, শুধু brief', 'Rules hidden, brief only') };
    case 'level': return { title: `Level ${bn(t.levelId!)} · ${levelTitle(t.levelId!)}`, note: tr('নতুন level', 'New level') };
    case 'weak': return { title: `Level ${bn(t.levelId!)} · ${levelTitle(t.levelId!)}`, note: tr('দুর্বল জায়গা, আবার খেলুন', 'Weak spot, play it again') };
    case 'mock': return { title: tr('৪৫ মিনিটের mock interview', '45-minute mock interview'), note: tr('Timer চালু, আসলের মতো', 'Timer on, like the real thing') };
    case 'read': return { title: tr(`DDIA অধ্যায় ${bn(t.chapter!)} পড়ুন`, `Read DDIA chapter ${t.chapter}`), note: tr('পড়া শেষে নিজের নোট', 'Write your own notes after') };
    case 'guided': return { title: tr('ধাপে ধাপে design', 'Step-by-step design'), note: tr('একটা পুরো সমস্যা, checklist সহ', 'One full problem, with a checklist') };
  }
}

function TaskLink({ t, children }: { t: PlanTask; children: React.ReactNode }) {
  const cls = 'flex min-h-14 flex-1 items-center gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2 text-ink no-underline hover:bg-[#F7F8F3]';
  if (t.kind === 'level' || t.kind === 'weak') return <Link to="/level/$levelId" params={{ levelId: String(t.levelId) }} className={cls}>{children}</Link>;
  if (t.kind === 'review') return <Link to="/review" className={cls}>{children}</Link>;
  if (t.kind === 'rebuild') return <Link to="/builder" search={{ memory: t.challengeId }} className={cls}>{children}</Link>;
  if (t.kind === 'mock') return <Link to="/mock" className={cls}>{children}</Link>;
  if (t.kind === 'read') return <Link to="/reading" className={cls}>{children}</Link>;
  return <Link to="/practice" search={{ tab: 'guided' }} className={cls}>{children}</Link>;
}

/** Today's plan, built from the interview date and the minutes a day the learner has. */
export function PlanCard() {
  const p = useProgress();
  const setPlan = useProgress((s) => s.setPlan);
  const plan = planToday(p);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(p.settings.interviewDate ?? '');
  const [minutes, setMinutes] = useState(p.settings.dailyMinutes ?? 30);
  const done = plan.tasks.filter((t) => t.done).length;
  const total = plan.tasks.length;
  const totalMin = plan.tasks.reduce((s, t) => s + t.minutes, 0);
  const hasDate = !!p.settings.interviewDate;

  const editor = (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setPlan(date || null, minutes); setEditing(false); }}>
      <label className="flex flex-col gap-1 text-sm font-semibold">{tr('Interview-এর তারিখ', 'Interview date')}
        <input type="date" value={date} min={dayKey()} onChange={(e) => setDate(e.target.value)} className="min-h-11 rounded-xl border-2 border-ink bg-white px-3 font-[inherit]" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">{tr('প্রতিদিন কত সময়', 'Time per day')}
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="min-h-11 rounded-xl border-2 border-ink bg-white px-3 font-[inherit]">
          {MINUTES.map((m) => <option key={m} value={m}>{tr(`${bn(m)} মিনিট`, `${m} minutes`)}</option>)}
        </select>
      </label>
      <button type="submit" className="btn-press min-h-11 cursor-pointer rounded-xl border-[2.5px] border-ink bg-parcel px-5 font-bold shadow-[0_3px_0_#16252D]">{tr('Plan বানান', 'Make the plan')}</button>
      {hasDate && <button type="button" onClick={() => { setPlan(null, minutes); setDate(''); setEditing(false); }} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-semibold">{tr('তারিখ মুছুন', 'Clear date')}</button>}
    </form>
  );

  const headline =
    plan.phase === 'learn' ? tr(`Interview ${bn(plan.daysLeft!)} দিন পর · প্রতিদিন ${bn(plan.needPerDay)}টা level`, `Interview in ${plan.daysLeft} days · ${plan.needPerDay} levels a day`)
    : plan.phase === 'final' ? (plan.daysLeft === 0 ? tr('আজ interview! হালকা review, বেশি চাপ নয়', 'Interview today! Light review, no cramming') : tr(`Interview ${bn(plan.daysLeft!)} দিন পর · শেষ প্রস্তুতি`, `Interview in ${plan.daysLeft} days · final prep`))
    : plan.phase === 'after' ? tr('Interview-এর তারিখ পার হয়ে গেছে', 'The interview date has passed')
    : tr('আজকের কাজ', 'Today\'s work');

  return (
    <section aria-label={tr('আজকের plan', 'Today\'s plan')} className="rounded-[20px] border-[3px] border-ink bg-parcel-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-route-deep">{tr('আজকের plan', 'Today\'s plan')}</p>
          <h2 className="m-0 font-display text-xl font-extrabold [text-wrap:balance]">{headline}</h2>
          {plan.phase === 'learn' && (
            <p className={`m-0 mt-1 text-sm font-semibold ${plan.onTrack ? 'text-route-deep' : 'text-coral-deep'}`}>
              {plan.onTrack
                ? tr(`ঠিক পথে আছেন · বাকি ${bn(plan.remaining)}টা level`, `On track · ${plan.remaining} levels left`)
                : tr(`${bn(minutes)} মিনিটে দিনে ${bn(plan.fitPerDay)}টা হয়, লাগবে ${bn(plan.needPerDay)}টা। সময় বাড়ান, অথবা জানা level বাদ দিতে Profile-এ "সব level খুলে দিন"।`, `${minutes} minutes fit ${plan.fitPerDay} a day; you need ${plan.needPerDay}. Add time, or skip levels you know with "Unlock every level" in Profile.`)}
            </p>
          )}
          {plan.phase === 'after' && <p className="m-0 mt-1 text-sm">{tr('কেমন হলো? পরের interview-এর তারিখ দিন, নতুন plan বানিয়ে দেব।', 'How did it go? Set the next interview date and I will make a new plan.')}</p>}
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            {total > 0 && <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-sm font-bold">{bn(done)}/{bn(total)} · ~{bn(totalMin)} {tr('মি', 'min')}</span>}
            <button type="button" onClick={() => setEditing(true)} className="min-h-10 cursor-pointer rounded-xl border-2 border-ink bg-white px-3 text-sm font-semibold">{hasDate ? tr('বদলান', 'Change') : tr('তারিখ দিন', 'Set date')}</button>
          </div>
        )}
      </div>

      {editing && <div className="mt-3">{editor}</div>}
      {!hasDate && !editing && <p className="m-0 mt-1 text-sm text-ink-soft">{tr('Interview কবে জানালে প্রতিদিন কয়টা level, কোন review আর কবে mock, সব হিসাব করে দেব।', 'Tell me when the interview is and I will work out how many levels a day, which reviews, and when to do mocks.')}</p>}

      {total > 0 && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white" aria-hidden="true"><div className="h-full rounded-full bg-route transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} /></div>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0 md:grid-cols-2">
            {plan.tasks.map((t) => {
              const { title, note } = taskText(t);
              return (
                <li key={t.id} className="flex min-w-0">
                  <TaskLink t={t}>
                    <span aria-hidden="true" className={`grid h-7 w-7 flex-none place-items-center rounded-full border-2 border-ink text-sm font-bold ${t.done ? 'bg-route text-white' : 'bg-white'}`}>{t.done ? '✓' : ''}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-bold ${t.done ? 'text-muted line-through' : ''}`}>{title}</span>
                      <span className="block truncate text-xs text-muted">{note} · {bn(t.minutes)} {tr('মি', 'min')}</span>
                    </span>
                    <span className="sr-only">{t.done ? tr('শেষ', 'done') : tr('বাকি', 'to do')}</span>
                  </TaskLink>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
