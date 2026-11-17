import type { BookRef } from '@/features/books/catalog';
import type { FlowLink, FlowNode } from '@/simulators/knob/anim';

/**
 * Our own study notes: one topic, both books' angles, in our words and with ParcelGo
 * examples. They point to the books for the full treatment; they never copy them.
 */
export type NoteBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'story'; title: string; steps: string[]; fix: string }
  | { kind: 'flow'; label: string; nodes: FlowNode[]; links: FlowLink[]; h?: number }
  | { kind: 'tip'; title: string; text: string }
  | { kind: 'mistakes'; items: string[] }
  | { kind: 'check'; items: { q: string; a: string }[] }
  /** What each book says about one point, summarised in our words, each with its reference. */
  | { kind: 'says'; topic: string; xu: { text: string; ref: BookRef }; ddia: { text: string; ref: BookRef } }
  /** Figures in the learner's own copy: number, printed page, and what to look for (our words). */
  | { kind: 'figs'; book: 'ddia2'; chapter: number; items: { n: string; page: number; look: string }[] };

export interface Note {
  id: string;
  title: string;
  /** One line: what this is, in plain words. */
  gist: string;
  levels: number[];
  /** Which angle each book adds, in a phrase. */
  angles: { xu: string; ddia: string };
  blocks: NoteBlock[];
  refs: BookRef[];
}
