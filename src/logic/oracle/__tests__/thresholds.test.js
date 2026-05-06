import { describe, it, expect } from 'vitest';
import { pThreshold, expectedBonus, BASELINE_SCORE } from '../thresholds.js';
import { EXPECTED_SCORE_PER_COLUMN } from '../constants.js';

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

  it('baseline returns p^(colsRemaining+1)', () => {
    // 0/4 filled, colsRemainingAfter=3, fullHouse P_complete=0.35
    const p = 0.35;
    expect(pThreshold('fullHouse', emptySc, BASELINE_SCORE)).toBeCloseTo(p ** 4, 10);
  });

  it('scoring > 0 on first column: P = p^3', () => {
    const p = 0.35;
    expect(pThreshold('fullHouse', emptySc, 28)).toBeCloseTo(p ** 3, 10);
  });
});

// ─── pThreshold – balut (per-column, returns expected big points) ─────────────

describe('pThreshold – balut', () => {
  it('all unfilled, baseline: 2 × 4 × p_balut', () => {
    const p = 0.046;
    expect(pThreshold('balut', emptySc, BASELINE_SCORE)).toBeCloseTo(2 * 4 * p, 6);
  });

  it('all unfilled, score > 0 in first column: 2 × (1 + 3 × p_balut)', () => {
    const p = 0.046;
    expect(pThreshold('balut', emptySc, 45)).toBeCloseTo(2 * (1 + 3 * p), 6);
  });

  it('scoring 0 in first column: 2 × (0 + 3 × p_balut)', () => {
    const p = 0.046;
    expect(pThreshold('balut', emptySc, 0)).toBeCloseTo(2 * 3 * p, 6);
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
