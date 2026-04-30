import { CATEGORIES, CATEGORY_LABELS, NUM_DICE } from './gameConstants.js';
import { calculateScore, calcCategoryBigPoints, nextColumn } from './scoring.js';

// A big point is worth this many "equivalent small points" for comparison purposes
const BIG_PT_VALUE = 50;

// ─── Combinatorial outcome distributions ────────────────────────────────────
// Returns [{ values, prob }] for all distinct multisets of k dice (much smaller
// than 6^k raw outcomes — max 252 entries for k=5 vs 7776 raw).

const FACT = [1, 1, 2, 6, 24, 120];

function buildDist(k) {
  if (k === 0) return [{ values: [], prob: 1 }];
  const total = 6 ** k;
  const out = [];
  const recurse = (rem, start, curr) => {
    if (rem === 0) {
      const counts = {};
      for (const v of curr) counts[v] = (counts[v] || 0) + 1;
      let mult = FACT[k];
      for (const c of Object.values(counts)) mult /= FACT[c];
      out.push({ values: [...curr], prob: mult / total });
      return;
    }
    for (let v = start; v <= 6; v++) { curr.push(v); recurse(rem - 1, v, curr); curr.pop(); }
  };
  recurse(k, 1, []);
  return out;
}

// Pre-computed distributions for 0–5 dice
const DIST = Array.from({ length: 6 }, (_, k) => buildDist(k));

// ─── Score helpers ───────────────────────────────────────────────────────────

// Effective value of scoring a category now, including marginal big-point gain
function scoreEV(cat, dice, scorecard) {
  const col = nextColumn(scorecard, cat);
  if (col === -1) return -Infinity;
  const raw = calculateScore(cat, dice) ?? 0;
  const oldCols = scorecard[cat];
  const newCols = oldCols.map((v, i) => i === col ? raw : v);
  const marginalBig = calcCategoryBigPoints(cat, newCols) - calcCategoryBigPoints(cat, oldCols);
  return raw + marginalBig * BIG_PT_VALUE;
}

function bestScoreNow(dice, scorecard) {
  let best = 0;
  for (const cat of CATEGORIES) {
    const ev = scoreEV(cat, dice, scorecard);
    if (ev > best) best = ev;
  }
  return best;
}

// ─── Hold-pattern enumeration ────────────────────────────────────────────────

function uniqueSubsets(dice) {
  const seen = new Set();
  const out = [];
  for (let mask = 0; mask < (1 << dice.length); mask++) {
    const held = [];
    for (let i = 0; i < dice.length; i++) if (mask & (1 << i)) held.push(dice[i]);
    held.sort((a, b) => a - b);
    const key = held.join(',');
    if (!seen.has(key)) { seen.add(key); out.push(held); }
  }
  return out;
}

// ─── EV computation (memoised within one Oracle call) ───────────────────────

function holdEV(held, rollsLeft, scorecard, memo) {
  const key = `${[...held].sort().join(',')}:${rollsLeft}`;
  if (memo.has(key)) return memo.get(key);

  const dist = DIST[NUM_DICE - held.length];
  let ev = 0;

  for (const { values: rerolled, prob } of dist) {
    const full = [...held, ...rerolled];
    ev += prob * (rollsLeft === 1
      ? bestScoreNow(full, scorecard)
      : bestMoveEV(full, 1, scorecard, memo));
  }

  memo.set(key, ev);
  return ev;
}

function bestMoveEV(dice, rollsLeft, scorecard, memo) {
  let best = bestScoreNow(dice, scorecard);
  if (rollsLeft > 0) {
    for (const held of uniqueSubsets(dice)) {
      const ev = holdEV(held, rollsLeft, scorecard, memo);
      if (ev > best) best = ev;
    }
  }
  return best;
}

// ─── Hold label ─────────────────────────────────────────────────────────────

function holdLabel(held) {
  if (held.length === 0) return 'Reroll all dice';
  const counts = {};
  for (const v of held) counts[v] = (counts[v] || 0) + 1;
  const maxCount = Math.max(...Object.values(counts));
  const maxVal   = Number(Object.keys(counts).find(k => counts[k] === maxCount));

  if (maxCount === 5) return `Hold five ${maxVal}s`;
  if (maxCount === 4) return `Hold four ${maxVal}s`;
  if (maxCount === 3 && held.length === 5) return `Hold full house`;
  if (maxCount === 3) return `Hold three ${maxVal}s`;

  const uniq = [...new Set(held)].sort((a, b) => a - b);
  const isSeq = uniq.length >= 3 && uniq[uniq.length - 1] - uniq[0] === uniq.length - 1;
  if (isSeq && held.length >= 3) return `Hold straight run [${uniq.join('-')}]`;

  if (maxCount === 2 && Object.values(counts).filter(c => c === 2).length === 2)
    return `Hold two pairs`;
  if (maxCount === 2) return `Hold pair of ${maxVal}s`;

  return `Hold [${held.join(' · ')}]`;
}

// Probability of scoring > 0 in a category with 1 reroll remaining
function probHitCategory(cat, held, scorecard) {
  if (nextColumn(scorecard, cat) === -1) return 0;
  const dist = DIST[NUM_DICE - held.length];
  let prob = 0;
  for (const { values: rerolled, prob: p } of dist) {
    const full = [...held, ...rerolled];
    if ((calculateScore(cat, full) ?? 0) > 0) prob += p;
  }
  return prob;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computeRecommendations(diceValues, rollsLeft, scorecard) {
  const memo = new Map();
  const actions = [];
  const available = CATEGORIES.filter(cat => nextColumn(scorecard, cat) !== -1);

  // ── Score-now options ──────────────────────────────────────────
  for (const cat of available) {
    const raw     = calculateScore(cat, diceValues) ?? 0;
    const ev      = scoreEV(cat, diceValues, scorecard);
    const bigGain = Math.round((ev - raw) / BIG_PT_VALUE);

    actions.push({
      type:     'score',
      category: cat,
      score:    raw,
      ev,
      label:    `Score ${CATEGORY_LABELS[cat]}`,
      detail:   bigGain > 0
        ? `${raw} pts  ·  +${bigGain} big pt${bigGain > 1 ? 's' : ''}`
        : `${raw} pts`,
    });
  }

  // ── Hold-and-reroll options ────────────────────────────────────
  if (rollsLeft > 0) {
    const patterns = uniqueSubsets(diceValues).filter(h => h.length < NUM_DICE);

    for (const held of patterns) {
      const ev       = holdEV(held, rollsLeft, scorecard, memo);
      const numReroll = NUM_DICE - held.length;

      // Find best-probability category for this hold with 1 reroll remaining
      let topCat = null, topProb = 0;
      for (const cat of available) {
        const p = probHitCategory(cat, held, scorecard);
        if (p > topProb) { topProb = p; topCat = cat; }
      }

      const probText = topCat && topProb > 0.05 && topProb < 0.99
        ? `${Math.round(topProb * 100)}% chance of ${CATEGORY_LABELS[topCat]}`
        : null;

      actions.push({
        type:       'hold',
        held,
        numReroll,
        ev,
        label:      holdLabel(held),
        detail:     probText ?? `EV: ${ev.toFixed(1)} pts`,
        evText:     `EV: ${ev.toFixed(1)} pts`,
      });
    }
  }

  actions.sort((a, b) => b.ev - a.ev);
  return actions;
}
