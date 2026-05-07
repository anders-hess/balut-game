// ─── Expected small-point score per column ────────────────────────────────────
// Values from Oracle-directed Monte Carlo, iteration 2 (10 000 games).
// Hold decisions guided by fast Oracle (rollsRemaining=0); scoring by BPIV.
// These are Definition-B values — per-column mean under realistic Oracle play
// including selective fills and late-game forced fills.
//
// Used as the BASELINE for BPIV: a column score at this value is average play.
export const EXPECTED_SCORE_PER_COLUMN = {
  fours:      10.50,
  fives:      13.01,
  sixes:      14.21,
  straight:    7.17,
  fullHouse:  14.70,
  choice:     25.06,
  balut:       6.30,
};

// ─── Variance per column ──────────────────────────────────────────────────────
// Used by expectedBonus (normal-distribution approximation for bonus CDF).
// From the same Oracle-directed Monte Carlo run (iteration 2).
// Balut is heavily bimodal (0 or ~37 pts), driving the large variance.
export const VARIANCE_PER_COLUMN = {
  fours:      11.79,
  fives:      19.11,
  sixes:      30.96,
  straight:   71.34,
  fullHouse:  83.49,
  choice:      4.12,
  balut:     232.63,
};

// Probability of completing a valid pattern (>0 score) in 3 rolls with optimal play.
// straight/fullHouse from isolated greedy-strategy simulation (100 000 trials).
// balut confirmed analytically.
export const P_COMPLETE_IN_3_ROLLS = {
  straight:  0.25,
  fullHouse: 0.35,
  balut:     0.046,
};

// Fraction of remaining turns expected to be dedicated to each filled category.
// Used in the binomial time-pressure model: available_attempts = turnsRemaining × af.
// Calibrated by back-solving: P(Bin(28×af, p) ≥ 4) = empirical completion rate.
//   straight:  5.7% of games complete all 4 → af=0.235
//   fullHouse: 70.7% of games complete all 4 → af=0.457
//   balut:     0.07% of games complete all 4 → af=0.351
export const ATTEMPT_FRACTION = {
  straight:  0.235,
  fullHouse: 0.457,
  balut:     0.351,
};

// Turn-aware baseline: scales the per-column expectation by how many turns remain.
// Early game (t≈28): factor≈1.0 — Oracle can wait for good dice, mean stays high.
// Late game (t≈5):   factor≈0.67 — forced fills drag the effective baseline down.
// This makes below-average scores acceptable late in the game (when forced fills
// are inevitable) and correctly raises the bar for above-average scores early.
//
// t=28 → 1.00 × mean  (full game, no discount)
// t=14 → 0.80 × mean  (mid-game)
// t=5  → 0.67 × mean  (late game)
// t=1  → 0.61 × mean  (near forced)
//
// TODO Phase 4: replace with Monte Carlo lookup table
//   EXPECTED_SCORE_PER_COLUMN_AT_TURN[cat][t] measured from games conditioned
//   on when each column was actually filled.
export function effectiveExpected(cat, turnsRemaining) {
  return EXPECTED_SCORE_PER_COLUMN[cat] * (0.6 + 0.4 * turnsRemaining / 28);
}
