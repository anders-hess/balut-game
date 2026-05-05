import { CATEGORIES } from '../gameConstants.js';
import { bpivScoreNow } from './bpiv.js';

// ─── SCORE_NOW tooltip ────────────────────────────────────────────────────────
// Not used by the tooltip renderer — SCORE_NOW uses action.breakdown directly.
// Kept for structural completeness.

export function buildScoreNowTooltip(_cat, _bpivResult) {
  return [];
}

// ─── REROLL tooltip: top outcomes by result type ──────────────────────────────
// Groups rawOutcomes by the best-scoring category + score.
// Returns up to 5 { description, probability, downstreamBpiv } objects,
// sorted by probability × |BPIV| (impact) descending.

export function selectTop5Outcomes(rawOutcomes, scorecard) {
  const groups = new Map(); // groupKey → { description, probability, bpivWeightedSum }

  for (const o of rawOutcomes) {
    const best = _findBestAction(o.newDice, scorecard);
    if (!best) continue;

    const key   = _groupKey(best.cat, best.score);
    const label = describeResult(best.cat, best.score);

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
    // Track separately: categories that produce an actual positive score.
    // These are preferred for the tooltip label over zero-score fallbacks
    // (which would otherwise surface as "Missed Balut" or "No 4s" etc.).
    if (r.smallPoints > 0 && r.bpiv > bestPosBpiv) {
      bestPosBpiv = r.bpiv; bestPosCat = cat; bestPosScore = r.smallPoints;
    }
  }

  if (bestPosCat !== null) return { cat: bestPosCat, score: bestPosScore, bpiv: bestPosBpiv };
  return bestCat ? { cat: bestCat, score: bestScore, bpiv: bestBpiv } : null;
}

// Group choice and fullHouse by category only (collapse all score variants into
// one row). All other categories group by (cat, score) so different counts stay
// separate (e.g. "Three 4s" vs "Four 4s").
function _groupKey(cat, score) {
  if (cat === 'choice' || cat === 'fullHouse') return cat;
  return `${cat}-${score}`;
}

// Human-readable outcome name shown in the tooltip Result column.
export function describeResult(cat, score) {
  switch (cat) {
    case 'fours':    return _countName(score, 4, '4');
    case 'fives':    return _countName(score, 5, '5');
    case 'sixes':    return _countName(score, 6, '6');
    case 'straight': return score === 15 ? 'Low Straight' : 'High Straight';
    case 'fullHouse': return 'Full House';
    case 'choice':   return 'Choice';
    case 'balut': {
      if (score === 0) return 'Missed Balut';
      const face = Math.round((score - 20) / 5); // score = 5×face + 20
      return `Balut (${face}s)`;
    }
    default: return cat;
  }
}

function _countName(score, faceValue, faceStr) {
  if (score === 0) return `No ${faceStr}s`;
  const count = score / faceValue;
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five'];
  return `${words[count] || count} ${faceStr}${count !== 1 ? 's' : ''}`;
}
