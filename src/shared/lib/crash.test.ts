import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });

const { describeError, isNoise, reportCrash, resetCrashSession, trimStack } = await import('./crash');
const { pendingCrashes } = await import('./outbox');
const queued = () => (JSON.parse(mem.get('salg-outbox') ?? '{"crashes":[]}') as { crashes: { msg: string; where: string; stack: string }[] }).crashes;

describe('crash reports', () => {
  beforeEach(() => { mem.clear(); resetCrashSession(); });

  it('describes whatever was thrown', () => {
    expect(describeError(new TypeError('x is undefined')).msg).toBe('TypeError: x is undefined');
    expect(describeError('plain text')).toEqual({ msg: 'plain text', stack: '' });
    expect(describeError({ code: 7 }).msg).toBe('{"code":7}');
    expect(describeError(undefined).msg).toBe('undefined');
  });

  it('leaves out browser noise, extensions and failed downloads', () => {
    expect(isNoise('ResizeObserver loop completed with undelivered notifications.', '')).toBe(true);
    expect(isNoise('Script error.', '')).toBe(true);
    expect(isNoise('TypeError: boom', 'at x (chrome-extension://abc/inject.js:1:2)')).toBe(true);
    expect(isNoise('TypeError: Failed to fetch dynamically imported module: /assets/ch3-x.js', '')).toBe(true);
    expect(isNoise('AbortError: The user aborted a request.', '')).toBe(true);
    expect(isNoise('TypeError: Cannot read properties of undefined (reading \'steps\')', 'at LevelPage (/assets/LevelPage-x.js:1:2)')).toBe(false);
  });

  it('keeps the first lines of a stack, without the site address or query strings', () => {
    const stack = ['TypeError: boom', ...Array.from({ length: 30 }, (_, i) => `    at f${i} (https://parcelgo.example/assets/a-1.js?v=3:1:${i})`)].join('\n');
    const t = trimStack(stack, 'https://parcelgo.example');
    expect(t.split('\n')).toHaveLength(14);
    expect(t).not.toContain('parcelgo.example');
    expect(t).not.toContain('?v=3');
    expect(t).toContain('at f0 (/assets/a-1.js:1:0)');
  });

  it('queues a crash once per kind of error, at most ten a session', () => {
    reportCrash(new Error('one'), 'render', '\n    at Boss\n    at LevelPage');
    reportCrash(new Error('one'), 'render');
    reportCrash(new Error('one'), 'promise');
    expect(pendingCrashes()).toBe(2);
    expect(queued()[0]).toMatchObject({ msg: 'Error: one', where: 'render' });
    expect(queued()[0]!.stack).toContain('--- component');
    for (let i = 0; i < 20; i++) reportCrash(new Error(`many ${i}`), 'window');
    expect(pendingCrashes()).toBe(10);
  });

  it('a noisy error is not queued at all', () => {
    reportCrash(new TypeError('Failed to fetch'), 'promise');
    expect(pendingCrashes()).toBe(0);
  });
});
