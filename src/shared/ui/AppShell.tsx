import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { dueCards, streak, totalXp } from '@/entities/progress/selectors';
import { useProgress } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { play } from '@/shared/lib/sound';
import { isEn, switchLang, tr } from '@/shared/lib/i18n';
import { AuthButton } from '@/features/auth/AuthUi';

const NAV = [
  { to: '/', label: tr('শহর', 'City') },
  { to: '/study', label: tr('পড়া', 'Study') },
  { to: '/practice', label: 'Practice' },
  { to: '/builder', label: 'Builder' },
  { to: '/incident', label: 'Incident' },
  { to: '/mock', label: 'Mock' },
  { to: '/review', label: 'Review' },
  { to: '/profile', label: tr('প্রোফাইল', 'Profile') },
] as const;

/** Header with the main screens, XP and streak; used by every screen except a level. */
export function AppShell({ children }: { children: ReactNode }) {
  const p = useProgress();
  const due = dueCards(p).length;
  const days = streak(p);
  const soundOn = p.settings.sound ?? true;
  const navLinks = (compact: boolean) => NAV.map((n) => (
    <Link
      key={n.to}
      to={n.to}
      activeOptions={{ exact: true }}
      className={`flex-none whitespace-nowrap rounded-full font-semibold text-ink no-underline hover:bg-[#F0F2EC] ${compact ? 'px-3 py-1.5 text-sm' : 'px-3.5 py-2'}`}
      activeProps={{ className: 'bg-ink text-white hover:bg-ink' }}
    >
      {n.label}
      {n.to === '/review' && due > 0 && <span className="ml-1.5 inline-block min-w-5 rounded-full bg-coral px-1.5 text-center text-xs text-white">{bn(due)}</span>}
    </Link>
  ));
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b-[3px] border-ink bg-white">
        <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-8 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-x-6">
            <Link to="/" className="flex flex-none items-center gap-2.5 text-ink no-underline" aria-label="ParcelGo">
              <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true"><rect x="3" y="7" width="28" height="22" rx="4" fill="#FFC02E" stroke="#16252D" strokeWidth="2.5" /><path d="M3 14h28M17 7v7" stroke="#16252D" strokeWidth="2.5" /></svg>
              <span className="hidden font-display text-[24px] font-extrabold min-[420px]:inline">ParcelGo</span>
            </Link>
            <nav aria-label={tr('প্রধান', 'Main')} className="hidden flex-wrap gap-1 xl:flex">{navLinks(false)}</nav>
          </div>
          <div className="flex flex-none items-center gap-1.5 font-bold sm:gap-2">
            <span className="flex h-10 items-center gap-1.5 rounded-xl border-[2.5px] border-ink bg-parcel-soft px-2 sm:px-3" title={tr('টানা কত দিন খেলেছেন', 'Days played in a row')}>
              <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M8 1c1 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 2-6 1 1 2 2 2 3 1-2 2-4 2-7z" fill={days > 0 ? '#E0483E' : '#C9D0C3'} stroke="#16252D" strokeWidth="1.5" /></svg>
              {bn(days)}<span className="hidden sm:inline"> {tr('দিন', days === 1 ? 'day' : 'days')}</span>
            </span>
            <span className="hidden h-10 items-center rounded-xl border-[2.5px] border-ink px-3 font-mono sm:flex">{bn(totalXp(p))} XP</span>
            <button type="button" onClick={() => switchLang(isEn ? 'bn' : 'en')} lang={isEn ? 'bn' : 'en'}
              aria-label={isEn ? 'বাংলায় দেখুন' : 'Switch to English'} title={isEn ? 'বাংলায় দেখুন' : 'Switch to English'}
              className="h-10 min-w-10 cursor-pointer rounded-xl border-[2.5px] border-ink bg-white px-2 font-bold">
              {isEn ? 'বাং' : 'EN'}
            </button>
            <button type="button" aria-pressed={soundOn} aria-label={soundOn ? tr('শব্দ বন্ধ করুন', 'Turn sound off') : tr('শব্দ চালু করুন', 'Turn sound on')} title={soundOn ? tr('শব্দ চালু', 'Sound on') : tr('শব্দ বন্ধ', 'Sound off')}
              onClick={() => { p.setSound(!soundOn); if (!soundOn) play('tap'); }}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border-[2.5px] border-ink bg-white">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-4v12l-4-4H3z" fill="#16252D" />{soundOn ? <path d="M13 7c1.5 1.5 1.5 4.5 0 6M15.5 5c3 3 3 7 0 10" stroke="#16252D" strokeWidth="1.8" fill="none" strokeLinecap="round" /> : <path d="M13 7l5 6M18 7l-5 6" stroke="#E0483E" strokeWidth="2" strokeLinecap="round" />}</svg>
            </button>
            <AuthButton />
          </div>
        </div>
        <nav aria-label={tr('প্রধান', 'Main')} className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-8 xl:hidden">{navLinks(true)}</nav>
      </header>
      {children}
    </div>
  );
}
