import { Link } from '@tanstack/react-router';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { Game } from '@/game/ui/Game';
import type { Scenario } from '@/game/types';

const back = { to: '/practice', search: { tab: 'lab' } } as const;

/** "ParcelGo বাঁচাও": one scenario, full screen, with its own slim header like a level's. */
export function GamePage({ sc }: { sc: Scenario }) {
  return (
    <div className="min-h-screen bg-ground">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-1 border-b-[3px] border-ink bg-surface px-4 py-3 sm:px-8">
        <Link {...back} className="inline-flex min-h-11 items-center gap-1.5 font-bold text-route-deep no-underline hover:text-ink">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3L5 9l6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Practice
        </Link>
        <h1 className="m-0 font-display text-[22px] font-extrabold">ParcelGo {tr('বাঁচাও', 'under fire')} · Level {bn(sc.level)}: {sc.title}</h1>
        <span className="rounded-full border-2 border-ink bg-parcel-soft px-2.5 py-0.5 text-xs font-bold">{tr('নমুনা', 'Preview')}</span>
      </header>
      <main className="mx-auto box-border flex max-w-[880px] flex-col gap-3 px-4 pb-12 pt-4 sm:px-8">
        <p className="m-0 max-w-[62ch] text-[16px] text-ink-soft">{sc.story}</p>
        <Game sc={sc} exit={<Link {...back} className="inline-flex min-h-12 items-center rounded-2xl border-[2.5px] border-ink bg-surface px-5 font-semibold text-ink no-underline">{tr('Practice-এ ফিরুন', 'Back to practice')}</Link>} />
      </main>
    </div>
  );
}
