import { note as v1_1 } from './v1-1';
import { note as v1_2 } from './v1-2';
import { note as v1_3 } from './v1-3';
import { note as v1_4 } from './v1-4';
import type { XuNote } from './types';

/** Every written chapter note at once. For tests only; the app loads one when it opens (index.ts). */
export const xuNotes: XuNote[] = [v1_1, v1_2, v1_3, v1_4];
