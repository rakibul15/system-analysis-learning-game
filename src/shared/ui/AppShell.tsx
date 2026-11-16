import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { dueCards, streak, totalXp } from '@/entities/progress/selectors';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';

const NAV = [
  { to: '/', label: 'শহর' },
  { to: '/practice', label: 'Practice' },
  { to: '/review', label: 'Review' },
  { to: '/profile', label: 'প্রোফাইল' },
] as const;

/** Header with the main screens, XP and streak; used by every screen except a level. */
export function AppShell({ children }: { children: ReactNode }) {
  const p = useProgress();
  const due = dueCards(p).length;
  const days = streak(p);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-[3px] border-ink bg-white px-4 py-2.5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/" className="flex items-center gap-2.5 text-ink no-underline">
            <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true"><rect x="3" y="7" width="28" height="22" rx="4" fill="#FFC02E" stroke="#16252D" strokeWidth="2.5" /><path d="M3 14h28M17 7v7" stroke="#16252D" strokeWidth="2.5" /></svg>
            <span className="font-display text-[24px] font-extrabold">ParcelGo</span>
          </Link>
          <nav aria-label="প্রধান" className="flex flex-wrap gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-full px-3.5 py-2 font-semibold text-ink no-underline hover:bg-[#F0F2EC]"
                activeProps={{ className: 'bg-ink text-white hover:bg-ink' }}
              >
                {n.label}
                {n.to === '/review' && due > 0 && <span className="ml-1.5 inline-block min-w-5 rounded-full bg-coral px-1.5 text-center text-xs text-white">{bn(due)}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-bold">
          <span className="flex items-center gap-1.5 rounded-xl border-[2.5px] border-ink bg-parcel-soft px-3 py-1.5" title="টানা কত দিন খেলেছেন">
            <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M8 1c1 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 2-6 1 1 2 2 2 3 1-2 2-4 2-7z" fill={days > 0 ? '#E0483E' : '#C9D0C3'} stroke="#16252D" strokeWidth="1.5" /></svg>
            {bn(days)} দিন
          </span>
          <span className="rounded-xl border-[2.5px] border-ink px-3 py-1.5 font-mono">{bn(totalXp(p))} XP</span>
        </div>
      </header>
      {children}
    </div>
  );
}
