import { BIG_POINT_RULES } from '../gameConstants.js';
import { calcBonus } from '../scoring.js';
import { normalCDF, binomialCDF } from './probabilities.js';
import { EXPECTED_SCORE_PER_COLUMN, P_COMPLETE_IN_3_ROLLS, ATTEMPT_FRACTION } from './constants.js';
import { SUM_CDF, CHOICE_MIXED_CDF } from './distributions.js';
import { categoryCurrentSum, columnsUnfilled, hasLockedFailure, computeTurnsRemaining } from './scoring.js';

// ─── P_threshold ──────────────────────────────────────────────────────────────
// Returns the probability that the big-point condition for `cat` will be met by
// game end, AFTER scoring `actionScore` in the next unfilled column.
//
// Pass actionScore = actual dice score    → P for actual outcome
// Pass actionScore = BASELINE_SCORE      → P for the baseline (avg outcome)
//
// Sum types:   discrete convolution CDFs (distributions.js) — exact enumeration.
// Filled types: binomial time-pressure model using turnsRemaining + ATTEMPT_FRACTION.
// turnsRemaining defaults to 28 − filled cells if not provided.

export const BASELINE_SCORE = Symbol('baseline');

export function pThreshold(cat, scorecard, actionScore, turnsRemaining) {
  const tR = turnsRemaining ?? computeTurnsRemaining(scorecard);
  const rule = BIG_POINT_RULES[cat];

  if (rule.type === 'sum')      return _pThresholdSum(cat, scorecard, actionScore);
  if (rule.type === 'filled')   return _pThresholdFilled(cat, scorecard, actionScore, tR);
  if (rule.type === 'perBalut') return _expectedBalutBigPoints(cat, scorecard, actionScore, tR);

  return 0;
}

// ─── Sum types (fours, fives, sixes, choice) ─────────────────────────────────
// Exact discrete CDF lookup. Baseline uses flat EXPECTED_SCORE_PER_COLUMN —
// the Oracle-quality average, not a late-game-discounted value.

function _pThresholdSum(cat, scorecard, actionScore) {
  const rule = BIG_POINT_RULES[cat];
  const score = actionScore === BASELINE_SCORE
    ? EXPECTED_SCORE_PER_COLUMN[cat]
    : actionScore;

  const newSum = categoryCurrentSum(scorecard, cat) + score;
  const K = columnsUnfilled(scorecard, cat) - 1;

  if (K === 0) {
    if (actionScore === BASELINE_SCORE) {
      // The expected-value point estimate (e.g. 14.21 for sixes) may fall short of
      // the threshold while the actual score distribution still has meaningful
      // probability of reaching it. Use SUM_CDF[cat][1] — the single-column score
      // distribution — so pBaseline correctly reflects P(Oracle score ≥ needed)
      // rather than a binary check against the mean.
      const needed0 = rule.threshold - categoryCurrentSum(scorecard, cat);
      if (needed0 <= 0) return 1.0;
      const cdf0 = cat === 'choice' ? CHOICE_MIXED_CDF[1] : SUM_CDF[cat][1];
      const idx0 = Math.ceil(needed0) - 1;
      if (idx0 >= cdf0.length) return 0.0;
      return 1 - cdf0[idx0];
    }
    return newSum >= rule.threshold ? 1.0 : 0.0;
  }

  const needed = rule.threshold - newSum;
  if (needed <= 0) return 1.0;

  const cdf = cat === 'choice' ? CHOICE_MIXED_CDF[K] : SUM_CDF[cat][K];
  const idx = Math.ceil(needed) - 1;
  if (idx >= cdf.length) return 0.0;
  return 1 - cdf[idx];
}

// ─── Filled types (straight, fullHouse) ──────────────────────────────────────
// Binomial time-pressure model:
//   available_attempts = turnsRemaining × ATTEMPT_FRACTION[cat]
//   P(all K columns filled) = P(Bin(available_attempts, p) ≥ K)
//                           = 1 − BinomialCDF(K − 1, available_attempts, p)
//
// For BASELINE_SCORE: K = colsRemainingAfter + 1 (includes this turn's attempt).
// For actual > 0:     K = colsRemainingAfter     (this column already secured).
// For actual = 0:     return 0                   (locks failure).
//
// A locked failure (any prior column = 0) always returns 0.

function _pThresholdFilled(cat, scorecard, actionScore, turnsRemaining) {
  if (hasLockedFailure(scorecard, cat)) return 0;

  const p  = P_COMPLETE_IN_3_ROLLS[cat];
  const af = ATTEMPT_FRACTION[cat];
  const colsRemainingAfter = columnsUnfilled(scorecard, cat) - 1;

  if (actionScore === BASELINE_SCORE) {
    const n = turnsRemaining * af;
    const K = colsRemainingAfter + 1;
    return K <= 0 ? 1 : 1 - binomialCDF(K - 1, n, p);
  }

  if (actionScore === 0) return 0;

  const K = colsRemainingAfter;
  if (K <= 0) return 1;
  const n = (turnsRemaining - 1) * af;
  return 1 - binomialCDF(K - 1, n, p);
}

// ─── Balut (per-column) ───────────────────────────────────────────────────────
// Returns E[Balut big points] (not a probability — Balut awards 2 big pts per
// filled positive column, linearly, rather than as a single threshold).

function _expectedBalutBigPoints(cat, scorecard, actionScore, turnsRemaining) {
  const p = P_COMPLETE_IN_3_ROLLS.balut;
  const filledPositive = scorecard[cat].filter(v => v !== null && v > 0).length;
  const colsRemainingAfter = columnsUnfilled(scorecard, cat) - 1;

  if (actionScore === BASELINE_SCORE) {
    const futurePositive = Math.min(
      colsRemainingAfter + 1,
      turnsRemaining * ATTEMPT_FRACTION.balut * p,
    );
    return 2 * (filledPositive + futurePositive);
  }

  const thisColPositive = actionScore > 0 ? 1 : 0;
  const futureAttempts  = (turnsRemaining - 1) * ATTEMPT_FRACTION.balut;
  const futurePositive  = Math.min(colsRemainingAfter, futureAttempts * p);
  return 2 * (filledPositive + thisColPositive + futurePositive);
}

// ─── Expected bonus ───────────────────────────────────────────────────────────
// E[bonus big points] when finalSmallPoints ~ Normal(mean, stdev).
// Uses the survival-function identity: E[bonus] = −2 + Σ_{k≥0} P(X ≥ 300 + k×50).

export function expectedBonus(mean, stdev) {
  if (stdev < 1e-6) return calcBonus(Math.round(mean));
  let result = -2;
  for (let k = 0; k <= 200; k++) {
    const boundary = 300 + k * 50;
    const p = 1 - normalCDF((boundary - mean) / stdev);
    if (p < 1e-12) break;
    result += p;
  }
  return result;
}
