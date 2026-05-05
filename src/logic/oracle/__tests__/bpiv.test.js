import { describe, it, expect } from 'vitest';
import { bpivScoreNow } from '../bpiv.js';

const emptySc = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

describe('bpivScoreNow – basic behaviour', () => {
  it('returns null when category is fully filled', () => {
    const sc = { ...emptySc, fours: [12, 8, 16, 4] };
    expect(bpivScoreNow('fours', [4, 4, 1, 2, 3], sc)).toBeNull();
  });

  it('returns an object with bpiv, breakdown, and smallPoints', () => {
    const r = bpivScoreNow('choice', [4, 4, 5, 5, 6], emptySc);
    expect(r).not.toBeNull();
    expect(typeof r.bpiv).toBe('number');
    expect(typeof r.breakdown.categoryBigDelta).toBe('number');
    expect(typeof r.breakdown.bonusBigDelta).toBe('number');
    expect(r.smallPoints).toBe(24); // 4+4+5+5+6
  });

  it('BPIV > 0 when actual exceeds the discounted baseline', () => {
    // Choice discounted baseline ≈ 21 × 0.85 = 17.85; dice score 23 — well above
    const r = bpivScoreNow('choice', [5, 5, 5, 4, 4], emptySc); // sum=23
    expect(r.bpiv).toBeGreaterThan(0);
  });
});

describe('bpivScoreNow – category big delta', () => {
  it('crossing threshold produces positive categoryBigDelta', () => {
    // Fours: 3/4 filled, currentSum=36 (below threshold-expected=39.5), scoring 16 → 52.
    // Baseline would score 12.5 → only 48.5, missing threshold.
    // Actual crosses; baseline does not → positive delta.
    const sc = { ...emptySc, fours: [12, 12, 12, null] }; // sum=36
    const r = bpivScoreNow('fours', [4, 4, 4, 4, 1], sc); // score 16
    expect(r.breakdown.categoryBigDelta).toBeGreaterThan(0);
  });

  it('scoring 0 in a filled-type last column produces strongly negative categoryBigDelta', () => {
    // Full House: 3/4 filled, dice don't form a full house → score 0 → locks failure
    const sc = { ...emptySc, fullHouse: [32, 28, 25, null] };
    const r = bpivScoreNow('fullHouse', [4, 4, 4, 2, 1], sc); // not a FH
    expect(r.breakdown.categoryBigDelta).toBeLessThan(-1.0);
  });

  it('completing a full house on the last column produces large positive BPIV', () => {
    const sc = { ...emptySc, fullHouse: [32, 28, 25, null] };
    const r = bpivScoreNow('fullHouse', [4, 4, 4, 3, 3], sc); // valid FH
    expect(r.bpiv).toBeGreaterThan(1.0);
  });
});

// ─── SPEC TEST 1: "The Last Full House" ───────────────────────────────────────
describe('SPEC TEST 1 – The Last Full House', () => {
  const sc = {
    ...emptySc,
    fullHouse: [32, 28, 25, null], // 3/4 filled, all >0
    fours:     [null, null, null, null],
  };
  const dice = [4, 4, 4, 3, 3]; // valid Full House, scores 18; also 12 in Fours

  it('BPIV(Score Full House) is significantly greater than BPIV(Score Fours)', () => {
    const fhBpiv   = bpivScoreNow('fullHouse', dice, sc).bpiv;
    const fourBpiv = bpivScoreNow('fours',     dice, sc).bpiv;
    expect(fhBpiv).toBeGreaterThan(fourBpiv + 1.5); // at least 1.5 big pts apart
  });

  it('BPIV(Score Full House) is positive', () => {
    expect(bpivScoreNow('fullHouse', dice, sc).bpiv).toBeGreaterThan(0);
  });
});

