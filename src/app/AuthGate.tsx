import { useEffect, useState, type ReactNode } from 'react';
import { hasSession, useAuth } from '@/features/auth/auth';
import { LandingPage } from '@/pages/landing/LandingPage';
import { tr } from '@/shared/lib/i18n';

/**
 * Signed-in learners see the game; everyone else sees the landing page.
 * A returning learner gets a short splash while the session restores, and if it
 * cannot restore (offline), the game opens with the progress saved on this device.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const remembered = hasSession();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!remembered || user) return;
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, [remembered, user]);

  // end-to-end checks of the game screens build with VITE_E2E=1 (never set for production)
  if (user || (import.meta.env.VITE_E2E === '1' && !e2eGuest())) return <>{children}</>;
  if (remembered && status !== 'ready') {
    if (gaveUp) return <>{children}</>;
    return (
      <main className="grid min-h-screen place-items-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <svg width="56" height="56" viewBox="0 0 34 34" className="animate-bounce" aria-hidden="true"><rect x="3" y="7" width="28" height="22" rx="4" fill="var(--color-parcel)" stroke="var(--color-night)" strokeWidth="2.5" /><path d="M3 14h28M17 7v7" stroke="var(--color-night)" strokeWidth="2.5" /></svg>
          <p className="m-0 font-bold">{tr('আপনার progress আনা হচ্ছে…', 'Loading your progress…')}</p>
        </div>
      </main>
    );
  }
  return <LandingPage />;
}

/** In end-to-end builds only: a test can ask to be a signed-out guest to check the landing page. */
function e2eGuest() {
  try { return localStorage.getItem('e2e-guest') === '1'; } catch { return false; }
}
