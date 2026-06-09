import { describe, it, expect } from 'vitest';
import { evaluateFeats, computeStats, evaluateProgression } from '../evaluate.js';

/**
 * Full scorecard whose defaults trigger NO feats. Override single rows per test.
 * fours=4, fives=5, sixes=6 (one-of-a-kind, not 4oak), straight=15 (low),
 * fullHouse=12 (total 48 > 40, not 7), choice=20 (total 80), balut=0 (none).
 */
function card(overrides = {}) {
  return {
    fours:     [4, 4, 4, 4],
    fives:     [5, 5, 5, 5],
    sixes:     [6, 6, 6, 6],
    straight:  [15, 15, 15, 15],
    fullHouse: [12, 12, 12, 12],
    choice:    [20, 20, 20, 20],
    balut:     [0, 0, 0, 0],
    ...overrides,
  };
}

describe('evaluateFeats', () => {
  it('default scorecard earns nothing', () => {
    expect(evaluateFeats({ scorecard: card() })).toEqual([]);
  });

  it('first_balut on a single balut, plus hoarder on all four', () => {
    expect(evaluateFeats({ scorecard: card({ balut: [25, 0, 0, 0] }) }))
      .toContain('first_balut');
    const all = evaluateFeats({ scorecard: card({ balut: [25, 30, 35, 40] }) });
    expect(all).toContain('first_balut');
    expect(all).toContain('balut_hoarder');
  });

  it('balut_hoarder requires all four columns', () => {
    expect(evaluateFeats({ scorecard: card({ balut: [25, 25, 25, 0] }) }))
      .not.toContain('balut_hoarder');
  });

  it('one_roll_wonder comes from the live flag', () => {
    expect(evaluateFeats({ scorecard: card(), featFlags: { one_roll_wonder: true } }))
      .toContain('one_roll_wonder');
    expect(evaluateFeats({ scorecard: card() })).not.toContain('one_roll_wonder');
  });

  it('the_long_road needs 20 in all four straight columns', () => {
    expect(evaluateFeats({ scorecard: card({ straight: [20, 20, 20, 20] }) }))
      .toContain('the_long_road');
    expect(evaluateFeats({ scorecard: card({ straight: [20, 20, 20, 15] }) }))
      .not.toContain('the_long_road');
  });

  it('spoilt_for_choice needs choice total over 110', () => {
    expect(evaluateFeats({ scorecard: card({ choice: [30, 30, 30, 21] }) }))
      .toContain('spoilt_for_choice');            // 111
    expect(evaluateFeats({ scorecard: card({ choice: [30, 30, 30, 20] }) }))
      .not.toContain('spoilt_for_choice');        // 110, not > 110
  });

  it('four_by_four lights up on any number category at 4oak', () => {
    expect(evaluateFeats({ scorecard: card({ sixes: [24, 24, 24, 24] }) }))
      .toContain('four_by_four');
    expect(evaluateFeats({ scorecard: card({ fives: [20, 20, 20, 20] }) }))
      .toContain('four_by_four');
    expect(evaluateFeats({ scorecard: card({ sixes: [24, 24, 24, 6] }) }))
      .not.toContain('four_by_four');
  });

  it('the_tent on a 7 full house', () => {
    expect(evaluateFeats({ scorecard: card({ fullHouse: [7, 12, 12, 12] }) }))
      .toContain('the_tent');
  });

  it('campsite needs four full houses totalling 40 or less', () => {
    const earned = evaluateFeats({ scorecard: card({ fullHouse: [8, 8, 8, 8] }) }); // 32
    expect(earned).toContain('campsite');
    expect(earned).not.toContain('the_tent');
    expect(evaluateFeats({ scorecard: card({ fullHouse: [11, 11, 11, 11] }) })) // 44
      .not.toContain('campsite');
    expect(evaluateFeats({ scorecard: card({ fullHouse: [8, 8, 8, 0] }) })) // a scratch
      .not.toContain('campsite');
  });

  it('big_roller at 500 total small points', () => {
    const loaded = card({
      fours: [20, 20, 20, 20], fives: [25, 25, 25, 25], sixes: [30, 30, 30, 30],
      choice: [30, 30, 30, 30], balut: [50, 50, 50, 50], // well over 500
    });
    expect(evaluateFeats({ scorecard: loaded })).toContain('big_roller');
    expect(evaluateFeats({ scorecard: card() })).not.toContain('big_roller'); // 248
  });

  it('clean_sheet when every cell is positive', () => {
    expect(evaluateFeats({ scorecard: card({ balut: [25, 26, 27, 28] }) }))
      .toContain('clean_sheet');
    expect(evaluateFeats({ scorecard: card() }))   // balut all 0
      .not.toContain('clean_sheet');
  });

  it('the_perfect_game when all seven categories earn big points', () => {
    const perfect = card({
      fours:     [16, 16, 16, 16], // 64 ≥ 52
      fives:     [20, 15, 15, 15], // 65 ≥ 65
      sixes:     [24, 24, 18, 18], // 84 ≥ 78
      straight:  [15, 15, 15, 20], // all 4 filled
      fullHouse: [12, 12, 12, 12], // all 4 filled
      choice:    [30, 30, 20, 20], // 100 ≥ 100
      balut:     [25, 0, 0, 0],    // ≥ 1 balut
    });
    expect(evaluateFeats({ scorecard: perfect })).toContain('the_perfect_game');
    expect(evaluateFeats({ scorecard: card() })).not.toContain('the_perfect_game');
  });
});

describe('computeStats', () => {
  it('aggregates games, baluts, big points and distinct weeks', () => {
    const scores = [
      { big_points: 8,  small_points: 320, balut_count: 1, created_at: '2026-06-01T10:00:00Z' },
      { big_points: 12, small_points: 410, balut_count: 2, created_at: '2026-06-03T10:00:00Z' }, // same week
      { big_points: 5,  small_points: 300, balut_count: 0, created_at: '2026-06-10T10:00:00Z' }, // next week
    ];
    expect(computeStats(scores)).toEqual({
      gamesPlayed: 3,
      lifetimeBaluts: 3,
      lifetimeBigPoints: 25,
      weeksActive: 2,
    });
  });

  it('handles an empty history', () => {
    expect(computeStats([])).toEqual({
      gamesPlayed: 0, lifetimeBaluts: 0, lifetimeBigPoints: 0, weeksActive: 0,
    });
  });
});

describe('evaluateProgression', () => {
  it('awards the highest tier reached', () => {
    const result = evaluateProgression({
      gamesPlayed: 60, lifetimeBaluts: 12, lifetimeBigPoints: 90, weeksActive: 4,
    });
    expect(result.games_played).toBe(2);        // ≥ 50
    expect(result.lifetime_baluts).toBe(1);      // ≥ 10
    expect(result.lifetime_big_points).toBeUndefined(); // < 100
    expect(result.weeks_active).toBe(1);         // ≥ 4
  });

  it('returns empty below all thresholds', () => {
    expect(evaluateProgression({
      gamesPlayed: 3, lifetimeBaluts: 0, lifetimeBigPoints: 10, weeksActive: 1,
    })).toEqual({});
  });
});
