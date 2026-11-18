import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });

const { addCrash, addReport, flush, logAnswer, optionKey, pending, pendingCrashes, setSender, BATCH } = await import('./outbox');
type Sender = Parameters<typeof setSender>[0] & object;

const fake = () => {
  const sent = { answers: [] as number[], reports: [] as string[] };
  const s: Sender = {
    sendAnswers: vi.fn(async (items) => { sent.answers.push(items.length); }),
    sendReport: vi.fn(async (r) => { sent.reports.push(r.qid); }),
  };
  return { s, sent };
};

describe('outbox', () => {
  beforeEach(() => { mem.clear(); setSender(null); });

  it('keeps answers and reports until a sender is there, then sends reports first and answers in batches', async () => {
    for (let i = 0; i < BATCH + 5; i++) logAnswer({ q: `l1-b${i}`, c: 1, s: 0, o: optionKey('x'), w: 'boss' });
    addReport({ qid: 'l2-b1', kind: 'wrong', note: 'the second option is also right', prompt: 'p', options: ['a', 'b'] });
    expect(pending()).toEqual({ answers: BATCH + 5, reports: 1 });
    const { s, sent } = fake();
    setSender(s);
    await flush();
    expect(sent.reports).toEqual(['l2-b1']);
    expect(sent.answers).toEqual([BATCH, 5]);
    expect(pending()).toEqual({ answers: 0, reports: 0 });
  });

  it('a failed send keeps everything for next time; a refusal by the rules stops trying', async () => {
    logAnswer({ q: 'l1-b1', c: 0, s: 1, o: 'k', w: 'review' });
    const { s } = fake();
    s.sendAnswers = vi.fn(async () => { throw new Error('offline'); });
    setSender(s);
    await flush();
    expect(pending().answers).toBe(1);
    s.sendAnswers = vi.fn(async () => { throw Object.assign(new Error('no'), { code: 'permission-denied' }); });
    await flush();
    await flush();
    expect(s.sendAnswers).toHaveBeenCalledTimes(1);
    expect(pending().answers).toBe(1);
  });

  it('sends crash reports too; a refusal for crashes keeps them but answers still go', async () => {
    addCrash({ msg: 'TypeError: boom', stack: 'at x', where: 'render', route: '#/level/2', ver: 'abc1234', ua: 'test' });
    logAnswer({ q: 'l1-b1', c: 1, s: 1, o: 'k', w: 'boss' });
    const { s, sent } = fake();
    s.sendCrash = vi.fn(async () => { throw Object.assign(new Error('no'), { code: 'permission-denied' }); });
    setSender(s);
    await flush();
    expect(sent.answers).toEqual([1]);
    expect(pendingCrashes()).toBe(1);

    const crashes: string[] = [];
    s.sendCrash = vi.fn(async (c) => { crashes.push(c.msg); });
    setSender(s); // a new sign-in tries the crashes again
    await flush();
    expect(crashes).toEqual(['TypeError: boom']);
    expect(pendingCrashes()).toBe(0);
  });

  it('option keys are short and stable', () => {
    expect(optionKey('Consistent hashing')).toBe(optionKey('Consistent hashing'));
    expect(optionKey('Consistent hashing')).not.toBe(optionKey('Consistent hashing.'));
    expect(optionKey('কিছু').length).toBeLessThanOrEqual(8);
  });
});
