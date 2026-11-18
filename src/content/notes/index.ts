import type { Note } from './types';

/*
 * Notes load one at a time, when opened. Titles, gists and levels for lists and links
 * are always available from meta.ts (notesMeta, notesForLevel).
 */
const loaders: Record<string, () => Promise<Note>> = {
  caching: () => import('./caching').then((m) => m.caching),
  replication: () => import('./replication').then((m) => m.replication),
  sharding: () => import('./sharding').then((m) => m.sharding),
  storage: () => import('./storage').then((m) => m.storage),
  datamodels: () => import('./datamodels').then((m) => m.datamodels),
  encoding: () => import('./encoding').then((m) => m.encoding),
  transactions: () => import('./transactions').then((m) => m.transactions),
  clocks: () => import('./clocks').then((m) => m.clocks),
  consensus: () => import('./consensus').then((m) => m.consensus),
  streams: () => import('./streams').then((m) => m.streams),
};

export const noteIds = Object.keys(loaders);
/** The full note, or undefined for an unknown id. */
export const loadNote = (id: string): Promise<Note | undefined> => (loaders[id] ? loaders[id]() : Promise.resolve(undefined));

export { notesMeta, notesMetaById, notesForLevel, type NoteMeta } from '../meta';
export type { Note } from './types';
