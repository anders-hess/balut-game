import { CATEGORIES, CATEGORY_LABELS } from '../gameConstants.js';
import { bpivScoreNow } from './bpiv.js';
import { nextColumn } from './scoring.js';

// ─── SCORE_NOW tooltip ────────────────────────────────────────────────────────
// Deterministic: one outcome, shows the full breakdown.

export function buildScoreNowTooltip(cat, bpivResult) {
  return [{
    description: `Score ${bpivResult.smallPoints} pts in ${CATEGORY_LABELS[cat]}`,
    probability: 1,
    bestDownstreamAction: `Score ${bpivResult.smallPoints} in ${CATEGORY_LABELS[cat]}`,
    downstreamBpiv: bpivResult.bpiv,
    breakdown: bpivResult.breakdown,
  }];
}

// ─── REROLL tooltip: top-5 outcomes ──────────────────────────────────────────
// rawOutcomes: [{ held, rolled, prob, newDice, downstreamBpiv }]
// Selects up to 5 outcomes that best help the user understand the distribution.
// Strategy: rank by |prob × downstreamBpiv| (impact), take top 5, then append
// an aggregated "Other" row for the remainder if there are more than 5.

export function selectTop5Outcomes(rawOutcomes, scorecard) {
  // Annotate each outcome with the best SCORE_NOW description
  const annotated = rawOutcomes.map(o => ({
    ...o,
    impact: o.prob * Math.abs(o.downstreamBpiv),
    bestAction: _bestActionLabel(o.newDice, scorecard),
  }));

  // Sort by impact descending
  annotated.sort((a, b) => b.impact - a.impact);

  const top5 = annotated.slice(0, 5);
  const rest  = annotated.slice(5);

  const result = top5.map(o => ({
    description:        _diceDescription(o.held, o.rolled, o.newDice),
    probability:        o.prob,
    bestDownstreamAction: o.bestAction,
    downstreamBpiv:     o.downstreamBpiv,
  }));

  // Aggregate remaining outcomes into "Other" row
  if (rest.length > 0) {
    const otherProb = rest.reduce((s, o) => s + o.prob, 0);
    const otherBpiv = rest.reduce((s, o) => s + o.prob * o.downstreamBpiv, 0) / (otherProb || 1);
    result.push({
      description:        'Other outcomes',
      probability:        otherProb,
      bestDownstreamAction: rest[0]?.bestAction ?? '—',
      downstreamBpiv:     otherBpiv,
    });
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _bestActionLabel(dice, scorecard) {
  let bestCat = null;
  let bestBpiv = -Infinity;
  for (const cat of CATEGORIES) {
    const r = bpivScoreNow(cat, dice, scorecard);
    if (r !== null && r.bpiv > bestBpiv) {
      bestBpiv = r.bpiv;
      bestCat  = cat;
    }
  }
  if (!bestCat) return '—';
  const r = bpivScoreNow(bestCat, dice, scorecard);
  const sign = bestBpiv >= 0 ? '+' : '';
  return `Score ${r.smallPoints} in ${CATEGORY_LABELS[bestCat]} (${sign}${bestBpiv.toFixed(2)})`;
}

function _diceDescription(held, rolled, newDice) {
  const heldStr = held.length > 0 ? held.join('-') : '—';
  const rolledStr = rolled.length > 0 ? rolled.join('-') : '(nothing)';
  return `Hold [${heldStr}] + Roll [${rolledStr}] → [${newDice.join('-')}]`;
}
