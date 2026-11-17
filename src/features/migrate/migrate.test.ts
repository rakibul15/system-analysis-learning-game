import { describe, expect, it } from 'vitest';
import { runPlan, SAFE_ORDER, scenarios } from './migrate';

describe('migration mode', () => {
  it('the safe order finishes with no loss, no downtime and a way back', () => {
    const r = runPlan(SAFE_ORDER);
    expect(r).toMatchObject({ finished: true, lostData: false, downtime: 0, rollbackSafe: true, score: 4 });
  });
  it('copying before dual writes leaves a gap that only verification catches', () => {
    expect(runPlan(['copy', 'expand', 'reads', 'writes', 'contract']).lostData).toBe(true);
    expect(runPlan(['copy', 'expand', 'verify', 'reads', 'writes', 'contract']).lostData).toBe(false);
  });
  it('cutting writes before reads, or retiring early, loses data', () => {
    expect(runPlan(['expand', 'copy', 'verify', 'writes', 'reads', 'contract']).lostData).toBe(true);
    expect(runPlan(['expand', 'copy', 'verify', 'contract']).lostData).toBe(true);
  });
  it('the shortcuts cost downtime or the way back', () => {
    const stop = runPlan(['downtime', 'copy', 'bigbang', 'contract']);
    expect(stop.downtime).toBe(120);
    expect(stop.lostData).toBe(false);
    expect(stop.rollbackSafe).toBe(false);
    expect(runPlan(['expand', 'copy', 'bigbang', 'contract']).rollbackSafe).toBe(false);
  });
  it('every scenario words all eight moves', () => {
    for (const s of scenarios) expect(Object.keys(s.steps).sort()).toEqual(['bigbang', 'contract', 'copy', 'downtime', 'expand', 'reads', 'verify', 'writes']);
  });
});
