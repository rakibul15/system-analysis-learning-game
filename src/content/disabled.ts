import { useSyncExternalStore } from 'react';

/*
 * Questions an admin has turned off because something is wrong with them (see /#/admin).
 * The list lives in Firestore (config/questions) and is fetched after sign-in; a copy is
 * kept in this browser so it also applies offline and before sign-in finishes.
 * Turned-off questions never come up in a boss or in review; a fixed one in a lesson
 * or mission is skipped with full points, since the learner did nothing wrong.
 */

const KEY = 'salg-disabled';

const read = (): Set<string> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch { return new Set(); }
};

let disabled = read();
const listeners = new Set<() => void>();

export const isDisabled = (qid: string) => disabled.has(qid);
export const disabledIds = () => [...disabled];

export function setDisabled(ids: Iterable<string>) {
  const next = new Set(ids);
  if (next.size === disabled.size && [...next].every((x) => disabled.has(x))) return;
  disabled = next;
  try { localStorage.setItem(KEY, JSON.stringify([...next].sort())); } catch { /* storage blocked: memory only */ }
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Re-renders when the list changes; returns the current set. */
export const useDisabled = () => useSyncExternalStore(subscribe, () => disabled, () => disabled);
