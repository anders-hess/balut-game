import { BIG_POINT_RULES } from '../gameConstants.js';
import { calcBonus } from '../scoring.js';
import { normalCDF } from './probabilities.js';
import {
  EXPECTED_SCORE_PER_COLUMN,
  VARIANCE_PER_COLUMN,
  P_COMPLETE_IN_3_ROLLS,
} from './constants.js';
import { categoryCurrentSum, columnsUnfilled, hasLockedFailure } from './scoring.js';

// ─── P_threshold ──────────────────────────────────────────────────────────────
// Returns the probability that the big-point condition for `cat` will be met by
// game end, AFTER scoring `actionScore` in the next unfilled column.
//
// Pass actionScore = actual dice score    → P for actual outcome
// Pass actionScore = BASELINE_SCORE      → P for the baseline (avg outcome)
//
// For sum types the function is continuous in actionScore.
// For filled types pass the sentinel BASELINE_SCORE to trigger the E[P] formula.

export const BASELINE_SCORE = Symbol('baseline');

export function pThreshold(cat, scorecard, actionScore) {
  const rule = BIG_POINT_RULES[cat];

  if (rule.type === 'sum') {
    return _pThresholdSum(cat, scorecard, actionScore);
  }

  if (rule.type === 'filled') {
    return _pThresholdFilled(cat, scorecard, actionScore);
  }

  if (rule.type === 'perBalut') {
    return _expectedBalutBigPoints(cat, scorecard, actionScore);
  }

  return 0;
}

// ─── Sum types (fours, fives, sixes, choice) ─────────────────────────────────

function _pThresholdSum(cat, scorecard, actionScore) {
  const rule = BIG_POINT_RULES[cat];
  const score = actionScore === BASELINE_SCORE
    ? EXPECTED_SCORE_PER_COLUMN[cat]
    : actionScore;

  const newSum = categoryCurrentSum(scorecard, cat) + score;
  const colsRemainingAfter = columnsUnfilled(scorecard, cat) - 1;

  if (colsRemainingAfter === 0) {
    return newSum >= rule.threshold ? 1.0 : 0.0;
  }

  const futureMean  = EXPECTED_SCORE_PER_COLUMN[cat] * colsRemainingAfter;
  const futureVar   = VARIANCE_PER_COLUMN[cat] * colsRemainingAfter;
  const futureStdev = Math.sqrt(futureVar);

  if (futureStdev < 1e-10) {
    return (newSum + futureMean) >= rule.threshold ? 1.0 : 0.0;
  }

  return 1 - normalCDF((rule.threshold - newSum - futureMean) / futureStdev);
}

// ─── Filled types (straight, fullHouse) ──────────────────────────────────────

function _pThresholdFilled(cat, scorecard, actionScore) {
  // Already locked out by a prior zero-scored column
  if (hasLockedFailure(scorecard, cat)) return 0;

  const p = P_COMPLETE_IN_3_ROLLS[cat];
  const colsRemainingAfter = columnsUnfilled(scorecard, cat) - 1;

  if (actionScore === BASELINE_SCORE) {
    // E[P | average attempt] = p × p^colsRemainingAfter + (1-p) × 0
    return p ** (colsRemainingAfter + 1);
  }

  if (actionScore === 0) return 0; // this column locks failure
  return p ** colsRemainingAfter;  // this column succeeded; remaining must too
}

// ─── Balut (per-column) ───────────────────────────────────────────────────────
// Returns E[Balut big points] rather than P(threshold), because Balut awards
// big points linearly per column rather than as a single threshold.

function _expectedBalutBigPoints(cat, scorecard, actionScore) {
  const p = P_COMPLETE_IN_3_ROLLS.balut;
  const filledPositive = scorecard[cat].filter(v => v !== null && v > 0).length;
  const colsRemainingAfter = columnsUnfilled(scorecard, cat) - 1;

  if (actionScore === BASELINE_SCORE) {
    // Baseline: this column is an average attempt (p chance of >0)
    return 2 * (filledPositive + (colsRemainingAfter + 1) * p);
  }

  const thisColPositive = actionScore > 0 ? 1 : 0;
  return 2 * (filledPositive + thisColPositive + colsRemainingAfter * p);
}

// ─── Expected bonus ────────────────────────────────────────────────────────────
// E[bonus big points] when finalSmallPoints ~ Normal(mean, stdev).
//
// Uses the survival-function identity:
//   E[bonus] = -2 + Σ_{k≥0} P(X ≥ 300 + k×50)
//
// Each step from the -2 floor adds 1 big point per 50-point tier crossed.

export function expectedBonus(mean, stdev) {
  if (stdev < 1e-6) return calcBonus(Math.round(mean)); // degenerate / deterministic
  let result = -2;
  for (let k = 0; k <= 200; k++) {
    const boundary = 300 + k * 50;
    const p = 1 - normalCDF((boundary - mean) / stdev);
    if (p < 1e-12) break;
    result += p;
  }
  return result;
}
