import type { Note } from './types';
import { replication } from './replication';
import { caching } from './caching';
import { sharding } from './sharding';
import { transactions } from './transactions';
import { clocks } from './clocks';
import { storage } from './storage';
import { streams } from './streams';
import { consensus } from './consensus';
import { datamodels } from './datamodels';
import { encoding } from './encoding';

/** Our combined study notes, in the order of the game. */
export const notes: Note[] = [caching, replication, sharding, storage, datamodels, encoding, transactions, clocks, consensus, streams];
export const notesById: Record<string, Note> = Object.fromEntries(notes.map((n) => [n.id, n]));
export const notesForLevel = (id: number) => notes.filter((n) => n.levels.includes(id));
export type { Note } from './types';
