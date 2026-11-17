import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { notesById, type Note } from '@/content/notes';
import type { NoteBlock } from '@/content/notes/types';
import { BookRefs } from '@/features/books/BookRefs';
import { useReader } from '@/features/books/shelf';
import { refLabel } from '@/features/books/catalog';
import { levelsById } from '@/content/levels';
import { Flow } from '@/simulators/knob/anim';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { AppShell } from '@/shared/ui/AppShell';

/** One of our combined study notes: both books' angles, our words, ParcelGo examples. */
export function NotePage({ id }: { id: string }) {
  const note = notesById[id];
  if (!note) return <AppShell><main className="p-8 text-center font-bold">{tr('এই নোট নেই।', 'No such note.')}</main></AppShell>;
  return (
    <AppShell>
      <main className="mx-auto box-border flex max-w-[820px] flex-col gap-5 px-4 pb-14 pt-6 sm:px-8">
        <Link to="/study" className="self-start font-semibold text-route-deep">{tr('← পড়া', '← Study')}</Link>
        <Header note={note} />
        {note.blocks.map((b, i) => <Block key={i} b={b} />)}
        <section className="rounded-[20px] border-[3px] border-ink bg-white p-5">
          <BookRefs refs={note.refs} title={tr('পুরোটা বইয়ে পড়ুন', 'Read the full story in the books')} />
        </section>
      </main>
    </AppShell>
  );
}

function Header({ note }: { note: Note }) {
  return (
    <section className="rounded-[22px] border-[3px] border-ink bg-white p-5 shadow-block">
      <p className="m-0 text-sm font-bold text-route-deep">{tr('আমাদের নোট · দুই বই মিলিয়ে', 'Our notes · both books combined')}</p>
      <h1 className="m-0 font-display text-[28px] font-extrabold leading-tight [text-wrap:balance]">{note.title}</h1>
      <p className="m-0 mt-2 text-[17px] text-ink-soft">{note.gist}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-parcel-soft px-3 py-2 text-sm"><b>Alex Xu:</b> {note.angles.xu}</div>
        <div className="rounded-xl bg-[#EDE6F8] px-3 py-2 text-sm"><b>DDIA:</b> {note.angles.ddia}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.levels.map((l) => <Link key={l} to="/level/$levelId" params={{ levelId: String(l) }} className="inline-flex min-h-9 items-center rounded-full border-2 border-ink bg-white px-3 text-sm font-semibold text-ink no-underline">🎮 Level {bn(l)} · {levelsById[l]?.title}</Link>)}
      </div>
    </section>
  );
}

