import { CATEGORIES, BIG_POINT_RULES } from '../gameConstants.js';
import { calcTotals } from '../scoring.js';
import { EXPECTED_SCORE_PER_COLUMN, VARIANCE_PER_COLUMN, effectiveExpected } from './constants.js';
import { scoreCell, columnsUnfilled, nextColumn, computeTurnsRemaining } from './scoring.js';
import { pThreshold, expectedBonus, BASELINE_SCORE } from './thresholds.js';

// ─── SCORE_NOW BPIV ──────────────────────────────────────────────────────────
// Returns { bpiv, breakdown: {categoryBigDelta, bonusBigDelta}, smallPoints }
// or null if the category has no unfilled column.
//
// turnsRemaining: optional; defaults to 28 − filled cells if omitted.

export function bpivScoreNow(cat, dice, scorecard, turnsRemaining) {
  if (nextColumn(scorecard, cat) === -1) return null;

  const tR     = turnsRemaining ?? computeTurnsRemaining(scorecard);
  const actual = scoreCell(cat, dice);
  const categoryBigDelta = computeCategoryBigDelta(cat, actual, scorecard, tR);
  const bonusBigDelta    = computeBonusBigDelta(cat, actual, scorecard, tR);

  return {
    bpiv:       categoryBigDelta + bonusBigDelta,
    breakdown:  { categoryBigDelta, bonusBigDelta },
    smallPoints: actual,
  };
}

// ─── Category big-point delta ────────────────────────────────────────────────

function computeCategoryBigDelta(cat, actual, scorecard, turnsRemaining) {
  const rule = BIG_POINT_RULES[cat];

  if (rule.type === 'sum') {
    const pActual   = pThreshold(cat, scorecard, actual,         turnsRemaining);
    const pBaseline = pThreshold(cat, scorecard, BASELINE_SCORE, turnsRemaining);
    return (pActual - pBaseline) * rule.points;
  }

  if (rule.type === 'filled') {
    const pActual   = pThreshold(cat, scorecard, actual,         turnsRemaining);
    const pBaseline = pThreshold(cat, scorecard, BASELINE_SCORE, turnsRemaining);
    return (pActual - pBaseline) * rule.points;
  }

  if (rule.type === 'perBalut') {
    const eActual   = pThreshold(cat, scorecard, actual,         turnsRemaining);
    const eBaseline = pThreshold(cat, scorecard, BASELINE_SCORE, turnsRemaining);
    return eActual - eBaseline;
  }

  return 0;
}

// ─── Bonus big-point delta ────────────────────────────────────────────────────
function computeBonusBigDelta(cat, actual, scorecard, turnsRemaining) {
  const currentTotal = calcTotals(scorecard).totalSmall;

  let futureMean = 0;
  let futureVar  = 0;
  for (const c of CATEGORIES) {
    let unfilledCount = columnsUnfilled(scorecard, c);
    if (c === cat) unfilledCount -= 1;
    if (unfilledCount > 0) {
      futureMean += effectiveExpected(c, turnsRemaining) * unfilledCount;
      futureVar  += VARIANCE_PER_COLUMN[c] * unfilledCount;
    }
  }
  const futureStdev = Math.sqrt(futureVar);

  const baselineContrib = effectiveExpected(cat, turnsRemaining);

  const eBonusActual   = expectedBonus(currentTotal + actual        + futureMean, futureStdev);
  const eBonusBaseline = expectedBonus(currentTotal + baselineContrib + futureMean, futureStdev);
  return eBonusActual - eBonusBaseline;
}
