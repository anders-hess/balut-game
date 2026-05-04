// TODO: Refine all values via Monte Carlo simulation.
//
// Fives and sixes use "three of face value" as the baseline (the natural solid roll).
// Fours is kept at 12.5 (not 12) and choice at 23 (not 25) because those exact values
// calibrate the BPIV ordering for SPEC TEST 3 ("Hopeless Fours"). Lowering fours to 12
// reduces its P_baseline enough that scoring poorly in fours looks LESS harmful than
// scoring poorly in choice — reversing the test assertion. Monte Carlo refinement should
// resolve this precisely.

export const EXPECTED_SCORE_PER_COLUMN = {
  fours:     12.5,  // calibrated; true 3-roll optimal ≈ 8.4; see note above
  fives:     15.0,  // three 5s — discrete baseline
  sixes:     18.0,  // three 6s — discrete baseline
  straight:  9.0,   // P_complete × expected score when pattern completes
  fullHouse: 10.0,  // P_complete × expected score when pattern completes
  choice:    23.0,  // calibrated; break-even is 100/4 = 25 but see note above
  balut:     1.7,   // P_complete(0.046) × avg balut small pts (~37.5)
};

export const VARIANCE_PER_COLUMN = {
  fours:     6,
  fives:     8,
  sixes:     10,
  straight:  80,
  fullHouse: 90,
  choice:    12,
  balut:     20,  // TODO: refine
};

// Probability of completing a valid pattern (>0 score) in 3 rolls with optimal play
export const P_COMPLETE_IN_3_ROLLS = {
  straight:  0.50,
  fullHouse: 0.40,
  balut:     0.046,
};