function Block({ b }: { b: NoteBlock }) {
  const open = useReader((s) => s.open);
  switch (b.kind) {
    case 'h': return <h2 className="m-0 mt-2 font-display text-[22px] font-extrabold">{b.text}</h2>;
    case 'p': return <p className="m-0 text-[17px] leading-relaxed">{b.text}</p>;
    case 'list': return <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[16px] leading-relaxed">{b.items.map((x) => <li key={x}>{x}</li>)}</ul>;
    case 'table': return (
      <div className="overflow-x-auto rounded-xl border-2 border-ink">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead><tr className="bg-ink text-left text-white">{b.head.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, i) => <tr key={i} className={i % 2 ? 'bg-[#F7F8F3]' : 'bg-white'}>{r.map((c, j) => <td key={j} className={`border-t border-ink/20 px-3 py-2 align-top ${j === 0 ? 'font-bold' : ''}`}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    case 'flow': return <div className="rounded-xl border-2 border-ink bg-[#F7F8F3] p-2"><Flow label={b.label} nodes={b.nodes} links={b.links} h={b.h} /><p className="m-0 px-1 text-xs text-muted">{b.label}</p></div>;
    case 'story': return (
      <div className="rounded-xl border-2 border-ink bg-white p-4">
        <h3 className="m-0 font-display text-lg font-bold">{b.title}</h3>
        <ol className="m-0 mt-2 flex flex-col gap-1 pl-5">{b.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <p className="m-0 mt-2 rounded-lg bg-route-soft px-3 py-2 text-sm"><b>{tr('সমাধান:', 'Fix:')}</b> {b.fix}</p>
      </div>
    );
    case 'tip': return <div className="rounded-xl border-2 border-dashed border-ink bg-parcel-soft px-4 py-3"><b>💡 {b.title}</b><p className="m-0 mt-1">{b.text}</p></div>;
    case 'mistakes': return (
      <div className="rounded-xl border-2 border-coral bg-coral-soft px-4 py-3">
        <b className="text-coral-deep">{tr('সাধারণ ভুল', 'Common mistakes')}</b>
        <ul className="m-0 mt-1 flex flex-col gap-1 pl-5">{b.items.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    );
    case 'check': return <Check items={b.items} />;
    case 'says': return (
      <div className="rounded-xl border-2 border-ink bg-white p-3">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted">{tr('দুই বইয়ে', 'In the two books')} · {b.topic}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([['xu', 'Alex Xu', 'bg-parcel-soft', b.xu], ['ddia', 'DDIA', 'bg-[#EDE6F8]', b.ddia]] as const).map(([k, who, bg, s]) => (
            <div key={k} className={`flex flex-col gap-2 rounded-lg p-3 ${bg}`}>
              <b className="text-sm">{k === 'xu' ? tr(`${who}-তে`, `In ${who}`) : tr(`গভীরে, ${who}-তে`, `In depth, in ${who}`)}</b>
              <p className="m-0 flex-1 text-[15px] leading-relaxed">{s.text}</p>
              <button type="button" onClick={() => open(s.ref)} className="min-h-10 w-fit cursor-pointer rounded-lg border-2 border-ink bg-white px-3 text-sm font-semibold">📖 {refLabel(s.ref).where}{s.ref.pages ? ` · ${tr('পাতা', 'p.')} ${bn(s.ref.pages[0], { grouping: false })}` : ''}</button>
            </div>
          ))}
        </div>
      </div>
    );
    case 'figs': return (
      <div className="flex flex-col gap-1.5 rounded-xl bg-[#EDE6F8] p-3">
        <p className="m-0 text-xs font-bold text-[#4B2F7A]">{tr('বইয়ের ছবিতে দেখুন (আপনার কপিতে খুলবে)', 'See the figures in the book (opens your copy)')}</p>
        {b.items.map((f) => (
          <button key={f.n} type="button" onClick={() => open({ book: b.book, chapter: b.chapter, at: f.page, label: `Figure ${f.n}`, pages: [f.page, f.page] })}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-2 border-ink bg-white px-3 py-1.5 text-left font-[inherit]">
            <span className="flex-none rounded-md bg-[#4B2F7A] px-1.5 py-0.5 text-xs font-bold text-white">Fig {f.n}</span>
            <span className="min-w-0 flex-1 text-sm">{f.look}</span>
            <span className="flex-none font-mono text-xs text-muted">{tr('পাতা', 'p.')} {bn(f.page, { grouping: false })}</span>
          </button>
        ))}
      </div>
    );
  }
}

function Check({ items }: { items: { q: string; a: string }[] }) {
  const [shown, setShown] = useState<boolean[]>(items.map(() => false));
  return (
    <section className="rounded-[20px] border-[3px] border-ink bg-white p-4">
      <h2 className="m-0 font-display text-xl font-bold">{tr('নিজেকে যাচাই', 'Check yourself')}</h2>
      <p className="m-0 text-sm text-muted">{tr('উত্তর খোলার আগে মুখে বলে দেখুন।', 'Say the answer out loud before revealing it.')}</p>
      <ol className="m-0 mt-2 flex flex-col gap-2 pl-5">
        {items.map((it, i) => (
          <li key={it.q}>
            <p className="m-0 font-semibold">{it.q}</p>
            {shown[i] ? <p className="pop-in m-0 mt-1 rounded-lg bg-route-soft px-3 py-2 text-sm">{it.a}</p>
              : <button type="button" onClick={() => setShown((s) => s.map((x, j) => (j === i ? true : x)))} className="mt-1 min-h-9 cursor-pointer rounded-lg border-2 border-ink bg-white px-3 text-sm font-semibold">{tr('উত্তর দেখুন', 'Show the answer')}</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}
