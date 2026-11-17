import { tr } from '@/shared/lib/i18n';
import type { BankItem } from './types';

type T = [bn: string, en: string];
/** Compact authoring: Q(id, concept, prompt, [right, wrong, wrong, wrong], explain), each text as [bn, en]. */
export const Q = (id: string, concept: string, prompt: T, options: T[], explain: T): BankItem => ({
  id, concept, prompt: tr(...prompt), options: options.map((o) => tr(...o)), explain: tr(...explain),
});
export const pick = <T,>(rand: () => number, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
export const wrongs = (right: number, cands: number[]) => [...new Set(cands.filter((c) => c !== right && c > 0))].slice(0, 3);
