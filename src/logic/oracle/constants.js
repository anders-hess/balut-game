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
// TODO: calibrate empirically via Oracle-directed Monte Carlo (Phase 3).
export const ATTEMPT_FRACTION = {
  straight:  0.25,
  fullHouse: 0.35,
  balut:     0.30,
};

// NOTE — Task 3 (turn-aware sum baselines) is deferred to Phase 3.
// EXPECTED_SCORE_PER_COLUMN is currently a single Oracle-play mean per category.
// Future: EXPECTED_SCORE_PER_COLUMN_AT_TURN[cat][turnsRemaining] lookup table
// (Monte Carlo measurement of per-column score conditional on when it is filled).
// Approximation when implemented: expected_at_turn(cat, t) =
//   EXPECTED_SCORE_PER_COLUMN[cat] × (0.6 + 0.4 × t / 28)
