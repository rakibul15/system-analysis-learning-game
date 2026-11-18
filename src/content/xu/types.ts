import type { NoteBlock } from '../notes/types';
import type { FlowLink, FlowNode } from '@/simulators/knob/anim';

/*
 * Our notes on Alex Xu's two volumes, one per chapter: the chapter's ideas in our own words,
 * with ParcelGo examples and pictures that move. Only bibliographic facts come from the book
 * (its chapter numbers and titles); nothing is copied from it.
 */

/** One stage of a design that grows: what broke, what was added, and what that costs. */
export interface Stage { title: string; problem: string; fix: string; cost: string; nodes: FlowNode[]; links: FlowLink[]; h?: number }

/** One message in a sequence: from actor `from` to actor `to` (indexes into `actors`). */
export interface SeqStep { from: number; to: number; msg: string; note?: string; tone?: 'ok' | 'bad' }

export interface CalcInput { id: string; label: string; min: number; max: number; step: number; value: number; unit?: string; /** shown instead of the number */ show?: (v: number) => string }
export interface CalcOut { label: string; value: string; /** how it was worked out, in a line */ how?: string; /** 0–1, drawn as a bar */ bar?: number; tone?: 'ok' | 'bad' }

/** Interactive pictures written as components (src/widgets/note/widgets.tsx). */
export type WidgetId = 'token-bucket' | 'window-edge';

export type XuBlock =
  | NoteBlock
  /** A design that grows step by step; the learner moves through the stages. */
  | { kind: 'stages'; label: string; stages: Stage[] }
  /** Who sends what to whom, played one message at a time. */
  | { kind: 'seq'; label: string; actors: string[]; steps: SeqStep[] }
  /** Sliders in, numbers out: an estimate the learner can push around. */
  | { kind: 'calc'; label: string; inputs: CalcInput[]; out: (v: Record<string, number>) => CalcOut[] }
  /** Bars that compare sizes; `log` for things a million times apart, `stack` for parts of one whole. */
  | { kind: 'bars'; label: string; scale: 'log' | 'linear' | 'stack'; items: { label: string; value: number; show: string; tone?: 'ok' | 'bad' | 'warn' | 'violet' }[]; note?: string }
  /** An interview played line by line: q is the interviewer, a the candidate, tip a coach's aside. */
  | { kind: 'dialog'; label: string; lines: { who: 'q' | 'a' | 'tip'; text: string }[] }
  | { kind: 'widget'; id: WidgetId; label: string };

export interface XuNote {
  /** 'v1-4' is Vol 1, chapter 4. */
  id: string;
  /** What the learner can do after this chapter. */
  goals: string[];
  blocks: XuBlock[];
  /** Our combined notes that go deeper on the same ideas. */
  related?: string[];
  /** A game screen that plays this chapter's idea. */
  play?: { to: '/game/$scenarioId'; id: string; label: string };
}
