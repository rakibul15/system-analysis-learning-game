import type { Question } from '@/content/schema';

/** One idea a level teaches; the boss asks one question per concept, a different one each time. */
export interface Concept { id: string; label: string }

/** A written question: first option is right. `extra` holds more wrong options to rotate in. */
export interface BankItem { id: string; concept: string; prompt: string; options: string[]; explain: string; extra?: string[] }

/** A question whose numbers change every time; `make` returns a fresh one (first option right). */
export interface Generator { id: string; concept: string; make: (rand: () => number) => Omit<Question, 'id'> }

export interface LevelBank {
  /** In the same order as the level's five boss questions, which belong to them. */
  concepts: Concept[];
  items: BankItem[];
  gens: Generator[];
}
