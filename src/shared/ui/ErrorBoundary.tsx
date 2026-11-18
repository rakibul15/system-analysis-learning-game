import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportCrash } from '@/shared/lib/crash';
import { tr } from '@/shared/lib/i18n';

interface Props {
  children: ReactNode;
  /** What to show instead, with a way to try the part again. Default: CrashFallback. */
  fallback?: (retry: () => void) => ReactNode;
}

/**
 * Catches a crash in its part of the screen: reports it (crash.ts) and shows a way on, instead of
 * the whole app going blank. Wrap the parts most likely to break (a simulator) so the rest of the
 * screen keeps working.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { reportCrash(error, 'render', info.componentStack ?? ''); }
  retry = () => this.setState({ failed: false });
  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.fallback ? this.props.fallback(this.retry) : <CrashFallback onRetry={this.retry} />;
  }
}

/** Something broke here (not a failed download: that is LoadFailed). */
export function CrashFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-8 text-center" role="alert">
      <div className="flex max-w-md flex-col items-center gap-3">
        <p className="m-0 font-display text-xl font-extrabold">{tr('এখানে কিছু একটা ভেঙে গেছে', 'Something broke here')}</p>
        <p className="m-0 text-muted">{tr('দোষটা আমাদের। খবরটা আমাদের কাছে পাঠানো হচ্ছে, আপনার progress ঠিক আছে।', 'Our fault. We are being told about it, and your progress is safe.')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && <button type="button" onClick={onRetry} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-4 font-bold">{tr('আবার চেষ্টা', 'Try again')}</button>}
          {/* a plain link: this can show outside the router */}
          <a href="#/" onClick={() => setTimeout(() => location.reload(), 0)} className="btn-press inline-flex min-h-11 items-center rounded-xl border-2 border-ink bg-parcel px-4 font-bold text-ink no-underline">{tr('শহরে ফিরুন', 'Back to the city')}</a>
        </div>
      </div>
    </main>
  );
}

/**
 * End-to-end builds only (VITE_E2E=1, never production): throws when localStorage['e2e-crash']
 * names this probe, so a test can check what a learner sees when a part of the app breaks.
 */
export function E2ECrashProbe({ name }: { name: string }) {
  if (import.meta.env.VITE_E2E === '1') {
    let armed = false;
    try { armed = localStorage.getItem('e2e-crash') === name; } catch { /* storage blocked */ }
    if (armed) throw new Error(`e2e: ${name} broke on purpose`);
  }
  return null;
}
