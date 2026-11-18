import { useEffect, useState } from 'react';
import { chapterLoaded, loadChapter } from './load';

export type LoadState = 'ready' | 'loading' | 'error';

/**
 * Fetches the given chapters' content and re-renders when it is in.
 * `ready` is worked out on every render, so a screen never sees a chapter it asked
 * for before that chapter has loaded.
 */
export function useChapters(chapterIds: number[]): { state: LoadState; retry: () => void } {
  const key = [...new Set(chapterIds)].sort((a, b) => a - b).join(',');
  const [, bump] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ids = key ? key.split(',').map(Number) : [];
  const ready = ids.every(chapterLoaded);

  useEffect(() => {
    const want = key ? key.split(',').map(Number) : [];
    if (want.every(chapterLoaded)) return;
    let alive = true;
    setFailed(null);
    Promise.all(want.map(loadChapter)).then(
      () => { if (alive) bump((n) => n + 1); },
      () => { if (alive) setFailed(key); },
    );
    return () => { alive = false; };
  }, [key, attempt]);

  return { state: ready ? 'ready' : failed === key ? 'error' : 'loading', retry: () => setAttempt((n) => n + 1) };
}
