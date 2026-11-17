import type { Note } from './types';
import { replication } from './replication';

/** Our combined study notes, in the order of the game. */
export const notes: Note[] = [replication];
export const notesById: Record<string, Note> = Object.fromEntries(notes.map((n) => [n.id, n]));
export const notesForLevel = (id: number) => notes.filter((n) => n.levels.includes(id));
export type { Note } from './types';
