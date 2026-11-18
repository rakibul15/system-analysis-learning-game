import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { tr } from '@/shared/lib/i18n';

const HOUR = 60 * 60 * 1000;

/*
 * The app works offline from a cached copy. When a new version is published, it downloads
 * in the background and waits; this notice offers to switch. Until the learner does (or
 * closes every tab), the old version keeps running with all of its own files, so a lesson
 * in progress never asks for a file the new version no longer has.
 */
export function UpdateNotice() {
  const [later, setLater] = useState(false);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // an app left open for days should still hear about new versions
      let last = Date.now();
      const check = () => { last = Date.now(); void reg.update().catch(() => undefined); };
      setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - last > 10 * 60 * 1000) check();
      });
    },
  });
  // ask again on the next new version even after "later"
  useEffect(() => { if (!needRefresh) setLater(false); }, [needRefresh]);

  if (!needRefresh || later) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))]">
      <div className="pop-in flex w-full max-w-[520px] flex-wrap items-center gap-3 rounded-2xl border-[3px] border-ink bg-white p-3 shadow-[0_5px_0_#16252D]">
        <p className="m-0 min-w-0 flex-1 font-semibold">{tr('ParcelGo-র নতুন version এসেছে।', 'A new version of ParcelGo is ready.')} <span className="font-normal text-ink-soft">{tr('হাতের level শেষ করে reload করুন।', 'Finish the level in hand, then reload.')}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void updateServiceWorker(true)} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-parcel px-4 font-bold">{tr('Reload', 'Reload')}</button>
          <button type="button" onClick={() => setLater(true)} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-white px-3 font-semibold">{tr('পরে', 'Later')}</button>
        </div>
      </div>
    </div>
  );
}
