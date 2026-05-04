import { describe, it, expect } from 'vitest';
import { createMaxBpiv, holdLabel, bpivRerollAllHolds } from '../recursion.js';
import { bpivScoreNow } from '../bpiv.js';
import { DIST } from '../probabilities.js';

const emptySc = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

describe('holdLabel', () => {
  it('empty hold → reroll all', () => {
    expect(holdLabel([])).toBe('Reroll all dice');
  });

  it('pair', () => {
    expect(holdLabel([4, 4])).toBe('Hold pair of 4s');
  });

  it('three of a kind', () => {
    expect(holdLabel([6, 6, 6])).toBe('Hold three 6s');
  });

  it('four of a kind', () => {
    expect(holdLabel([5, 5, 5, 5])).toBe('Hold four 5s');
  });

  it('five of a kind', () => {
    expect(holdLabel([3, 3, 3, 3, 3])).toBe('Hold five 3s');
  });

  it('straight run', () => {
    expect(holdLabel([1, 2, 3, 4])).toBe('Hold straight run [1-2-3-4]');
  });

  it('two pairs', () => {
    expect(holdLabel([2, 2, 5, 5])).toBe('Hold two pairs');
  });
});

describe('createMaxBpiv', () => {
  it('returns a function', () => {
    const fn = createMaxBpiv(emptySc);
    expect(typeof fn).toBe('function');
  });

  it('returns the same value on repeated calls (memoization)', () => {
    const fn = createMaxBpiv(emptySc);
    const v1 = fn([1, 2, 3, 4, 5], 0);
    const v2 = fn([1, 2, 3, 4, 5], 0);
    expect(v1).toBe(v2);
  });

  it('dice order does not affect result (sorted key)', () => {
    const fn = createMaxBpiv(emptySc);
    const v1 = fn([4, 4, 4, 1, 2], 0);
    const v2 = fn([2, 4, 1, 4, 4], 0);
    expect(v1).toBe(v2);
  });

  it('with rollsRemaining=0, equals max bpivScoreNow across all categories', () => {
    const fn = createMaxBpiv(emptySc);
    const dice = [4, 4, 4, 3, 3];
    const best = Math.max(
      ...['fours', 'fives', 'sixes', 'straight', 'fullHouse', 'choice', 'balut']
        .map(cat => bpivScoreNow(cat, dice, emptySc)?.bpiv ?? -Infinity)
    );
    expect(fn(dice, 0)).toBeCloseTo(best, 6);
  });

  it('maxBpiv with rollsRemaining > 0 is at least as large as rollsRemaining=0', () => {
    const fn = createMaxBpiv(emptySc);
    const dice = [4, 4, 4, 1, 2];
    const v0 = fn(dice, 0);
    const v1 = fn(dice, 1);
    expect(v1).toBeGreaterThanOrEqual(v0 - 1e-10);
  });
});

// ─── SPEC TEST 2 (full): "The Trap of Just Filling the Column" ────────────────
describe('SPEC TEST 2 full – top recommendation is a REROLL', () => {
  const sc = {
    ...emptySc,
    fullHouse: [32, 28, 25, null], // 3/4 filled, all >0
    fours:     [null, null, null, null],
  };
  const dice = [4, 4, 4, 2, 1]; // NOT a valid full house
  const rollsRemaining = 1;

  it('BPIV(Hold 4-4-4, reroll 2) > 0', () => {
    const results = bpivRerollAllHolds(dice, rollsRemaining, sc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    expect(hold444).toBeDefined();
    expect(hold444.bpiv).toBeGreaterThan(0);
  });

  it('BPIV(Hold 4-4-4) > BPIV(Score 0 in Full House)', () => {
    const results = bpivRerollAllHolds(dice, rollsRemaining, sc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    const scoreNowFH = bpivScoreNow('fullHouse', dice, sc).bpiv;
    expect(hold444.bpiv).toBeGreaterThan(scoreNowFH);
  });
});

// ─── SPEC TEST 6: "Recursion: Best Downstream Action" ────────────────────────
describe('SPEC TEST 6 – Recursion: Best Downstream Action', () => {
  it('Balut outcome (4-4-4-4-4) is valued as Balut, not Fours', () => {
    // With an empty scorecard and dice [4,4,4,4,4], rollsRemaining=0,
    // the best category should be Balut (value = 5×4+20=40 pts, positive BPIV)
    const fn = createMaxBpiv(emptySc);
    const bpivAsBalut = bpivScoreNow('balut', [4, 4, 4, 4, 4], emptySc).bpiv;
    const bpivAsFours = bpivScoreNow('fours', [4, 4, 4, 4, 4], emptySc).bpiv;
    // maxBpiv picks the better option
    expect(fn([4, 4, 4, 4, 4], 0)).toBeCloseTo(bpivAsBalut, 6);
    expect(bpivAsBalut).toBeGreaterThan(bpivAsFours);
  });

  it('holding 4-4-4 outperforms holding 4-4-4-1 and 4-4-4-2 (flexibility advantage)', () => {
    // Setup: empty scorecard, dice [4,4,4,1,2], rollsRemaining=1
    // Holding 4-4-4 preserves flexibility for both Balut and Full House
    const fn = createMaxBpiv(emptySc);

    // Compute BPIV for each hold pattern
    const bpiv444   = _holdBpiv([4, 4, 4],       [4, 4, 4, 1, 2], 1, emptySc, fn);
    const bpiv4441  = _holdBpiv([4, 4, 4, 1],     [4, 4, 4, 1, 2], 1, emptySc, fn);
    const bpiv4442  = _holdBpiv([4, 4, 4, 2],     [4, 4, 4, 1, 2], 1, emptySc, fn);

    expect(bpiv444).toBeGreaterThan(bpiv4441);
    expect(bpiv444).toBeGreaterThan(bpiv4442);
  });
});

// Helper: compute the BPIV of a specific hold pattern given current dice
function _holdBpiv(held, allDice, rollsRemaining, scorecard, maxBpivFn) {
  const numReroll = allDice.length - held.length;
  const dist = DIST[numReroll];
  let bpiv = 0;
  for (const { values: rolled, prob } of dist) {
    const newDice = [...held, ...rolled].sort((a, b) => a - b);
    bpiv += prob * maxBpivFn(newDice, rollsRemaining - 1);
  }
  return bpiv;
}
