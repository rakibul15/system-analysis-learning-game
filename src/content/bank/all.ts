import { ch1Bank } from './ch1';
import { ch2Bank } from './ch2';
import { ch3Bank } from './ch3';
import { ch4Bank } from './ch4';
import { ch5Bank } from './ch5';
import { ch6Bank } from './ch6';
import { ch7Bank } from './ch7';
import { ch7ddiaBank } from './ch7ddia';
import type { LevelBank } from './types';

/** Every chapter's question bank at once. For tests and scripts only; the app loads banks per chapter. */
export const allBanks: Record<number, LevelBank> = { ...ch1Bank, ...ch2Bank, ...ch3Bank, ...ch4Bank, ...ch5Bank, ...ch6Bank, ...ch7Bank, ...ch7ddiaBank };
