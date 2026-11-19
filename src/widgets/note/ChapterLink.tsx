import { Link } from '@tanstack/react-router';
import type { XuMeta } from '@/content/xu';
import { bn } from '@/shared/lib/bn';
import { tr } from '@/shared/lib/i18n';

export const vol = (m: Pick<XuMeta, 'book'>) => (m.book === 'ddia2' ? 'DDIA' : m.book === 'xu1' ? tr('খণ্ড ১', 'Vol 1') : tr('খণ্ড ২', 'Vol 2'));

/** A chapter in a list: our note when it is written, the older study page until then. */
export function ChapterLink({ c, dir }: { c: XuMeta; dir?: 'prev' | 'next' }) {
  const body = (
    <>
      <span className="text-xs font-bold text-muted">{dir === 'prev' ? '← ' : ''}{vol(c)} · {tr(`অধ্যায় ${bn(c.chapter)}`, `Chapter ${c.chapter}`)}{dir === 'next' ? ' →' : ''}{!c.load && <span className="ml-1.5 rounded bg-locked px-1.5 py-0.5 font-semibold">{tr('পুরোনো পাতা', 'older page')}</span>}</span>
      <span className="font-display font-bold">{c.title}</span>
      {!dir && c.load && <span className="text-xs text-muted">{c.gist}</span>}
    </>
  );
  const cls = `btn-press flex flex-col gap-0.5 rounded-xl border-2 border-ink p-3 text-ink no-underline shadow-[0_3px_0_var(--color-shadow)] ${c.load ? 'bg-surface' : 'bg-surface-sunk'} ${dir === 'next' ? 'sm:text-right' : ''}`;
  return c.load
    ? <Link to="/xu/$noteId" params={{ noteId: c.id }} className={cls}>{body}</Link>
    : <Link to="/study/$part" params={{ part: c.part ?? 'p1' }} className={cls}>{body}</Link>;
}
