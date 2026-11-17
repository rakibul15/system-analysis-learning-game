import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { refs } from '@/content/refs';
import { useShelf } from '@/features/books/shelf';
import { BOOKS, type BookId } from '@/features/books/catalog';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { BOOK, chapters } from '@/features/reading/ddia';
import { useProgress } from '@/entities/progress/store';
import { AppShell } from '@/shared/ui/AppShell';

export const PARTS = ['hub', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;
export type Part = (typeof PARTS)[number];

/** The study notes that ship with the app, plus the player's own PDFs kept in this browser. */
export function StudyPage() {
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[960px] flex-col gap-6 px-4 pb-12 pt-6 sm:px-8">
        <div>
          <p className="m-0 text-sm font-bold text-route-deep">{tr('পড়া', 'Study')}</p>
          <h1 className="m-0 font-display text-[32px] font-extrabold">{tr('ছবিতে system design', 'System design in pictures')}</h1>
          <p className="m-0 mt-1 max-w-[65ch] text-ink-soft">{tr('Alex Xu-র দুই খণ্ডের প্রতিটা chapter-এর নোট, ছবি আর "নিজেকে যাচাই" প্রশ্নসহ। Offline-এও খোলে।', 'Notes on every chapter of Alex Xu\'s two volumes, with diagrams and self-check questions. Works offline too.')}</p>
        </div>
        <ReadingTrackCard />
        <div className="grid gap-3 sm:grid-cols-2">
          {PARTS.map((p) => (
            <Link key={p} to="/study/$part" params={{ part: p }} className="btn-press flex flex-col gap-1 rounded-[18px] border-[2.5px] border-ink bg-white p-4 text-ink no-underline shadow-[0_4px_0_#16252D]">
              <span className="font-display text-lg font-bold">{refs[p].label}</span>
              <span className="text-sm text-muted">{p === 'hub' ? tr('সব অংশের সূচি আর এক পাতার cheat sheet', 'Index of every part and a one-page cheat sheet') : tr('পড়তে খুলুন →', 'Open to read →')}</span>
            </Link>
          ))}
        </div>
        <MyBooks />
      </main>
    </AppShell>
  );
}

function ReadingTrackCard() {
  const reading = useProgress((s) => s.reading);
  const done = chapters.filter((c) => reading[c.id]?.status === 2).length;
  return (
    <Link to="/reading" className="btn-press flex flex-col gap-1 rounded-[20px] border-[3px] border-ink bg-[#EDE6F8] p-5 text-ink no-underline shadow-[0_5px_0_#16252D]">
      <span className="text-xs font-bold uppercase tracking-wide text-[#4B2F7A]">{tr('বই পড়ার track', 'Reading track')} · {BOOK.edition}</span>
      <span className="font-display text-xl font-extrabold">{BOOK.title}</span>
      <span className="text-sm text-ink-soft">{tr(`১৪ অধ্যায় · খোঁজার প্রশ্ন, app-এ অনুশীলন আর নিজের নোট · ${bn(done)}/${bn(14)} শেষ`, `14 chapters · questions, practice in the app and your own notes · ${done}/14 done`)}</span>
    </Link>
  );
}

function MyBooks() {
  const { books, refresh, add, remove, tag } = useShelf();
  const [open, setOpen] = useState<{ name: string; url: string } | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { void refresh().catch(() => setMsg(tr('এই browser-এ বই রাখা যাচ্ছে না।', 'This browser cannot store books.'))); }, [refresh]);
  useEffect(() => () => { if (open) URL.revokeObjectURL(open.url); }, [open]);

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border-[3px] border-ink bg-white p-5">
      <h2 className="m-0 font-display text-xl font-bold">{tr('আমার বই', 'My books')}</h2>
      <p className="m-0 text-sm text-ink-soft">{tr('নিজের বইয়ের PDF এখানে রাখুন। প্রতিটা PDF কোন বই সেটা ঠিক থাকলে, খেলার প্রতিটা topic-এর "বইয়ে পড়ুন" থেকে সোজা ঠিক পাতায় খুলবে। File শুধু এই browser-এ থাকে, কোথাও upload হয় না।', 'Keep the PDFs of your books here. When each PDF is matched to its book, every topic\'s "Read it in the book" opens it straight at the right page. Files stay in this browser only and are never uploaded.')}</p>
      <label className="btn-press inline-flex min-h-12 w-fit cursor-pointer items-center rounded-xl border-[2.5px] border-ink bg-parcel px-4 font-bold">
        {tr('PDF যোগ করুন', 'Add a PDF')}
        <input type="file" accept="application/pdf" className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          try { await add(f); setMsg(''); } catch { setMsg(tr('রাখা গেল না; browser-এর জায়গা কম হতে পারে।', 'Could not store it; the browser may be out of space.')); }
        }} />
      </label>
      {msg && <p className="m-0 text-sm font-semibold text-coral-deep">{msg}</p>}
      {books.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {books.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink px-3 py-2">
              <span className="min-w-0 flex-[1_1_200px] truncate font-semibold">{b.name}</span>
              <label className="flex items-center gap-1 text-sm">{tr('কোন বই:', 'Book:')}
                <select value={b.bookId ?? ''} onChange={(e) => void tag(b.id, (e.target.value || null) as BookId | null)} className="min-h-9 rounded-lg border-2 border-ink bg-white px-2 font-[inherit]">
                  <option value="">{tr('অন্য বই', 'Other')}</option>
                  {(Object.keys(BOOKS) as BookId[]).map((id) => <option key={id} value={id}>{BOOKS[id].short}</option>)}
                </select>
              </label>
              <span className="font-mono text-xs text-muted">{bn(Math.round(b.size / 1e6))} MB</span>
              <button type="button" onClick={() => setOpen({ name: b.name, url: URL.createObjectURL(b.blob) })} className="cursor-pointer rounded-lg border-2 border-ink bg-white px-3 py-1 font-semibold">{tr('খুলুন', 'Open')}</button>
              <button type="button" onClick={() => void remove(b.id)} className="cursor-pointer rounded-lg border-2 border-coral bg-white px-3 py-1 font-semibold text-coral-deep">{tr('সরান', 'Remove')}</button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2"><b className="truncate">{open.name}</b><button type="button" onClick={() => setOpen(null)} className="cursor-pointer rounded-lg border-2 border-ink bg-white px-3 py-1 font-semibold">{tr('বন্ধ', 'Close')}</button></div>
          <iframe title={open.name} src={open.url} className="h-[80vh] w-full rounded-xl border-2 border-ink" />
        </div>
      )}
    </section>
  );
}

/** One part of the study notes, full height inside the app. */
export function StudyReader({ part }: { part: Part }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b-[3px] border-ink bg-white px-4 py-2">
        <Link to="/study" className="font-bold text-route-deep no-underline">← {tr('সব নোট', 'All notes')}</Link>
        <span className="font-display font-bold">{refs[part].label}</span>
        <Link to="/" className="ml-auto font-semibold text-ink no-underline">{tr('শহর', 'City')}</Link>
      </header>
      <iframe key={part} title={refs[part].label} src={`./study/${part}.html`} className="w-full flex-1 border-0" />
    </div>
  );
}
