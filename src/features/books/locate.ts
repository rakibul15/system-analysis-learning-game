import type { BookRef } from './catalog';

/** The parts of a PDF outline entry we use (pdf.js shape). */
export interface OutlineNode { title: string; dest: unknown; items: OutlineNode[] }

export const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function walk(nodes: OutlineNode[], fn: (n: OutlineNode, depth: number) => boolean, depth = 0): OutlineNode | null {
  for (const n of nodes) {
    if (fn(n, depth)) return n;
    const hit = walk(n.items ?? [], fn, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/**
 * Find the outline entry for a reference: first the chapter (by "Chapter N" or its title),
 * then the section inside that chapter, so a "Summary" or "Fault Tolerance" in another
 * chapter is never picked by mistake.
 */
export function findInOutline(outline: OutlineNode[], ref: BookRef, chapterTitle: string): OutlineNode | null {
  const n = ref.chapter;
  const ct = norm(chapterTitle);
  const chapter = walk(outline, (x, d) => {
    const t = norm(x.title);
    return d <= 1 && (new RegExp(`^chapter ${n}( |$)`).test(t) || new RegExp(`^${n} ${ct}`).test(t) || (ct.length > 8 && (t === ct || t.endsWith(` ${ct}`) || t.includes(`${n} ${ct}`))));
  }) ?? walk(outline, (x) => ct.length > 8 && norm(x.title).includes(ct));
  if (!ref.section) return chapter;
  const st = norm(ref.section);
  const scope = chapter ? [chapter] : outline;
  return walk(scope, (x) => norm(x.title) === st) ?? walk(scope, (x) => norm(x.title).includes(st)) ?? chapter;
}

/** Fallback: the page whose printed label is the reference's first page. */
export function pageFromLabels(labels: string[] | null, ref: BookRef): number | null {
  if (!labels || !ref.pages) return null;
  const i = labels.indexOf(String(ref.pages[0]));
  return i >= 0 ? i : null;
}
