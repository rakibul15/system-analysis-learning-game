import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { BOOK, chapters, PART_TITLES, TOTAL_WEEKS, type Chapter, type Practice } from '@/features/reading/ddia';
import { incidents } from '@/features/incident/incidents';
import { levelMeta, notesMetaById } from '@/content/meta';
import { DDIA_CHAPTERS } from '@/content/notes/ddia.gen';
import { useProgress, type ReadingRecord } from '@/entities/progress/store';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { AppShell } from '@/shared/ui/AppShell';
import { ddiaChapterRef } from '@/features/books/catalog';
import { useReader } from '@/features/books/shelf';

const STATUS = [tr('পড়িনি', 'Not started'), tr('পড়ছি', 'Reading'), tr('শেষ', 'Done')] as const;
const STATUS_CLS = ['bg-surface', 'bg-parcel-soft', 'bg-route-soft'] as const;
const NOTE_HINT = tr('মূল ধারণা:\n\nকোথায় trade-off:\n\nCarryBee / ParcelGo-তে কোথায় দেখেছি:\n\nএখনো যা বুঝিনি:', 'Core idea:\n\nWhere the trade-off is:\n\nWhere I have seen it at work:\n\nWhat I still do not get:');

function PracticeLink({ p }: { p: Practice }) {
  const cls = 'inline-flex min-h-9 items-center rounded-full border-2 border-ink bg-surface px-3 text-sm font-semibold text-ink no-underline hover:bg-surface-2';
  if (p.kind === 'level') return <Link to="/level/$levelId" params={{ levelId: String(p.id) }} className={cls}>Level {bn(p.id)} · {levelMeta[p.id]?.title}</Link>;
  if (p.kind === 'incident') return <Link to="/incident" className={cls}>Incident · {incidents.find((i) => i.id === p.id)?.title ?? p.id}</Link>;
  if (p.kind === 'builder') return <Link to="/builder" className={cls}>{tr('Builder · খরচ ও capacity', 'Builder · cost and capacity')}</Link>;
  if (p.kind === 'migrate') return <Link to="/builder" className={cls}>{tr('Builder · Migration', 'Builder · Migration')}</Link>;
  return <Link to="/practice" search={{ tab: 'lab' }} className={cls}>Simulator lab</Link>;
}

/** Reading track for DDIA (2nd edition): chapter by chapter, with linked practice and your own notes. */
export function ReadingPage() {
  const reading = useProgress((s) => s.reading);
  const done = chapters.filter((c) => reading[c.id]?.status === 2).length;
  const current = chapters.find((c) => reading[c.id]?.status === 1) ?? chapters.find((c) => (reading[c.id]?.status ?? 0) < 2);
  const [open, setOpen] = useState<string | null>(current?.id ?? null);

  const exportNotes = () => {
    const md = [`# ${BOOK.title} (${BOOK.edition}): ${tr('আমার নোট', 'my notes')}`, '', ...chapters.flatMap((c) => {
      const r = reading[c.id];
      return r?.notes?.trim() ? [`## ${c.n}. ${c.title}`, '', r.notes.trim(), ''] : [];
    })].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = 'ddia-notes.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[960px] flex-col gap-5 px-4 pb-12 pt-6 sm:px-8">
        <Link to="/study" className="self-start font-semibold text-route-deep">{tr('← পড়া', '← Study')}</Link>
        <section className="rounded-[22px] border-[3px] border-ink bg-surface p-5 shadow-block">
          <p className="m-0 text-sm font-bold text-route-deep">{tr('বই পড়ার track', 'Reading track')} · {BOOK.edition}</p>
          <h1 className="m-0 font-display text-[28px] font-extrabold leading-tight [text-wrap:balance] sm:text-[32px]">{BOOK.title}</h1>
          <p className="m-0 mt-1 text-ink-soft">{BOOK.authors}</p>
          <p className="m-0 mt-2 max-w-[68ch] text-ink-soft">{tr(`১৪টা অধ্যায়, মোটামুটি ${bn(TOTAL_WEEKS)} সপ্তাহ। প্রতিটা অধ্যায়ে পড়ার সময় খোঁজার প্রশ্ন, app-এ মিল থাকা অনুশীলন, আর আপনার নোট। নোট আপনার account-এ save থাকে। বইয়ের লেখা এখানে নেই: নিজের কপি পাশে খুলে পড়ুন।`, `14 chapters, about ${TOTAL_WEEKS} weeks. For each chapter: questions to look for while reading, matching practice in this app, and your notes. Notes are saved to your account. The book's text is not here: read your own copy alongside.`)}</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-locked" aria-hidden="true"><div className="h-full rounded-full bg-route" style={{ width: `${(done / chapters.length) * 100}%` }} /></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold">{bn(done)}/{bn(chapters.length)} {tr('অধ্যায় শেষ', 'chapters done')}</span>
            <button type="button" onClick={exportNotes} className="min-h-10 cursor-pointer rounded-xl border-2 border-ink bg-surface px-3 text-sm font-semibold">{tr('সব নোট download (.md)', 'Download all notes (.md)')}</button>
          </div>
        </section>

        {PART_TITLES.map((pt, pi) => (
          <section key={pt} className="flex flex-col gap-2">
            <h2 className="m-0 font-display text-lg font-bold text-muted">{tr(`ভাগ ${bn(pi + 1)}`, `Part ${pi + 1}`)} · {pt}</h2>
            {chapters.filter((c) => c.part === pi).map((c) => <ChapterCard key={c.id} c={c} rec={reading[c.id]} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />)}
          </section>
        ))}
        <p className="m-0 text-sm text-muted">{tr('বইয়ের PDF থাকলে', 'If you have the book as a PDF, add it under')} <Link to="/study" className="font-semibold text-route-deep">{tr('পড়া → আমার বই', 'Study → My books')}</Link>{tr('-এ রাখতে পারেন; সেটা শুধু এই browser-এ থাকে, কোথাও upload হয় না।', '; it stays in this browser only and is never uploaded.')}</p>
      </main>
    </AppShell>
  );
}

