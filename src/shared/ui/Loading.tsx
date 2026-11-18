import { tr } from '@/shared/lib/i18n';

/** Shown while a screen's content downloads (usually a moment, and only the first time). */
export function PageLoading({ label }: { label?: string }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-8" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <svg width="44" height="44" viewBox="0 0 34 34" className="animate-bounce" aria-hidden="true"><rect x="3" y="7" width="28" height="22" rx="4" fill="var(--color-parcel)" stroke="var(--color-night)" strokeWidth="2.5" /><path d="M3 14h28M17 7v7" stroke="var(--color-night)" strokeWidth="2.5" /></svg>
        <p className="m-0 font-bold" role="status">{label ?? tr('আনা হচ্ছে…', 'Loading…')}</p>
      </div>
    </main>
  );
}

/**
 * A download failed: usually no network on a screen not opened before, or a new version
 * was published and this tab still asks for the old files. Retry first; reload gets the new version.
 */
export function LoadFailed({ onRetry }: { onRetry?: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-8 text-center" role="alert">
      <div className="flex max-w-md flex-col items-center gap-3">
        <p className="m-0 font-display text-xl font-extrabold">{tr('এই অংশটা আনা গেল না', 'Could not load this part')}</p>
        <p className="m-0 text-muted">{tr('Internet আছে কিনা দেখুন। নতুন version এসে থাকলে page reload করলেই ঠিক হবে।', 'Check your connection. If a new version came out, reloading the page fixes it.')}</p>
        <div className="flex gap-2">
          {onRetry && <button type="button" onClick={onRetry} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-surface px-4 font-bold">{tr('আবার চেষ্টা', 'Try again')}</button>}
          <button type="button" onClick={() => location.reload()} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-parcel px-4 font-bold">{tr('Reload', 'Reload')}</button>
        </div>
      </div>
    </main>
  );
}
