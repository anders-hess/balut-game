import { describe, it, expect } from 'vitest';
import {
  scoreCell,
  categoryCurrentSum,
  columnsUnfilled,
  hasLockedFailure,
} from '../scoring.js';

const emptySc = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

describe('scoreCell', () => {
  it('returns the score for a valid pattern', () => {
    expect(scoreCell('fours', [4, 4, 1, 2, 3])).toBe(8);
    expect(scoreCell('choice', [1, 2, 3, 4, 5])).toBe(15);
    expect(scoreCell('balut', [6, 6, 6, 6, 6])).toBe(50);
  });

  it('coerces null (invalid pattern) to 0', () => {
    expect(scoreCell('straight', [1, 2, 3, 4, 4])).toBe(0); // not a straight
    expect(scoreCell('fullHouse', [1, 2, 3, 4, 5])).toBe(0); // not a full house
    expect(scoreCell('balut', [1, 2, 3, 4, 5])).toBe(0);     // not a balut
  });
});

describe('categoryCurrentSum', () => {
  it('returns 0 for empty scorecard', () => {
    expect(categoryCurrentSum(emptySc, 'fours')).toBe(0);
  });

  it('sums non-null values, ignoring nulls', () => {
    const sc = { ...emptySc, fours: [12, null, 8, null] };
    expect(categoryCurrentSum(sc, 'fours')).toBe(20);
  });

  it('includes zero scores in the sum', () => {
    const sc = { ...emptySc, fullHouse: [0, 28, null, null] };
    expect(categoryCurrentSum(sc, 'fullHouse')).toBe(28);
  });
});

describe('columnsUnfilled', () => {
  it('counts null columns', () => {
    const sc = { ...emptySc, fours: [12, null, 8, null] };
    expect(columnsUnfilled(sc, 'fours')).toBe(2);
    expect(columnsUnfilled(emptySc, 'fives')).toBe(4);
  });

  it('returns 0 when all filled', () => {
    const sc = { ...emptySc, sixes: [18, 12, 6, 24] };
    expect(columnsUnfilled(sc, 'sixes')).toBe(0);
  });
});

describe('hasLockedFailure', () => {
  it('returns false when no column has 0', () => {
    expect(hasLockedFailure(emptySc, 'fullHouse')).toBe(false);
    const sc = { ...emptySc, fullHouse: [32, null, null, null] };
    expect(hasLockedFailure(sc, 'fullHouse')).toBe(false);
  });

  it('returns true when any filled column is exactly 0', () => {
    const sc = { ...emptySc, fullHouse: [0, null, null, null] };
    expect(hasLockedFailure(sc, 'fullHouse')).toBe(true);
  });

  it('null columns do not count as 0', () => {
    expect(hasLockedFailure(emptySc, 'straight')).toBe(false);
  });
});
