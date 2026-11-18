import { lazy, Suspense } from 'react';
import { useReader } from './shelf';
import { tr } from '@/shared/lib/i18n';

const BookReader = lazy(() => import('./BookReader'));

/** Mounted once at the root, so a book can open over any screen without leaving it. */
export function ReaderHost() {
  const ref = useReader((s) => s.ref);
  if (!ref) return null;
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-night-chip-2 font-semibold text-white">{tr('Reader আসছে…', 'Opening the reader…')}</div>}>
      <BookReader />
    </Suspense>
  );
}
