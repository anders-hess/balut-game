import { describe, it, expect } from 'vitest';
import { buildScoreNowTooltip, selectTop5Outcomes } from '../outcomes.js';
import { bpivScoreNow } from '../bpiv.js';
import { bpivRerollAllHolds as bpivRoll } from '../recursion.js';

const emptySc = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

describe('buildScoreNowTooltip', () => {
  it('returns exactly 1 entry', () => {
    const r = bpivScoreNow('fours', [4, 4, 1, 2, 3], emptySc);
    const tooltip = buildScoreNowTooltip('fours', r);
    expect(tooltip).toHaveLength(1);
  });

  it('entry has probability=1 and includes breakdown', () => {
    const r = bpivScoreNow('choice', [4, 5, 6, 3, 2], emptySc);
    const [entry] = buildScoreNowTooltip('choice', r);
    expect(entry.probability).toBe(1);
    expect(entry.downstreamBpiv).toBeCloseTo(r.bpiv, 6);
    expect(entry.breakdown).toBeDefined();
  });
});

describe('selectTop5Outcomes', () => {
  it('returns at most 6 entries (5 top + Other)', () => {
    const results = bpivRoll([4, 4, 4, 1, 2], 1, emptySc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    const tooltip = selectTop5Outcomes(hold444.rawOutcomes, emptySc);
    expect(tooltip.length).toBeLessThanOrEqual(6);
  });

  it('probabilities in top-5 rows are positive', () => {
    const results = bpivRoll([4, 4, 4, 1, 2], 1, emptySc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    const tooltip = selectTop5Outcomes(hold444.rawOutcomes, emptySc);
    for (const row of tooltip) {
      expect(row.probability).toBeGreaterThan(0);
    }
  });

  it('total probability of all rows sums to ≈1', () => {
    const results = bpivRoll([4, 4, 4, 1, 2], 1, emptySc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    const tooltip = selectTop5Outcomes(hold444.rawOutcomes, emptySc);
    const total = tooltip.reduce((s, r) => s + r.probability, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('each entry has a description, bestDownstreamAction, and downstreamBpiv', () => {
    const results = bpivRoll([1, 2, 3, 4, 5], 1, emptySc);
    const holdAll = results.find(r => r.held.join(',') === '1,2,3,4,5');
    const tooltip = selectTop5Outcomes(holdAll ? holdAll.rawOutcomes : results[0].rawOutcomes, emptySc);
    for (const row of tooltip) {
      expect(typeof row.description).toBe('string');
      expect(typeof row.bestDownstreamAction).toBe('string');
      expect(typeof row.downstreamBpiv).toBe('number');
    }
  });
});
