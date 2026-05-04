// TODO: All values below are starting estimates — refine via Monte Carlo simulation.
//       The expected scores in particular are calibrated for when a player optimally
//       chooses to score a category, which differs from the pure 3-roll expected value.
//       Run Monte Carlo before treating these as ground truth.

export const EXPECTED_SCORE_PER_COLUMN = {
  fours:     12.5,
  fives:     15.5,
  sixes:     18.5,
  straight:  9.0,   // P_complete × expected score when pattern completes
  fullHouse: 10.0,  // P_complete × expected score when pattern completes
  choice:    23.0,
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
