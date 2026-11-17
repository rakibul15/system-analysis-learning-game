import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';
import { BOOKS, detectBook, refLabel, type BookId, type BookRef } from './catalog';
import { findInOutline, nextSibling, pageFromLabels, type OutlineNode } from './locate';
import { bookFor, useReader, useShelf } from './shelf';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const docs = new Map<string, Promise<PDFDocumentProxy>>();
const loadDoc = (key: string, blob: Blob) => {
  if (!docs.has(key)) docs.set(key, blob.arrayBuffer().then((buf) => pdfjs.getDocument({ data: new Uint8Array(buf) }).promise));
  return docs.get(key)!;
};

async function locate(doc: PDFDocumentProxy, ref: BookRef): Promise<number> {
  if (ref.at !== undefined) { const i = pageFromLabels(await doc.getPageLabels(), ref); if (i !== null) return i; }
  const outline = (await doc.getOutline()) as unknown as OutlineNode[] | null;
  if (outline?.length) {
    const node = findInOutline(outline, ref, BOOKS[ref.book].chapters[ref.chapter] ?? '');
    if (node?.dest) {
      const dest = typeof node.dest === 'string' ? await doc.getDestination(node.dest) : (node.dest as unknown[]);
      if (dest?.[0]) { try { return await doc.getPageIndex(dest[0] as never); } catch { /* fall through */ } }
    }
  }
  const byLabel = pageFromLabels(await doc.getPageLabels(), ref);
  return byLabel ?? 0;
}

const bnLabel = (l: string) => (/^\d+$/.test(l) ? bn(Number(l), { grouping: false }) : l);

async function destIndex(doc: PDFDocumentProxy, dest: unknown): Promise<number | null> {
  const d = typeof dest === 'string' ? await doc.getDestination(dest) : (dest as unknown[] | null);
  if (!d?.[0]) return null;
  try { return await doc.getPageIndex(d[0] as never); } catch { return null; }
}

/** First and last page index of a chapter: from printed pages when known, else from the outline. */
async function chapterRange(doc: PDFDocumentProxy, ref: BookRef): Promise<[number, number]> {
  const labels = await doc.getPageLabels();
  if (ref.pages && labels) {
    const s = labels.indexOf(String(ref.pages[0])), e = labels.indexOf(String(ref.pages[1]));
    if (s >= 0 && e >= s) return [s, e];
  }
  const outline = (await doc.getOutline()) as unknown as OutlineNode[] | null;
  const node = outline ? findInOutline(outline, { ...ref, section: undefined }, BOOKS[ref.book].chapters[ref.chapter] ?? '') : null;
  const start = node ? await destIndex(doc, node.dest) : null;
  if (start === null) return [0, Math.min(doc.numPages - 1, 30)];
  const next = outline && node ? nextSibling(outline, node) : null;
  const end = next ? await destIndex(doc, next.dest) : null;
  return [start, end !== null && end > start ? end - 1 : doc.numPages - 1];
}

/** A whole chapter of the learner's own copy, page after page, inside the current screen. */
export function ChapterView({ refs }: { refs: BookRef[] }) {
  const { books, loaded, refresh, add, tag } = useShelf();
  const [pick, setPick] = useState(0);
  useEffect(() => { if (!loaded) void refresh(); }, [loaded, refresh]);
  const ref = refs[pick]!;
  const book = bookFor(books, ref.book);
  return (
    <div className="flex flex-col gap-3">
      {refs.length > 1 && (
        <div role="tablist" aria-label={tr('কোন অধ্যায়', 'Which chapter')} className="flex flex-wrap gap-2">
          {refs.map((r, i) => (
            <button key={i} type="button" role="tab" aria-selected={pick === i} onClick={() => setPick(i)}
              className={`min-h-10 cursor-pointer rounded-full border-2 border-ink px-3 text-sm font-bold ${pick === i ? 'bg-ink text-white' : 'bg-white'}`}>
              {BOOKS[r.book].short} · {tr('অধ্যায়', 'Ch.')} {bn(r.chapter)}
            </button>
          ))}
        </div>
      )}
      <p className="m-0 text-sm font-semibold">{BOOKS[ref.book].title} · {tr('অধ্যায়', 'Chapter')} {bn(ref.chapter)}: {BOOKS[ref.book].chapters[ref.chapter]}</p>
      {!loaded ? null : book ? <ChapterPages key={`${book.id}-${pick}`} bookKey={book.id} blob={book.blob} target={ref} />
        : <div className="overflow-hidden rounded-[22px] bg-[#2B3A41]"><AddBook bookId={ref.book} untagged={books.filter((b) => !b.bookId)} onAdd={(f) => add(f, ref.book)} onTag={(id) => tag(id, ref.book)} /></div>}
    </div>
  );
}

