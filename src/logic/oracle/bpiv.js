import { CATEGORIES, BIG_POINT_RULES } from '../gameConstants.js';
import { calcTotals } from '../scoring.js';
import { EXPECTED_SCORE_PER_COLUMN, VARIANCE_PER_COLUMN, BASELINE_DISCOUNT } from './constants.js';
import { scoreCell, columnsUnfilled, nextColumn } from './scoring.js';
import { pThreshold, expectedBonus, BASELINE_SCORE } from './thresholds.js';

// ─── SCORE_NOW BPIV ──────────────────────────────────────────────────────────
// Returns { bpiv, breakdown: {categoryBigDelta, bonusBigDelta}, smallPoints }
// or null if the category has no unfilled column.

export function bpivScoreNow(cat, dice, scorecard) {
  if (nextColumn(scorecard, cat) === -1) return null;

  const actual = scoreCell(cat, dice);
  const categoryBigDelta = computeCategoryBigDelta(cat, actual, scorecard);
  const bonusBigDelta    = computeBonusBigDelta(cat, actual, scorecard);

  return {
    bpiv: categoryBigDelta + bonusBigDelta,
    breakdown: { categoryBigDelta, bonusBigDelta },
    smallPoints: actual,
  };
}

// ─── Category big-point delta ────────────────────────────────────────────────

function computeCategoryBigDelta(cat, actual, scorecard) {
  const rule = BIG_POINT_RULES[cat];

  if (rule.type === 'sum') {
    const pActual   = pThreshold(cat, scorecard, actual);
    const pBaseline = pThreshold(cat, scorecard, BASELINE_SCORE);
    return (pActual - pBaseline) * rule.points;
  }

  if (rule.type === 'filled') {
    const pActual   = pThreshold(cat, scorecard, actual);
    const pBaseline = pThreshold(cat, scorecard, BASELINE_SCORE);
    return (pActual - pBaseline) * rule.points;
  }

  if (rule.type === 'perBalut') {
    // pThreshold for balut returns E[big pts], not a probability, so no stake multiplier
    const eActual   = pThreshold(cat, scorecard, actual);
    const eBaseline = pThreshold(cat, scorecard, BASELINE_SCORE);
    return eActual - eBaseline;
  }

  return 0;
}

// ─── Bonus big-point delta ────────────────────────────────────────────────────

function computeBonusBigDelta(cat, actual, scorecard) {
  const currentTotal = calcTotals(scorecard).totalSmall;

  // Sum expected scores for all remaining unfilled cells, excluding the one being filled
  let futureMean = 0;
  let futureVar  = 0;
  for (const c of CATEGORIES) {
    let unfilledCount = columnsUnfilled(scorecard, c);
    if (c === cat) unfilledCount -= 1;
    if (unfilledCount > 0) {
      futureMean += EXPECTED_SCORE_PER_COLUMN[c] * unfilledCount;
      futureVar  += VARIANCE_PER_COLUMN[c] * unfilledCount;
    }
  }
  const futureStdev = Math.sqrt(futureVar);

  // For sum-type categories apply the same discount used in pThreshold,
  // so the bonus baseline is consistent with the category-delta baseline.
  const baselineContrib = BIG_POINT_RULES[cat].type === 'sum'
    ? EXPECTED_SCORE_PER_COLUMN[cat] * BASELINE_DISCOUNT
    : EXPECTED_SCORE_PER_COLUMN[cat];

  const eBonusActual   = expectedBonus(currentTotal + actual + futureMean, futureStdev);
  const eBonusBaseline = expectedBonus(currentTotal + baselineContrib + futureMean, futureStdev);
  return eBonusActual - eBonusBaseline;
}