function ChapterCard({ c, rec, open, onToggle }: { c: Chapter; rec: ReadingRecord | undefined; open: boolean; onToggle: () => void }) {
  const setReading = useProgress((s) => s.setReading);
  const openBook = useReader((s) => s.open);
  const status = rec?.status ?? 0;
  const [draft, setDraft] = useState(rec?.notes ?? '');
  const dirty = draft !== (rec?.notes ?? '');
  return (
    <article className={`rounded-[18px] border-[2.5px] border-ink ${STATUS_CLS[status]}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 rounded-[16px] border-0 bg-transparent p-4 text-left font-[inherit] text-ink">
        <span className={`grid h-10 w-10 flex-none place-items-center rounded-full border-2 border-ink font-display text-lg font-extrabold ${status === 2 ? 'bg-route text-white' : 'bg-surface'}`}>{status === 2 ? '✓' : bn(c.n)}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] font-bold leading-snug">{c.title}</span>
          <span className="block text-xs text-muted">{tr(`পাতা ${bn(c.pages[0])}–${bn(c.pages[1])} · ~${bn(c.weeks)} সপ্তাহ`, `Pages ${c.pages[0]}–${c.pages[1]} · ~${c.weeks} week${c.weeks > 1 ? 's' : ''}`)} · {STATUS[status]}{ours(c.n) ? tr(` · আমাদের ${bn(ours(c.n))}টা নোট`, ` · ${ours(c.n)} of our notes`) : ''}{rec?.notes?.trim() ? tr(' · আপনার নোট আছে', ' · your notes') : ''}</span>
        </span>
        <span aria-hidden="true" className="text-xl">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t-2 border-dashed border-ink px-4 pb-4 pt-3">
          <div role="radiogroup" aria-label={tr('অবস্থা', 'Status')} className="flex flex-wrap gap-2">
            {STATUS.map((l, i) => (
              <button key={l} type="button" role="radio" aria-checked={status === i} onClick={() => setReading(c.id, { status: i as 0 | 1 | 2 })}
                className={`min-h-10 cursor-pointer rounded-full border-2 border-ink px-4 text-sm font-bold ${status === i ? 'bg-ink text-on-ink' : 'bg-surface'}`}>{l}</button>
            ))}
          </div>
          <button type="button" onClick={() => { openBook(ddiaChapterRef(c.n, c.pages)); if (status === 0) setReading(c.id, { status: 1 }); }} className="btn-press flex min-h-12 w-fit cursor-pointer items-center gap-2 rounded-xl border-[2.5px] border-ink bg-violet-soft px-4 font-bold shadow-[0_3px_0_var(--color-shadow)]">📖 {tr(`বইয়ে খুলুন · পাতা ${bn(c.pages[0], { grouping: false })}`, `Open in the book · page ${c.pages[0]}`)}</button>
          <OurNotes c={c} />
          <div>
            <h3 className="m-0 text-sm font-bold">{tr('পড়ার সময় খুঁজুন', 'Look for while reading')}</h3>
            <ul className="m-0 mt-1 list-disc pl-5 text-[15px]">{c.look.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
          <div>
            <h3 className="m-0 text-sm font-bold">{tr('App-এ হাতে-কলমে', 'Hands-on in the app')}</h3>
            <div className="mt-1 flex flex-wrap gap-2">{c.practice.map((p, i) => <PracticeLink key={i} p={p} />)}</div>
          </div>
          <label className="flex flex-col gap-1 text-sm font-bold">{tr('আমার নোট', 'My notes')}
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (dirty) setReading(c.id, { notes: draft, status: status === 0 ? 1 : status }); }}
              rows={7} placeholder={NOTE_HINT} className="rounded-xl border-2 border-ink bg-surface p-3 font-[inherit] text-[15px] font-normal" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!dirty} onClick={() => setReading(c.id, { notes: draft, status: status === 0 ? 1 : status })} className="btn-press min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-parcel text-night px-4 font-bold shadow-[0_3px_0_var(--color-shadow)] disabled:cursor-default disabled:opacity-50">{dirty ? tr('নোট save করুন', 'Save notes') : tr('Save হয়েছে ✓', 'Saved ✓')}</button>
            {status !== 2 && <button type="button" onClick={() => setReading(c.id, { notes: draft, status: 2 })} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-surface px-4 font-semibold">{tr('অধ্যায় শেষ ✓', 'Chapter done ✓')}</button>}
          </div>
        </div>
      )}
    </article>
  );
}

/** How many of our notes treat a DDIA chapter. */
const ours = (n: number) => DDIA_CHAPTERS.find((d) => d.ch === n)?.notes.length ?? 0;
const pages = (p?: [number, number]) => (p ? tr(`পাতা ${bn(p[0], { grouping: false })}–${bn(p[1], { grouping: false })}`, `pages ${p[0]}–${p[1]}`) : '');

/** This chapter in our notes: which notes treat it and which of its sections, and the figures they point to in your copy. */
function OurNotes({ c }: { c: Chapter }) {
  const openBook = useReader((s) => s.open);
  const d = DDIA_CHAPTERS.find((x) => x.ch === c.n);
  if (!d || (!d.notes.length && !d.figs.length)) {
    return (
      <p className="m-0 rounded-xl border-2 border-dashed border-line-strong px-3 py-2 text-sm text-muted">
        {tr('এই অধ্যায়ের নোট এখনো লেখা হয়নি, আসছে। ততক্ষণ নিচের প্রশ্নগুলো ধরে পড়ুন।', 'Our notes on this chapter are not written yet; they are coming. Until then, read with the questions below.')}
      </p>
    );
  }
  return (
    <div>
      <h3 className="m-0 text-sm font-bold">{tr('আমাদের নোটে এই অধ্যায়', 'This chapter in our notes')}</h3>
      <ul className="m-0 mt-1 flex list-none flex-col gap-2 p-0">
        {d.notes.map((n) => (
          <li key={n.id}>
            <Link to="/notes/$noteId" params={{ noteId: n.id }} className="btn-press flex flex-col gap-1 rounded-xl border-2 border-ink bg-surface-sunk p-3 text-ink no-underline shadow-[0_3px_0_var(--color-shadow)]">
              <span className="font-bold">📝 {notesMetaById[n.id]?.title ?? n.id}</span>
              <span className="flex flex-wrap gap-1.5">
                {n.sections.map((x) => (
                  <span key={`${x.s ?? ''}${x.p?.[0] ?? ''}`} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-soft">
                    {x.s ?? tr('পুরো অধ্যায়', 'The whole chapter')}{x.p ? ` · ${pages(x.p)}` : ''}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {d.figs.length > 0 && (
        <details className="mt-2">
          <summary className="min-h-10 cursor-pointer py-2 text-sm font-bold">{tr(`এই অধ্যায়ের ${bn(d.figs.length)}টা figure দেখুন, নিজের বইয়ে`, `${d.figs.length} figures to look at in your copy`)}</summary>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {d.figs.map((f) => (
              <li key={f.n} className="flex items-start gap-2">
                <button type="button" onClick={() => openBook({ book: 'ddia2', chapter: c.n, at: f.page, label: `Figure ${f.n}` })}
                  className="min-h-9 flex-none cursor-pointer rounded-lg border-2 border-ink bg-violet-soft px-2 text-xs font-bold text-ink">
                  Fig {f.n} · {tr(`পাতা ${bn(f.page, { grouping: false })}`, `p. ${f.page}`)}
                </button>
                <span className="pt-1.5 text-sm">{f.look}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