function ChapterPages({ bookKey, blob, target }: { bookKey: string; blob: Blob; target: BookRef }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [labels, setLabels] = useState<string[] | null>(null);
  const [ratio, setRatio] = useState(1.3);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await loadDoc(bookKey, blob);
        const [r, l] = await Promise.all([chapterRange(d, target), d.getPageLabels()]);
        const vp = (await d.getPage(r[0] + 1)).getViewport({ scale: 1 });
        if (!alive) return;
        setDoc(d); setRange(r); setLabels(l); setRatio(vp.height / vp.width);
      } catch { if (alive) setError(tr('PDF খোলা গেল না।', 'Could not open the PDF.')); }
    })();
    return () => { alive = false; };
  }, [bookKey, blob, target]);
  if (error) return <p className="m-0 font-semibold text-coral-deep">{error}</p>;
  if (!doc || !range) return <p className="m-0 text-muted">{tr('অধ্যায় খোলা হচ্ছে…', 'Opening the chapter…')}</p>;
  const pages = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] bg-[#2B3A41] p-2 sm:p-4">
      <p className="m-0 text-xs font-semibold text-white/80">{tr(`আপনার কপি থেকে · ${bn(pages.length)} পাতা · পাতা ${bnLabel(labels?.[range[0]] ?? String(range[0] + 1))}–${bnLabel(labels?.[range[1]] ?? String(range[1] + 1))}`, `From your copy · ${pages.length} pages · pages ${labels?.[range[0]] ?? range[0] + 1}–${labels?.[range[1]] ?? range[1] + 1}`)}</p>
      {pages.map((i) => <LazyPage key={i} doc={doc} index={i} ratio={ratio} label={labels?.[i] ?? String(i + 1)} />)}
    </div>
  );
}

