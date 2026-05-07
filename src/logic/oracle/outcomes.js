import { CATEGORIES } from '../gameConstants.js';
import { bpivScoreNow } from './bpiv.js';
import { columnsUnfilled, categoryCurrentSum } from './scoring.js';

// ─── SCORE_NOW tooltip ────────────────────────────────────────────────────────

export function buildScoreNowTooltip(_cat, _bpivResult) {
  return [];
}

// ─── REROLL tooltip: top outcomes by result type ──────────────────────────────
// Groups rawOutcomes by the best-scoring category + score.
// Returns up to 5 { description, probability, downstreamBpiv } objects,
// sorted by downstreamBpiv descending.

export function selectTop5Outcomes(rawOutcomes, scorecard) {
  const groups = new Map(); // groupKey → { description, probability, bpivWeightedSum }

  for (const o of rawOutcomes) {
    const best = _findBestAction(o.newDice, scorecard);
    if (!best) continue;

    const key   = _groupKey(best.cat, best.score, scorecard);
    const label = describeResult(best.cat, best.score, scorecard);

    const g = groups.get(key);
    if (g) {
      g.probability    += o.prob;
      g.bpivWeightedSum += o.prob * o.downstreamBpiv;
    } else {
      groups.set(key, {
        description:     label,
        probability:     o.prob,
        bpivWeightedSum: o.prob * o.downstreamBpiv,
      });
    }
  }

  const list = [...groups.values()].map(g => ({
    description:    g.description,
    probability:    g.probability,
    downstreamBpiv: g.bpivWeightedSum / g.probability,
  }));

  list.sort((a, b) => b.downstreamBpiv - a.downstreamBpiv);

  return list.slice(0, 5);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _findBestAction(dice, scorecard) {
  let bestCat = null, bestScore = 0, bestBpiv = -Infinity;
  let bestPosCat = null, bestPosScore = 0, bestPosBpiv = -Infinity;

  for (const cat of CATEGORIES) {
    const r = bpivScoreNow(cat, dice, scorecard);
    if (r === null) continue;
    if (r.bpiv > bestBpiv) {
      bestBpiv = r.bpiv; bestCat = cat; bestScore = r.smallPoints;
    }
    if (r.smallPoints > 0 && r.bpiv > bestPosBpiv) {
      bestPosBpiv = r.bpiv; bestPosCat = cat; bestPosScore = r.smallPoints;
    }
  }

  if (bestPosCat !== null) return { cat: bestPosCat, score: bestPosScore, bpiv: bestPosBpiv };
  return bestCat ? { cat: bestCat, score: bestScore, bpiv: bestBpiv } : null;
}

// Choice is split into two groups based on score vs baseline:
//   K > 1: split at 25 (Oracle-play average) → 'choice-high' / 'choice-low'
//   K = 1: split at exact score needed for threshold → 'choice-threshold' / 'choice-miss'
// fullHouse groups by category only. All others group by (cat, score).
function _groupKey(cat, score, scorecard) {
  if (cat === 'choice') return `choice-${_choiceRegime(score, scorecard)}`;
  if (cat === 'fullHouse') return cat;
  return `${cat}-${score}`;
}

// Human-readable outcome name for the tooltip Result column.
// scorecard is optional; when provided, enables dynamic K=1 choice threshold.
export function describeResult(cat, score, scorecard = null) {
  switch (cat) {
    case 'fours':    return _countName(score, 4, '4');
    case 'fives':    return _countName(score, 5, '5');
    case 'sixes':    return _countName(score, 6, '6');
    case 'straight': return score === 15 ? 'Low Straight' : 'High Straight';
    case 'fullHouse': return 'Full House';
    case 'balut': {
      if (score === 0) return 'Missed Balut';
      const face = Math.round((score - 20) / 5);
      return `Balut (${face}s)`;
    }
    case 'choice': {
      const regime = _choiceRegime(score, scorecard);
      if (regime === 'threshold') return `Choice ≥ ${_choiceNeeded(scorecard)} (threshold!)`;
      if (regime === 'miss')      return `Choice < ${_choiceNeeded(scorecard)}`;
      if (regime === 'high')      return 'Choice ≥ 25';
      return 'Choice < 25';
    }
    default: return cat;
  }
}

// Returns the regime label for a choice score given current scorecard state.
function _choiceRegime(score, scorecard) {
  if (scorecard && columnsUnfilled(scorecard, 'choice') === 1) {
    const needed = _choiceNeeded(scorecard);
    return score >= needed ? 'threshold' : 'miss';
  }
  return score >= 25 ? 'high' : 'low';
}

// How many more points are needed in the last choice column to hit 100.
function _choiceNeeded(scorecard) {
  return 100 - categoryCurrentSum(scorecard, 'choice');
}

function _countName(score, faceValue, faceStr) {
  if (score === 0) return `No ${faceStr}s`;
  const count = score / faceValue;
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
  return `${words[count] || count} ${faceStr}${count !== 1 ? 's' : ''}`;
}
