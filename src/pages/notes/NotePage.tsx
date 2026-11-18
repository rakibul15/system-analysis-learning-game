import { lazy, Suspense, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Note } from '@/content/notes';
import { BookRefs } from '@/features/books/BookRefs';
import { levelMeta, timelinesForNote } from '@/content/meta';
import { Block } from '@/widgets/note/Blocks';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { AppShell } from '@/shared/ui/AppShell';

const ChapterView = lazy(() => import('@/features/books/BookReader').then((m) => ({ default: m.ChapterView })));

/** One of our combined study notes: both books' angles, our words, ParcelGo examples. */
export function NotePage({ note }: { note: Note | undefined }) {
  if (!note) return <AppShell><main className="p-8 text-center font-bold">{tr('এই নোট নেই।', 'No such note.')}</main></AppShell>;
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[820px] flex-col gap-5 px-4 pb-14 pt-6 sm:px-8">
        <Link to="/study" className="self-start font-semibold text-route-deep">{tr('← পড়া', '← Study')}</Link>
        <Header note={note} />
        <Tabs note={note} />
      </main>
    </AppShell>
  );
}

function Tabs({ note }: { note: Note }) {
  const [tab, setTab] = useState<'notes' | 'book'>('notes');
  return (
    <>
      <div role="tablist" aria-label={tr('কী পড়বেন', 'What to read')} className="sticky top-[104px] z-10 flex gap-2 rounded-2xl bg-ground/95 py-1 min-[1360px]:top-[64px]">
        {([['notes', tr('📝 আমাদের নোট', '📝 Our notes')], ['book', tr('📖 বইয়ের অধ্যায়', '📖 The book\'s chapter')]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-11 flex-1 cursor-pointer rounded-xl border-[2.5px] border-ink px-3 font-bold ${tab === k ? 'bg-ink text-on-ink' : 'bg-surface'}`}>{l}</button>
        ))}
      </div>
      {tab === 'notes' ? (
        <>
          {timelinesForNote(note.id).length > 0 && (
            <section aria-label={tr('গভীরে', 'Deeper')} className="rounded-[20px] border-[3px] border-ink bg-violet-soft p-4">
              <p className="m-0 font-bold">🔍 {tr('গভীরে: ধাপে ধাপে দেখুন, আগে অনুমান করুন', 'Deeper: watch it step by step, predict first')}</p>
              <div className="mt-2 flex flex-col gap-2">
                {timelinesForNote(note.id).map((t) => <Link key={t.id} to="/deep/$deepId" params={{ deepId: t.id }} className="flex min-h-11 flex-col justify-center rounded-xl border-2 border-ink bg-surface px-3 py-1.5 text-ink no-underline"><span className="font-semibold">{t.title} →</span><span className="text-xs text-muted">{t.gist}</span></Link>)}
              </div>
            </section>
          )}
          {note.blocks.map((b, i) => <Block key={i} b={b} />)}
          <section className="rounded-[20px] border-[3px] border-ink bg-surface p-5">
            <BookRefs refs={note.refs} title={tr('পুরোটা বইয়ে পড়ুন', 'Read the full story in the books')} />
          </section>
        </>
      ) : (
        <Suspense fallback={<p className="m-0 text-muted">{tr('খোলা হচ্ছে…', 'Opening…')}</p>}>
          <p className="m-0 text-sm text-ink-soft">{tr('এই পাতাগুলো আসছে আপনার device-এ রাখা আপনার নিজের PDF থেকে; app-এর server-এ বই নেই।', 'These pages come from your own PDF on this device; the app\'s server has no copy of the book.')}</p>
          <ChapterView refs={note.chapters} />
        </Suspense>
      )}
    </>
  );
}

function Header({ note }: { note: Note }) {
  return (
    <section className="rounded-[22px] border-[3px] border-ink bg-surface p-5 shadow-block">
      <p className="m-0 text-sm font-bold text-route-deep">{tr('আমাদের নোট · দুই বই মিলিয়ে', 'Our notes · both books combined')}</p>
      <h1 className="m-0 font-display text-[28px] font-extrabold leading-tight [text-wrap:balance]">{note.title}</h1>
      <p className="m-0 mt-2 text-[17px] text-ink-soft">{note.gist}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-parcel-soft px-3 py-2 text-sm"><b>Alex Xu:</b> {note.angles.xu}</div>
        <div className="rounded-xl bg-violet-soft px-3 py-2 text-sm"><b>DDIA:</b> {note.angles.ddia}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.levels.map((l) => <Link key={l} to="/level/$levelId" params={{ levelId: String(l) }} className="inline-flex min-h-9 items-center rounded-full border-2 border-ink bg-surface px-3 text-sm font-semibold text-ink no-underline">🎮 Level {bn(l)} · {levelMeta[l]?.title}</Link>)}
      </div>
    </section>
  );
}