// ─── SPEC TEST 2 (partial): "The Trap of Just Filling the Column" ─────────────
describe('SPEC TEST 2 partial – scoring 0 in Full House is strongly negative', () => {
  const sc = {
    ...emptySc,
    fullHouse: [32, 28, 25, null],
  };
  const dice = [4, 4, 4, 2, 1]; // NOT a valid full house → scores 0

  it('BPIV(Score 0 in Full House) < -1.0', () => {
    const r = bpivScoreNow('fullHouse', dice, sc);
    expect(r.bpiv).toBeLessThan(-1.0);
  });

  it('BPIV(Score 12 in Fours) is close to 0 (positive or slightly negative)', () => {
    const r = bpivScoreNow('fours', dice, sc);
    expect(Math.abs(r.bpiv)).toBeLessThan(0.5);
  });
});

// ─── SPEC TEST 3: Adjusted Baseline — Fours Near Baseline vs. Choice Below ────
describe('SPEC TEST 3 – Adjusted Baseline Ordering', () => {
  // With calibrated baselines: fours expected ≈ 8.5 × 0.85 = 7.225 effective.
  // Dice: [4,4,1,1,1] → Fours=8 (just above discounted baseline),
  //                      Choice=11 (well below choice discounted baseline ≈ 17.85).
  it('BPIV(Score in Fours) > BPIV(Score in Choice) when fours is above baseline but choice is below', () => {
    const dice = [4, 4, 1, 1, 1];
    const fours  = bpivScoreNow('fours',  dice, emptySc).bpiv;
    const choice = bpivScoreNow('choice', dice, emptySc).bpiv;
    expect(fours).toBeGreaterThan(choice);
  });

  it('BPIV(fours=8) is positive (just above discounted baseline)', () => {
    const r = bpivScoreNow('fours', [4, 4, 1, 1, 1], emptySc);
    expect(r.bpiv).toBeGreaterThan(0);
  });

  it('BPIV(choice=11) is negative (well below discounted baseline)', () => {
    const r = bpivScoreNow('choice', [4, 4, 1, 1, 1], emptySc);
    expect(r.bpiv).toBeLessThan(0);
  });
});

// ─── Three-of-a-Kind Ordering ─────────────────────────────────────────────────
describe('Three-of-a-Kind in threshold category – positive BPIV', () => {
  it('scoring three 4s (12 pts) in Fours has positive BPIV on empty scorecard', () => {
    const r = bpivScoreNow('fours', [4, 4, 4, 1, 2], emptySc);
    expect(r.bpiv).toBeGreaterThan(0);
  });

  it('four-of-a-kind > three-of-a-kind > two-of-a-kind > one in BPIV ordering', () => {
    const r4 = bpivScoreNow('fours', [4, 4, 4, 4, 1], emptySc).bpiv; // 16
    const r3 = bpivScoreNow('fours', [4, 4, 4, 1, 2], emptySc).bpiv; // 12
    const r2 = bpivScoreNow('fours', [4, 4, 1, 1, 1], emptySc).bpiv; // 8
    const r1 = bpivScoreNow('fours', [4, 1, 1, 1, 1], emptySc).bpiv; // 4
    expect(r4).toBeGreaterThan(r3);
    expect(r3).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r1);
  });

  it('the gap between four-of-a-kind and three-of-a-kind is meaningful (>0.1)', () => {
    const r4 = bpivScoreNow('fours', [4, 4, 4, 4, 1], emptySc).bpiv;
    const r3 = bpivScoreNow('fours', [4, 4, 4, 1, 2], emptySc).bpiv;
    expect(r4 - r3).toBeGreaterThan(0.1);
  });

  it('same ordering holds for Fives', () => {
    const r3 = bpivScoreNow('fives', [5, 5, 5, 1, 2], emptySc).bpiv; // 15
    const r2 = bpivScoreNow('fives', [5, 5, 1, 1, 1], emptySc).bpiv; // 10
    expect(r3).toBeGreaterThan(r2);
    expect(r3).toBeGreaterThan(0);
  });
});
