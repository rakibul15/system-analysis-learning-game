import { useEffect } from 'react';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { BOOKS, refLabel, withPages, type BookRef } from './catalog';
import { bookFor, useReader, useShelf } from './shelf';
import { Link } from '@tanstack/react-router';
import { notesForLevel, timelinesForLevel } from '@/content/meta';

/** "Read it in the book": each reference opens the learner's own copy at that place. */
export function BookRefs({ refs, title = tr('বইয়ে পড়ুন', 'Read it in the book'), className = '', level }: { refs: BookRef[] | undefined; title?: string; className?: string; level?: number }) {
  const { books, loaded, refresh } = useShelf();
  const open = useReader((s) => s.open);
  useEffect(() => { if (!loaded) void refresh(); }, [loaded, refresh]);
  if (!refs?.length) return null;
  return (
    <div className={`text-left ${className}`}>
      {level !== undefined && notesForLevel(level).map((n) => (
        <Link key={n.id} to="/notes/$noteId" params={{ noteId: n.id }} className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink bg-route-soft px-3 py-1.5 font-semibold text-ink no-underline">📝 {tr('আমাদের নোট:', 'Our notes:')} {n.title} →</Link>
      ))}
      {level !== undefined && timelinesForLevel(level).map((t) => (
        <Link key={t.id} to="/deep/$deepId" params={{ deepId: t.id }} className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink bg-violet-soft px-3 py-1.5 font-semibold text-ink no-underline">🔍 {tr('গভীরে, ধাপে ধাপে:', 'Deeper, step by step:')} {t.title} →</Link>
      ))}
      {title && <p className="m-0 text-sm font-bold text-route-deep">📖 {title}</p>}
      <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
        {refs.map((given, i) => {
          const r = withPages(given);
          const { book, where } = refLabel(r);
          const have = !!bookFor(books, r.book);
          return (
            <li key={i}>
              <button type="button" onClick={() => open(r)} title={BOOKS[r.book].title}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border-2 border-ink bg-surface px-3 py-1.5 text-left font-[inherit] hover:bg-surface-sunk">
                <span className={`flex-none rounded-md px-1.5 py-0.5 text-xs font-bold ${r.book === 'ddia2' ? 'bg-violet-soft text-violet-deep' : 'bg-parcel-soft text-parcel-deep'}`}>{book}</span>
                <span className="min-w-0 flex-1 text-sm font-semibold">{where}</span>
                {r.pages && <span className="flex-none font-mono text-xs text-muted">{tr('পাতা', 'p.')} {bn(r.pages[0], { grouping: false })}{r.pages[1] !== r.pages[0] ? `–${bn(r.pages[1], { grouping: false })}` : ''}</span>}
                <span aria-hidden="true" className="flex-none text-sm">{have ? '→' : '+'}</span>
                <span className="sr-only">{have ? tr('বইয়ে খুলুন', 'open in the book') : tr('বই যোগ করে খুলুন', 'add the book to open')}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
