import { lazy, Suspense, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { levelsForXu, xuChapters, type XuMeta } from '@/content/xu';
import type { XuNote } from '@/content/xu/types';
import { notesMetaById } from '@/content/meta';
import { levelMeta } from '@/content/meta';
import { BookRefs } from '@/features/books/BookRefs';
import { BOOKS } from '@/features/books/catalog';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { AppShell } from '@/shared/ui/AppShell';
import { Block } from '@/widgets/note/Blocks';
import { ChapterLink, vol } from '@/widgets/note/ChapterLink';

const ChapterView = lazy(() => import('@/features/books/BookReader').then((m) => ({ default: m.ChapterView })));

/** Our note on one chapter of Alex Xu's volumes. */
export function XuPage({ meta, note }: { meta: XuMeta; note: XuNote }) {
  const [tab, setTab] = useState<'notes' | 'book'>('notes');
  const ref = { book: meta.book, chapter: meta.chapter };
  const k = xuChapters.findIndex((c) => c.id === meta.id);
  const prev = xuChapters[k - 1], next = xuChapters[k + 1];
  const levels = levelsForXu(meta);
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[820px] flex-col gap-5 px-4 pb-14 pt-6 sm:px-8">
        <Link to="/study" className="self-start font-semibold text-route-deep">{tr('← পড়া', '← Study')}</Link>
        <section className="rounded-[22px] border-[3px] border-ink bg-surface p-5 shadow-block">
          <p className="m-0 text-sm font-bold text-route-deep">{meta.book === 'ddia2' ? 'DDIA' : `Alex Xu · ${vol(meta)}`} · {tr(`অধ্যায় ${bn(meta.chapter)}`, `Chapter ${meta.chapter}`)} <span className="font-normal text-muted">({BOOKS[meta.book].chapters[meta.chapter]})</span></p>
          <h1 className="m-0 font-display text-[30px] font-extrabold leading-tight [text-wrap:balance]">{meta.title}</h1>
          <p className="m-0 mt-2 text-[17px] text-ink-soft">{meta.gist}</p>
          <div className="mt-3 rounded-xl bg-route-soft px-3 py-2">
            <p className="m-0 text-sm font-bold">{tr('শেষে আপনি পারবেন', 'By the end you can')}</p>
            <ul className="m-0 mt-1 flex flex-col gap-0.5 pl-5 text-[15px]">{note.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {note.play && <Link to={note.play.to} params={{ scenarioId: note.play.id }} className="inline-flex min-h-10 items-center rounded-full border-2 border-ink bg-parcel px-3 text-sm font-bold text-night no-underline">🎮 {note.play.label}</Link>}
            {levels.map((l) => <Link key={l} to="/level/$levelId" params={{ levelId: String(l) }} className="inline-flex min-h-10 items-center rounded-full border-2 border-ink bg-surface px-3 text-sm font-semibold text-ink no-underline">Level {bn(l)} · {levelMeta[l]?.title}</Link>)}
            {note.related?.map((id) => notesMetaById[id] && <Link key={id} to="/notes/$noteId" params={{ noteId: id }} className="inline-flex min-h-10 items-center rounded-full border-2 border-ink bg-violet-soft px-3 text-sm font-semibold text-ink no-underline">📝 {notesMetaById[id]!.title}</Link>)}
          </div>
        </section>
        <div role="tablist" aria-label={tr('কী পড়বেন', 'What to read')} className="sticky top-[104px] z-10 flex gap-2 rounded-2xl bg-ground/95 py-1 min-[1360px]:top-[64px]">
          {([['notes', tr('📝 আমাদের নোট', '📝 Our notes')], ['book', tr('📖 বইয়ের অধ্যায়', '📖 The book\'s chapter')]] as const).map(([key, l]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`min-h-11 flex-1 cursor-pointer rounded-xl border-[2.5px] border-ink px-3 font-bold ${tab === key ? 'bg-ink text-on-ink' : 'bg-surface'}`}>{l}</button>
          ))}
        </div>
        {tab === 'notes' ? (
          <>
            {note.blocks.map((b, i) => <Block key={i} b={b} />)}
            <section className="rounded-[20px] border-[3px] border-ink bg-surface p-5">
              <BookRefs refs={[ref]} title={tr('পুরোটা বইয়ে পড়ুন', 'Read the whole chapter in the book')} />
            </section>
          </>
        ) : (
          <Suspense fallback={<p className="m-0 text-muted">{tr('খোলা হচ্ছে…', 'Opening…')}</p>}>
            <p className="m-0 text-sm text-ink-soft">{tr('এই পাতাগুলো আসছে আপনার device-এ রাখা আপনার নিজের PDF থেকে; app-এর server-এ বই নেই।', 'These pages come from your own PDF on this device; the app\'s server has no copy of the book.')}</p>
            <ChapterView refs={[ref]} />
          </Suspense>
        )}
        <nav aria-label={tr('অন্য অধ্যায়', 'Other chapters')} className="grid gap-2 sm:grid-cols-2">
          {prev ? <ChapterLink c={prev} dir="prev" /> : <span />}
          {next && <ChapterLink c={next} dir="next" />}
        </nav>
      </main>
    </AppShell>
  );
}
