import { describe, it, expect } from 'vitest';
import { pThreshold, expectedBonus, BASELINE_SCORE } from '../thresholds.js';
import { EXPECTED_SCORE_PER_COLUMN, P_COMPLETE_IN_3_ROLLS, ATTEMPT_FRACTION } from '../constants.js';
import { binomialCDF } from '../probabilities.js';

const emptySc = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

// ─── pThreshold – sum types ────────────────────────────────────────────────────

describe('pThreshold – sum types', () => {
  it('last column: returns 1.0 when actual score meets threshold exactly', () => {
    // Fours threshold = 52, currentSum = 40, last column, score 12 → 52
    const sc = { ...emptySc, fours: [12, 16, 12, null] }; // sum=40
    expect(pThreshold('fours', sc, 12)).toBe(1.0);
  });

  it('last column: returns 0.0 when actual score falls short', () => {
    const sc = { ...emptySc, fours: [12, 16, 12, null] }; // sum=40
    expect(pThreshold('fours', sc, 8)).toBe(0.0); // 40+8=48 < 52
  });

  it('multiple columns remaining: returns a probability between 0 and 1', () => {
    // First column of fours, scoring 8 — future mean is 3×12.5=37.5
    const p = pThreshold('fours', emptySc, 8);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('BASELINE_SCORE maps to the expected score per column (no discount)', () => {
    const pAtExpected = pThreshold('fours', emptySc, EXPECTED_SCORE_PER_COLUMN.fours);
    const pBaseline   = pThreshold('fours', emptySc, BASELINE_SCORE);
    expect(pBaseline).toBeCloseTo(pAtExpected, 6);
  });

  it('BASELINE_SCORE equals pThreshold at the expected score (Definition B — no discount)', () => {
    const pBaseline = pThreshold('fours', emptySc, BASELINE_SCORE);
    const pExpected = pThreshold('fours', emptySc, EXPECTED_SCORE_PER_COLUMN.fours);
    expect(pBaseline).toBeCloseTo(pExpected, 6);
  });

  it('higher score increases P', () => {
    const sc = { ...emptySc, sixes: [18, 18, null, null] };
    const pHigh = pThreshold('sixes', sc, 24);
    const pLow  = pThreshold('sixes', sc, 6);
    expect(pHigh).toBeGreaterThan(pLow);
  });

  it('last column, BASELINE_SCORE: uses score distribution, not expected-value point estimate', () => {
    // Sixes: 18+18+24=60, one column left (col #3=null). Need 18 to reach 78.
    // EXPECTED_SCORE_PER_COLUMN.sixes = 14.21 < 18, so the old code returned 0.
    // The actual score distribution gives P(sixes score ≥ 18) ≈ 41.6%.
    const sc = { ...emptySc, sixes: [18, 18, null, 24] };
    const p = pThreshold('sixes', sc, BASELINE_SCORE);
    expect(p).toBeGreaterThan(0.3);
    expect(p).toBeLessThan(0.6);
  });

  it('last column, BASELINE_SCORE: returns 1.0 when current sum already meets threshold', () => {
    const sc = { ...emptySc, sixes: [24, 24, null, 30] }; // sum=78, need=0
    expect(pThreshold('sixes', sc, BASELINE_SCORE)).toBe(1.0);
  });
});

// ─── pThreshold – filled types ─────────────────────────────────────────────────

describe('pThreshold – filled types (straight, fullHouse)', () => {
  it('returns 0 immediately when a prior column has 0', () => {
    const sc = { ...emptySc, fullHouse: [0, null, null, null] };
    expect(pThreshold('fullHouse', sc, 32)).toBe(0);
    expect(pThreshold('fullHouse', sc, BASELINE_SCORE)).toBe(0);
  });

  it('scoring 0 locks failure (P=0)', () => {
    const sc = { ...emptySc, fullHouse: [32, 28, 25, null] }; // 3/4 filled, all >0
    expect(pThreshold('fullHouse', sc, 0)).toBe(0);
  });

  it('last column, score > 0 → P = 1 (all 4 columns now >0)', () => {
    const sc = { ...emptySc, fullHouse: [32, 28, 25, null] };
    expect(pThreshold('fullHouse', sc, 22)).toBeCloseTo(1.0, 10);
  });

  it('baseline: binomial model P(≥4 successes in turnsRemaining×af attempts)', () => {
    // 0/4 filled → K=4 needed, n=28×0.35=9.8, p=0.35
    const p  = P_COMPLETE_IN_3_ROLLS.fullHouse;
    const af = ATTEMPT_FRACTION.fullHouse;
    const n  = 28 * af; // default turnsRemaining=28 from emptySc
    const expected = 1 - binomialCDF(3, n, p);
    expect(pThreshold('fullHouse', emptySc, BASELINE_SCORE)).toBeCloseTo(expected, 6);
  });

  it('scoring > 0 on first column: P(≥3 successes in 27×af future attempts)', () => {
    // actual>0 on first col → K=3 remaining, n=(28-1)×0.35=9.45
    const p  = P_COMPLETE_IN_3_ROLLS.fullHouse;
    const af = ATTEMPT_FRACTION.fullHouse;
    const n  = (28 - 1) * af;
    const expected = 1 - binomialCDF(2, n, p);
    expect(pThreshold('fullHouse', emptySc, 28)).toBeCloseTo(expected, 6);
  });

  it('more turns remaining → baseline probability is higher', () => {
    // With more time, an average attempt is more likely to eventually produce all fills
    const sc = { ...emptySc, fullHouse: [32, 28, 25, null] };
    const pLate  = pThreshold('fullHouse', sc, BASELINE_SCORE, 3);
    const pEarly = pThreshold('fullHouse', sc, BASELINE_SCORE, 25);
    expect(pEarly).toBeGreaterThan(pLate);
  });
});

// ─── pThreshold – balut (per-column, returns expected big points) ─────────────

describe('pThreshold – balut', () => {
  // tR=28 from emptySc; af=0.30; p=0.046
  const p  = P_COMPLETE_IN_3_ROLLS.balut;
  const af = ATTEMPT_FRACTION.balut;
  const tR = 28;

  it('all unfilled, baseline: 2 × min(4, tR×af×p)', () => {
    const futurePositive = Math.min(4, tR * af * p);
    expect(pThreshold('balut', emptySc, BASELINE_SCORE)).toBeCloseTo(2 * futurePositive, 6);
  });

  it('all unfilled, score > 0 in first column: 2 × (1 + min(3, (tR-1)×af×p))', () => {
    const futurePositive = Math.min(3, (tR - 1) * af * p);
    expect(pThreshold('balut', emptySc, 45)).toBeCloseTo(2 * (1 + futurePositive), 6);
  });

  it('scoring 0 in first column: 2 × (0 + min(3, (tR-1)×af×p))', () => {
    const futurePositive = Math.min(3, (tR - 1) * af * p);
    expect(pThreshold('balut', emptySc, 0)).toBeCloseTo(2 * futurePositive, 6);
  });

  it('score > 0 returns more expected big points than score = 0', () => {
    expect(pThreshold('balut', emptySc, 45)).toBeGreaterThan(pThreshold('balut', emptySc, 0));
  });
});

// ─── expectedBonus ─────────────────────────────────────────────────────────────

describe('expectedBonus', () => {
  it('returns deterministic bonus when stdev≈0', () => {
    expect(expectedBonus(400, 0)).toBe(1);   // 400 → +1
    expect(expectedBonus(350, 0)).toBe(0);   // 350 → 0
    expect(expectedBonus(299, 0)).toBe(-2);  // <300 → -2
  });

  it('returns value between adjacent tiers when straddling a boundary', () => {
    const e = expectedBonus(400, 30);
    expect(e).toBeGreaterThan(0);  // mean in +1 tier
    expect(e).toBeLessThan(2);
  });

  it('increases monotonically with mean', () => {
    const e300 = expectedBonus(300, 30);
    const e400 = expectedBonus(400, 30);
    const e500 = expectedBonus(500, 30);
    expect(e300).toBeLessThan(e400);
    expect(e400).toBeLessThan(e500);
  });

  it('delta is approximately 1 for a 50-point mean shift near a boundary', () => {
    const stdev = 1; // tight distribution to isolate tier effect
    const e350 = expectedBonus(350, stdev);
    const e400 = expectedBonus(400, stdev);
    expect(e400 - e350).toBeCloseTo(1, 0);
  });
});
