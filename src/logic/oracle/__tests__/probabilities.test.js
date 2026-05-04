import { describe, it, expect } from 'vitest';
import { normalCDF, DIST, uniqueSubsets } from '../probabilities.js';

describe('normalCDF', () => {
  it('returns 0.5 at z=0', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 6);
  });

  it('returns ~0.975 at z=1.96', () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
  });

  it('returns ~0.025 at z=-1.96', () => {
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 2);
  });

  it('returns ~0.841 at z=1', () => {
    expect(normalCDF(1)).toBeCloseTo(0.8413, 3);
  });

  it('is symmetric: normalCDF(z) + normalCDF(-z) = 1', () => {
    for (const z of [0.5, 1.0, 2.0, 3.0]) {
      expect(normalCDF(z) + normalCDF(-z)).toBeCloseTo(1, 10);
    }
  });

  it('approaches 0 and 1 at extremes', () => {
    expect(normalCDF(-6)).toBeCloseTo(0, 6);
    expect(normalCDF(6)).toBeCloseTo(1, 6);
  });
});

describe('DIST', () => {
  it('DIST[0] is a single outcome with prob=1 and empty values', () => {
    expect(DIST[0]).toEqual([{ values: [], prob: 1 }]);
  });

  it('DIST[1] has 6 distinct outcomes each with prob 1/6', () => {
    expect(DIST[1]).toHaveLength(6);
    for (const entry of DIST[1]) {
      expect(entry.prob).toBeCloseTo(1 / 6, 10);
    }
  });

  it('DIST[2] has 21 distinct multisets (C(7,2))', () => {
    expect(DIST[2]).toHaveLength(21);
  });

  it('DIST[5] has 252 distinct multisets (C(10,5))', () => {
    expect(DIST[5]).toHaveLength(252);
  });

  it('probabilities in each DIST[k] sum to 1', () => {
    for (let k = 0; k <= 5; k++) {
      const total = DIST[k].reduce((s, e) => s + e.prob, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('values in each multiset are sorted ascending', () => {
    for (const entry of DIST[5]) {
      for (let i = 0; i < entry.values.length - 1; i++) {
        expect(entry.values[i]).toBeLessThanOrEqual(entry.values[i + 1]);
      }
    }
  });
});

describe('uniqueSubsets', () => {
  it('returns one subset for identical dice', () => {
    // [4,4,4,4,4] → only distinct subsets are [], [4], [4,4], [4,4,4], [4,4,4,4], [4,4,4,4,4]
    const subs = uniqueSubsets([4, 4, 4, 4, 4]);
    expect(subs).toHaveLength(6);
  });

  it('returns the empty subset (hold nothing)', () => {
    const subs = uniqueSubsets([1, 2, 3, 4, 5]);
    const hasEmpty = subs.some(s => s.length === 0);
    expect(hasEmpty).toBe(true);
  });

  it('all subsets are sorted ascending', () => {
    const subs = uniqueSubsets([3, 1, 4, 1, 5]);
    for (const s of subs) {
      for (let i = 0; i < s.length - 1; i++) {
        expect(s[i]).toBeLessThanOrEqual(s[i + 1]);
      }
    }
  });

  it('no duplicate subsets', () => {
    const subs = uniqueSubsets([2, 2, 3, 3, 4]);
    const keys = subs.map(s => s.join(','));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
