import { useEffect, useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { chapters, levelMeta } from '@/content/meta';
import { whenIdle } from '@/shared/lib/idle';
import { dueCards, levelState, lockReason, masteryOf } from '@/entities/progress/selectors';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { masteryLabel } from '@/shared/lib/scoring';
import { AppShell } from '@/shared/ui/AppShell';
import { CityMap, type MapStopView } from '@/widgets/city-map/CityMap';
import { tr } from '@/shared/lib/i18n';
import { PlanCard } from '@/widgets/plan/PlanCard';

/** Where to land: the placement test's start chapter, else the chapter with the first open, unplayed level. */
function startingPoint(p: ReturnType<typeof useProgress.getState>) {
  const placed = p.placement?.start != null ? chapters.find((c) => c.id === p.placement!.start) : undefined;
  if (placed) {
    const i = placed.levels.findIndex((id) => levelState(id, p) === 'open');
    if (i >= 0) return { chapter: placed.id, index: i };
  }
  for (const c of chapters) {
    const i = c.levels.findIndex((id) => levelState(id, p) === 'open');
    if (i >= 0) return { chapter: c.id, index: i };
  }
  return { chapter: 6, index: 0 };
}

export function MapPage() {
  const p = useProgress();
  const [start] = useState(() => startingPoint(useProgress.getState()));
  const [chapterId, setChapterId] = useState(start.chapter);
  const [sel, setSel] = useState(start.index);

  const chapter = chapters.find((c) => c.id === chapterId)!;
  const stops: MapStopView[] = chapter.levels.map((id) => ({ level: levelMeta[id]!, state: levelState(id, p), stars: p.levels[id]?.stars ?? 0 }));
  const S = stops[Math.min(sel, stops.length - 1)]!;
  const rec = p.levels[S.level.id];
  const reason = lockReason(S.level.id, p);
  const due = dueCards(p).length;
  const setSkipPlacement = useProgress((s) => s.setSkipPlacement);
  // someone who has not played yet chooses: find out where to start, or begin at level 1
  const fresh = Object.keys(p.levels).length === 0 && !p.placement && !p.settings.skipPlacement;
  const placed = new Set(p.placement?.mastered ?? []);

  // fetch the selected level (its page's code and its chapter) while the learner looks at the map, so Play opens at once
  const router = useRouter();
  const playable = !reason;
  useEffect(() => {
    if (!playable) return;
    return whenIdle(() => {
      void router.preloadRoute({ to: '/level/$levelId', params: { levelId: String(S.level.id) } }).catch(() => { /* fetched again on Play */ });
    });
  }, [router, S.level.id, playable]);

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[1280px] flex-col gap-4 px-4 pb-10 pt-5 sm:px-8">
        {fresh && (
          <section aria-labelledby="start-where" className="flex flex-wrap items-center gap-4 rounded-[20px] border-[3px] border-ink bg-surface p-5 shadow-[0_6px_0_var(--color-shadow)]">
            <div className="min-w-0 flex-[1_1_320px]">
              <p className="m-0 text-sm font-bold text-route-deep">{tr('স্বাগতম!', 'Welcome!')}</p>
              <h2 id="start-where" className="m-0 font-display text-2xl font-extrabold">{tr('কোথা থেকে শুরু করবেন?', 'Where would you like to start?')}</h2>
              <p className="m-0 mt-1 max-w-[62ch] text-ink-soft">{tr('System design আগে থেকে কিছুটা জানলে ৫ মিনিটের placement test দিন: জানা অধ্যায় খুলে যাবে, শুরু করবেন নতুন জায়গা থেকে। একদম নতুন হলে Level ১ থেকে।', 'If you already know some system design, take the 5-minute placement test: chapters you know open up and you start where it gets new. New to it? Start at level 1.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/placement" className="btn-press inline-flex min-h-[52px] items-center rounded-2xl border-[3px] border-ink bg-parcel px-5 font-display text-lg font-extrabold text-night no-underline shadow-[0_4px_0_var(--color-shadow)]">{tr('Placement test · ৫ মিনিট', 'Placement test · 5 min')}</Link>
              <button type="button" onClick={() => setSkipPlacement(true)} className="min-h-[52px] cursor-pointer rounded-2xl border-[2.5px] border-ink bg-surface px-4 font-semibold">{tr('Level ১ থেকে শুরু', 'Start at level 1')}</button>
            </div>
          </section>
        )}
        <PlanCard />
        <nav aria-label={tr('অধ্যায়', 'Chapters')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {chapters.map((c) => {
            const done = c.levels.filter((id) => levelState(id, p) === 'done').length;
            const firstLocked = !!lockReason(c.levels[0]!, p);
            const active = c.id === chapterId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => { setChapterId(c.id); setSel(Math.max(0, c.levels.findIndex((id) => levelState(id, p) === 'open'))); }}
                className={`relative flex min-w-[150px] flex-none cursor-pointer flex-col items-start rounded-2xl border-[2.5px] px-3.5 py-2 text-left font-[inherit] ${active ? 'border-ink bg-ink text-on-ink shadow-[0_4px_0_var(--color-parcel)]' : 'border-ink bg-surface text-ink'}`}
              >
                <span className="text-xs font-bold opacity-80">{tr('অধ্যায়', 'Chapter')} {bn(c.id)} {firstLocked ? tr('· তালা', '· locked') : placed.has(c.id) ? tr('· জানা ✓', '· known ✓') : ''}</span>
                <span className="font-display text-[15px] font-bold leading-tight">{c.title}</span>
                <span className="mt-1 flex w-full gap-1">
                  {c.levels.map((id) => {
                    const st = levelState(id, p);
                    return <span key={id} className="h-1.5 flex-1 rounded-full" style={{ background: st === 'done' ? c.accent : st === 'open' ? 'var(--color-parcel)' : active ? 'var(--color-on-ink-line)' : 'var(--color-locked)' }} />;
                  })}
                </span>
                <span className="sr-only">{bn(done)}/{bn(c.levels.length)} {tr('পাস', 'passed')}</span>
              </button>
            );
          })}
        </nav>

        <CityMap
          key={chapter.id}
          chapter={chapter}
          stops={stops}
          selected={Math.min(sel, stops.length - 1)}
          onSelect={setSel}
        />

        <div className="flex flex-wrap items-stretch gap-4">
          <section key={S.level.id} aria-live="polite" className="pop-in box-border min-w-0 flex-[999_1_460px] rounded-[20px] border-[3px] border-ink bg-surface px-5 py-5 shadow-[0_6px_0_var(--color-shadow)]">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="grid h-14 w-14 flex-none place-items-center rounded-full border-[3px] border-ink font-display text-[26px] font-extrabold leading-none" style={{ background: S.state === 'done' ? chapter.accent : S.state === 'open' ? 'var(--color-parcel)' : 'var(--color-locked)', color: S.state === 'done' ? 'var(--color-white)' : 'var(--color-night)' }}>{bn(S.level.id)}</span>
              <div className="min-w-0 flex-[1_1_200px]">
                <h2 className="m-0 font-display text-[26px] font-extrabold leading-[1.2]">{S.level.title}</h2>
                <span className="mt-0.5 inline-block rounded-lg bg-route-soft px-2.5 py-0.5 text-[13px] font-bold text-route-deep">{S.level.concept}</span>
              </div>
              {rec && (
                <div className="text-right">
                  <div className="text-xs font-semibold text-muted">{tr('সেরা', 'Best')} · {masteryLabel[masteryOf(S.level.id, p)]}</div>
                  <div className="font-mono text-[26px] font-bold">{bn(rec.best)}<span className="text-base text-muted">/{bn(100)}</span></div>
                </div>
              )}
            </div>
            <p className="mb-1 mt-3 font-display text-lg font-bold text-coral-deep">“{S.level.story}”</p>
            <p className="mb-4 mt-0 text-ink-soft">{S.level.briefing}</p>
            {reason ? (
              <p className="m-0 rounded-[14px] border-[2.5px] border-dashed border-line-strong px-4 py-3 font-semibold text-muted">{tr('তালাবদ্ধ', 'Locked')} · {reason}</p>
            ) : (
              <Link to="/level/$levelId" params={{ levelId: String(S.level.id) }} viewTransition className="btn-press inline-flex min-h-[52px] items-center justify-center rounded-2xl border-[3px] border-ink bg-parcel px-8 font-display text-[21px] font-extrabold text-night no-underline shadow-[0_5px_0_var(--color-shadow)]">
                {rec ? tr('আবার খেলুন', 'Play again') : tr('খেলুন', 'Play')} · ~{bn(S.level.minutes)} {tr('মিনিট', 'min')}
              </Link>
            )}
          </section>
          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
            <Link to="/review" className="btn-press flex min-h-[64px] items-center justify-between gap-3 rounded-[18px] border-[3px] border-ink bg-night px-4.5 py-2.5 text-white no-underline shadow-[0_5px_0_var(--color-route)]">
              <span><span className="block font-display text-xl font-extrabold">{tr('আজকের review', 'Today\'s review')}</span><span className="text-sm text-on-night-soft">{due ? tr(`${bn(due)}টা প্রশ্ন অপেক্ষায়`, `${due} questions waiting`) : tr('আজ কিছু বাকি নেই', 'Nothing left for today')}</span></span>
              <span className="grid h-10 w-10 place-items-center rounded-full font-mono text-lg font-bold" style={{ background: due ? 'var(--color-coral)' : 'var(--color-night-chip)' }}>{bn(due)}</span>
            </Link>
            <Link to="/practice" className="btn-press flex min-h-[64px] items-center justify-between gap-3 rounded-[18px] border-[3px] border-ink bg-surface px-4.5 py-2.5 text-ink no-underline shadow-[0_5px_0_var(--color-shadow)]">
              <span><span className="block font-display text-xl font-extrabold">Practice</span><span className="text-sm text-muted">{tr('Estimation, design challenge, মুখে বলা', 'Estimation, design challenge, speaking aloud')}</span></span>
              <span aria-hidden="true" className="text-2xl">→</span>
            </Link>
            <p className="m-0 rounded-[16px] border-2 border-ink bg-surface px-4 py-3 text-sm text-ink-soft">
              {chapter.subtitle}{tr('। Level-এ ', '. Score ')}{bn(50)}{tr('+ পেলে পরেরটা খোলে; অধ্যায়ের শেষ level-এ ', '+ on a level to open the next; ')}{bn(70)}{tr('+ পেলে পরের অধ্যায়।', '+ on a chapter\'s last level to open the next chapter.')}
            </p>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
