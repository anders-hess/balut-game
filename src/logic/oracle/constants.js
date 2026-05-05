// ─── Baseline discount ────────────────────────────────────────────────────────
// Applied to EXPECTED_SCORE_PER_COLUMN when computing the SCORE_NOW baseline for
// sum-type categories (Fours, Fives, Sixes, Choice).
//
// Rationale: unconditional column means average over both optimal-attempt turns
// and late-game forced-fill turns.  When the player is deciding whether to score
// now, the relevant alternative is the realistic next score — which is biased
// downward by those forced fills.  The discount makes "above-average" outcomes
// register as positive BPIV and matches player intuition about progress toward
// big-point thresholds.
//
// TODO: calibrate empirically via Monte Carlo simulation of optimal play.
export const BASELINE_DISCOUNT = 0.85;

// ─── Expected small-point score per column ────────────────────────────────────
// Values measured via Monte Carlo simulation of optimal play (fours/fives/sixes/
// choice) or estimated analytically (straight/fullHouse/balut).
//
// TODO: confirm via Monte Carlo Phase 2 simulator.
export const EXPECTED_SCORE_PER_COLUMN = {
  fours:      8.5,   // TODO: Monte Carlo — optimal-play empirical mean (~8.5)
  fives:     10.5,   // TODO: Monte Carlo
  sixes:     12.5,   // TODO: Monte Carlo
  straight:   9.0,   // P_complete × expected score when pattern completes
  fullHouse: 10.0,   // P_complete × expected score when pattern completes
  choice:    21.0,   // TODO: Monte Carlo — optimal-play empirical mean (~21)
  balut:      1.7,   // P_complete(0.046) × avg balut small pts (~37.5)
};

// ─── Variance per column ──────────────────────────────────────────────────────
// Used by the normal-distribution approximation for expected bonus calculation.
// Sum-type categories have heavy left tails from forced fills, giving much higher
// variance than naive estimates based on 3-roll optimal distributions.
//
// TODO: confirm via Monte Carlo Phase 2 simulator.
export const VARIANCE_PER_COLUMN = {
  fours:     28,   // TODO: Monte Carlo — heavy left tail from forced fills
  fives:     32,   // TODO: Monte Carlo
  sixes:     38,   // TODO: Monte Carlo
  straight:  80,
  fullHouse: 90,
  choice:    25,   // TODO: Monte Carlo
  balut:     20,   // TODO: refine
};

// Probability of completing a valid pattern (>0 score) in 3 rolls with optimal play
export const P_COMPLETE_IN_3_ROLLS = {
  straight:  0.50,
  fullHouse: 0.40,
  balut:     0.046,
};
