import { describe, expect, it } from 'vitest';
import { issueUrl } from './issue';

describe('GitHub issue link', () => {
  it('carries the question, the right answer, the numbers and the reports', () => {
    const url = issueUrl({
      qid: 'l3-x2', level: 'Level 3 · Rate limit', concept: 'Token bucket', prompt: 'কোন algorithm burst সামলায়?',
      options: ['Token bucket', 'Fixed window'], picks: (o) => (o === 'Token bucket' ? 6 : 4),
      stat: { qid: 'l3-x2', n: 10, right: 6, sure: 8, sureWrong: 3, picks: {}, where: {}, older: 2 },
      reports: [{ kind: 'wrong', note: 'দুটোই ঠিক', lang: 'bn' }],
    });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://github.com/rakibul15/system-analysis-learning-game/issues/new');
    expect(u.searchParams.get('title')).toBe('Question l3-x2: 1 report');
    const body = u.searchParams.get('body')!;
    expect(body).toContain('1. ✓ Token bucket — picked 60%');
    expect(body).toContain('right 60% · sure but wrong 30% · 2 to earlier wordings');
    expect(body).toContain('- wrong (bn): দুটোই ঠিক');
  });

  it('stays short enough to open, even with very long reports', () => {
    const url = issueUrl({ qid: 'l1-b1', reports: Array.from({ length: 30 }, () => ({ kind: 'other', note: 'অনেক লম্বা লেখা '.repeat(40), lang: 'bn' })) });
    expect(url.length).toBeLessThanOrEqual(7500);
    expect(new URL(url).searchParams.get('body')).toContain('(cut, see /#/admin)');
  });
});