/** Renders a page only while it is near the screen, and frees it again when far away. */
function LazyPage({ doc, index, ratio, label }: { doc: PDFDocumentProxy; index: number; ratio: number; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const task = useRef<RenderTask | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(!!e?.isIntersecting), { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const c = canvas.current, el = wrap.current;
    if (!c || !el) return;
    if (!near) { task.current?.cancel(); c.width = 0; c.height = 0; return; }
    let alive = true;
    (async () => {
      const p = await doc.getPage(index + 1);
      if (!alive) return;
      const base = p.getViewport({ scale: 1 });
      const vp = p.getViewport({ scale: el.clientWidth / base.width });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
      const t = p.render({ canvasContext: c.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
      task.current = t;
      try { await t.promise; } catch { /* scrolled away */ }
    })();
    return () => { alive = false; task.current?.cancel(); };
  }, [near, doc, index]);
  return (
    <div ref={wrap} className="relative w-full max-w-[860px] overflow-hidden rounded bg-white shadow-lg" style={{ aspectRatio: `1 / ${ratio}` }}>
      <canvas ref={canvas} className="block h-full w-full" />
      <span className="absolute bottom-1 right-2 rounded bg-ink/70 px-1.5 text-[11px] font-bold text-white">{/^\d+$/.test(label) ? bn(Number(label), { grouping: false }) : label}</span>
    </div>
  );
}

/** Full-screen reader over the current screen: the learner's own PDF, opened at the reference. */
export default function BookReader() {
  const { ref, close } = useReader();
  const { books, loaded, refresh, add, tag } = useShelf();
  useEffect(() => { if (!loaded) void refresh(); }, [loaded, refresh]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  if (!ref) return null;
  const book = bookFor(books, ref.book);
  const { book: short, where } = refLabel(ref);
  return (
    <div role="dialog" aria-modal="true" aria-label={`${short} · ${where}`} className="fixed inset-0 z-50 flex flex-col bg-[#2B3A41]">
      <header className="flex items-center gap-2 border-b-[3px] border-ink bg-white px-3 py-2" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <span className={`flex-none rounded-md px-1.5 py-0.5 text-xs font-bold ${ref.book === 'ddia2' ? 'bg-[#EDE6F8] text-[#4B2F7A]' : 'bg-parcel-soft text-[#7A4D00]'}`}>{short}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{where}</span>
        <button type="button" onClick={close} className="min-h-10 flex-none cursor-pointer rounded-xl border-2 border-ink bg-white px-3 font-bold">{tr('বন্ধ ✕', 'Close ✕')}</button>
      </header>
      {!loaded ? null : book ? <Pages key={book.id + JSON.stringify(ref)} bookKey={book.id} blob={book.blob} target={ref} /> : (
        <AddBook bookId={ref.book} untagged={books.filter((b) => !b.bookId)} onAdd={(f) => add(f, ref.book)} onTag={(id) => tag(id, ref.book)} />
      )}
    </div>
  );
}

export function AddBook({ bookId, untagged, onAdd, onTag }: { bookId: BookId; untagged: { id: string; name: string }[]; onAdd: (f: File) => Promise<void>; onTag: (id: string) => Promise<void> }) {
  const info = BOOKS[bookId];
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState('');
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto p-4">
      <div className="flex w-full max-w-[520px] flex-col gap-3 rounded-[22px] border-[3px] border-ink bg-white p-5">
        <h2 className="m-0 font-display text-xl font-extrabold">{info.title}</h2>
        <p className="m-0 text-ink-soft">{tr('এই বইয়ের PDF এখনো এই browser-এ নেই। একবার যোগ করলে প্রতিটা topic থেকে সোজা ঠিক পাতায় খুলবে। File শুধু এই browser-এ থাকে, কোথাও upload হয় না।', 'This book\'s PDF is not in this browser yet. Add it once and every topic opens it straight at the right page. The file stays in this browser only and is never uploaded.')}</p>
        <label className="btn-press inline-flex min-h-12 w-fit cursor-pointer items-center rounded-xl border-[2.5px] border-ink bg-parcel px-4 font-bold">
          {busy ? tr('রাখা হচ্ছে…', 'Saving…') : tr('PDF বেছে নিন', 'Choose the PDF')}
          <input type="file" accept="application/pdf" className="sr-only" onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = '';
            if (!f) return;
            const guess = detectBook(f.name);
            setWarn(guess && guess !== bookId ? tr(`নাম দেখে মনে হচ্ছে এটা ${BOOKS[guess].short}; তবু এই বই হিসেবে রাখলাম।`, `The name looks like ${BOOKS[guess].short}; kept it as this book anyway.`) : '');
            setBusy(true); try { await onAdd(f); } finally { setBusy(false); }
          }} />
        </label>
        {warn && <p className="m-0 text-sm font-semibold text-[#7A4D00]">{warn}</p>}
        {untagged.length > 0 && (
          <div>
            <p className="m-0 text-sm font-bold">{tr('আগে যোগ করা PDF-গুলোর একটা কি এই বই?', 'Is one of your earlier PDFs this book?')}</p>
            <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">{untagged.map((b) => <li key={b.id}><button type="button" onClick={() => void onTag(b.id)} className="w-full cursor-pointer truncate rounded-lg border-2 border-ink bg-white px-3 py-2 text-left font-semibold">{b.name}</button></li>)}</ul>
          </div>
        )}
        <p className="m-0 text-sm text-muted">{tr('বই নেই?', 'No copy yet?')} <a href={info.buyUrl} target="_blank" rel="noreferrer" className="font-semibold text-route-deep">{tr('কোথায় পাবেন ↗', 'Where to get it ↗')}</a></p>
      </div>
    </div>
  );
}

