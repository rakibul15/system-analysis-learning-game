/**
 * Every level of every chapter in both languages, loaded at once.
 * For tests and scripts/gen-meta.mjs only: the app loads one chapter at a time
 * through ../load.ts, and must never import this file.
 */
import type { Level } from '../schema';
import { l1, l2, l3, l4 } from './ch1';
import { l5, l6, l7 } from './ch2';
import { l8, l9, l10, l11, l12, l13, l14, l15 } from './ch3';
import { l16, l17, l18, l19, l20, l21 } from './ch4';
import { l22, l23, l24, l25, l26, l27, l28 } from './ch5';
import { l29, l30 } from './ch6';
import { l31, l32, l33, l34 } from './ch7';
import { l35, l36, l37, l38, l39, l40, l41 } from './ch7ddia';
import * as en1 from './en/ch1';
import * as en2 from './en/ch2';
import * as en3 from './en/ch3';
import * as en4 from './en/ch4';
import * as en5 from './en/ch5';
import * as en6 from './en/ch6';
import * as en7 from './en/ch7';
import * as en7d from './en/ch7ddia';
import { isEn } from '@/shared/lib/i18n';
import { allBanks } from '../bank/all';
import { register } from '../registry';

export const bnLevels = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23, l24, l25, l26, l27, l28, l29, l30, l31, l32, l33, l34, l35, l36, l37, l38, l39, l40, l41];
const enById = { ...en1, ...en2, ...en3, ...en4, ...en5, ...en6, ...en7, ...en7d } as Record<string, Level>;
export const enLevels = bnLevels.map((l) => enById[`l${l.id}`]!);

const all = isEn ? enLevels : bnLevels;

export const levelsById: Record<number, Level> = Object.fromEntries(all.map((l) => [l.id, l]));
export const levelList: Level[] = all;
export { allBanks };

// fill the registry so the bank helpers and questionsById see every chapter
register(levelList, allBanks);

export { questionsById, banks } from '../registry';
export { chapters } from '../chapters';