function Pages({ bookKey, blob, target }: { bookKey: string; blob: Blob; target: BookRef }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [labels, setLabels] = useState<string[] | null>(null);
  const [page, setPage] = useState<number | null>(null);
  const [start, setStart] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const task = useRef<RenderTask | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await loadDoc(bookKey, blob);
        const [idx, l] = await Promise.all([locate(d, target), d.getPageLabels()]);
        if (!alive) return;
        setDoc(d); setLabels(l); setPage(idx); setStart(idx);
      } catch { if (alive) setError(tr('PDF খোলা গেল না।', 'Could not open the PDF.')); }
    })();
    return () => { alive = false; };
  }, [bookKey, blob, target]);

  const render = useCallback(async () => {
    if (!doc || page === null || !canvas.current || !box.current) return;
    task.current?.cancel();
    const p = await doc.getPage(page + 1);
    const base = p.getViewport({ scale: 1 });
    const fit = Math.min(900, box.current.clientWidth - 16) / base.width;
    const vp = p.getViewport({ scale: fit * zoom });
    const dpr = window.devicePixelRatio || 1;
    const c = canvas.current;
    c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
    c.style.width = `${Math.floor(vp.width)}px`; c.style.height = `${Math.floor(vp.height)}px`;
    const t = p.render({ canvasContext: c.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
    task.current = t;
    try { await t.promise; } catch { /* cancelled by a newer render */ }
  }, [doc, page, zoom]);

  useEffect(() => { void render(); box.current?.scrollTo({ top: 0 }); }, [render]);
  useEffect(() => {
    const on = () => void render();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [render]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!doc || page === null) return;
      if (e.key === 'ArrowRight') setPage(Math.min(doc.numPages - 1, page + 1));
      if (e.key === 'ArrowLeft') setPage(Math.max(0, page - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, page]);

  const label = useMemo(() => (page === null ? '' : labels?.[page] ?? String(page + 1)), [labels, page]);
  const printed = Number(label);
  const inRange = target.pages && Number.isFinite(printed) ? printed >= target.pages[0] && printed <= target.pages[1] : null;
  const past = target.pages && Number.isFinite(printed) && printed > target.pages[1];

  if (error) return <p className="m-auto rounded-xl bg-white p-4 font-semibold text-coral-deep">{error}</p>;
  return (
    <>
      <div ref={box} className="flex flex-1 justify-center overflow-auto p-2">
        {page === null ? <p className="m-auto font-semibold text-white">{tr('পাতা খোঁজা হচ্ছে…', 'Finding the page…')}</p> : <canvas ref={canvas} className="h-fit rounded bg-white shadow-lg" />}
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t-[3px] border-ink bg-white px-3 py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <button type="button" aria-label={tr('আগের পাতা', 'Previous page')} disabled={!page} onClick={() => setPage((x) => Math.max(0, (x ?? 0) - 1))} className="h-11 w-11 cursor-pointer rounded-xl border-2 border-ink bg-white text-lg font-bold disabled:opacity-40">◀</button>
        <span className="min-w-[110px] text-center font-mono text-sm font-bold">{tr('পাতা', 'Page')} {/^\d+$/.test(label) ? bn(Number(label), { grouping: false }) : label}{doc ? ` · ${bn(page! + 1, { grouping: false })}/${bn(doc.numPages, { grouping: false })}` : ''}</span>
        <button type="button" aria-label={tr('পরের পাতা', 'Next page')} disabled={!doc || page === null || page >= doc.numPages - 1} onClick={() => setPage((x) => Math.min((doc?.numPages ?? 1) - 1, (x ?? 0) + 1))} className="h-11 w-11 cursor-pointer rounded-xl border-2 border-ink bg-white text-lg font-bold disabled:opacity-40">▶</button>
        <span className="mx-1 h-6 w-px bg-ink/30" aria-hidden="true" />
        <button type="button" aria-label={tr('ছোট করুন', 'Zoom out')} onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} className="h-11 w-11 cursor-pointer rounded-xl border-2 border-ink bg-white font-bold">−</button>
        <button type="button" aria-label={tr('বড় করুন', 'Zoom in')} onClick={() => setZoom((z) => Math.min(2.6, +(z + 0.2).toFixed(1)))} className="h-11 w-11 cursor-pointer rounded-xl border-2 border-ink bg-white font-bold">+</button>
        {page !== start && <button type="button" onClick={() => setPage(start)} className="min-h-11 cursor-pointer rounded-xl border-2 border-ink bg-parcel-soft px-3 text-sm font-bold">{tr('Section-এর শুরু', 'Section start')}</button>}
        {target.pages && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${inRange ? 'bg-route-soft text-route-deep' : past ? 'bg-parcel-soft text-[#7A4D00]' : 'bg-[#F0F2EC] text-muted'}`}>{inRange ? tr(`এই অংশ: পাতা ${bn(target.pages[0], { grouping: false })}–${bn(target.pages[1], { grouping: false })}`, `This part: pages ${target.pages[0]}–${target.pages[1]}`) : past ? tr('এই অংশ শেষ ✓', 'This part is done ✓') : tr(`পড়ার অংশ: ${bn(target.pages[0], { grouping: false })}–${bn(target.pages[1], { grouping: false })}`, `To read: ${target.pages[0]}–${target.pages[1]}`)}</span>}
      </footer>
    </>
  );
}
