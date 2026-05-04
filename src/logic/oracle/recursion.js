import { CATEGORIES, NUM_DICE } from '../gameConstants.js';
import { DIST, uniqueSubsets } from './probabilities.js';
import { bpivScoreNow } from './bpiv.js';

// ─── Human-readable hold label ────────────────────────────────────────────────

export function holdLabel(held) {
  if (held.length === 0) return 'Reroll all dice';
  const counts = {};
  for (const v of held) counts[v] = (counts[v] || 0) + 1;
  const maxCount = Math.max(...Object.values(counts));
  const maxVal   = Number(Object.keys(counts).find(k => counts[k] === maxCount));

  if (maxCount === 5) return `Hold five ${maxVal}s`;
  if (maxCount === 4) return `Hold four ${maxVal}s`;
  if (maxCount === 3 && held.length === 5) return 'Hold full house';
  if (maxCount === 3) return `Hold three ${maxVal}s`;

  const uniq = [...new Set(held)].sort((a, b) => a - b);
  const isSeq = uniq.length >= 3 && uniq[uniq.length - 1] - uniq[0] === uniq.length - 1;
  if (isSeq && held.length >= 3) return `Hold straight run [${uniq.join('-')}]`;

  if (maxCount === 2 && Object.values(counts).filter(c => c === 2).length === 2)
    return 'Hold two pairs';
  if (maxCount === 2) return `Hold pair of ${maxVal}s`;

  return `Hold [${held.join(' · ')}]`;
}

// ─── Memoized max-BPIV function ───────────────────────────────────────────────
// Returns a function maxBpiv(dice, rollsRemaining) that finds the highest
// achievable BPIV from the given dice state.
//
// The scorecard is captured as a closure — it does NOT change within a single
// turn evaluation, so the memo key only needs (sorted dice, rollsRemaining).
//
// CRITICAL: At each node the algorithm considers ALL unfilled categories, not
// just the one implied by the hold pattern. This correctly values outcomes like
// holding 4-4-4 and rolling 4-4 as a Balut, not just as Fours.

export function createMaxBpiv(scorecard) {
  const memo = new Map();

  function maxBpiv(dice, rollsRemaining) {
    const key = [...dice].sort((a, b) => a - b).join(',') + '|' + rollsRemaining;
    if (memo.has(key)) return memo.get(key);

    // Consider all SCORE_NOW options across ALL categories
    let best = -Infinity;
    for (const cat of CATEGORIES) {
      const r = bpivScoreNow(cat, dice, scorecard);
      if (r !== null && r.bpiv > best) best = r.bpiv;
    }
    if (best === -Infinity) best = 0; // all 28 cells filled (end of game)

    // Consider all REROLL options (hold a subset, reroll the rest)
    if (rollsRemaining > 0) {
      for (const held of uniqueSubsets(dice)) {
        if (held.length === NUM_DICE) continue; // holding all = score now, skip
        const numReroll = NUM_DICE - held.length;
        let rerollBpiv = 0;
        for (const { values: rolled, prob } of DIST[numReroll]) {
          const newDice = [...held, ...rolled].sort((a, b) => a - b);
          rerollBpiv += prob * maxBpiv(newDice, rollsRemaining - 1);
        }
        if (rerollBpiv > best) best = rerollBpiv;
      }
    }

    memo.set(key, best);
    return best;
  }

  return maxBpiv;
}

export { uniqueSubsets };

// ─── REROLL: all hold patterns ────────────────────────────────────────────────
// Returns an array of { held, bpiv, rawOutcomes } for every non-trivial hold
// subset of dice.  bpiv is the probability-weighted average of maxDownstreamBpiv
// across reroll outcomes — the honest mean, not the best-case.

export function bpivRerollAllHolds(dice, rollsRemaining, scorecard) {
  if (rollsRemaining <= 0) return [];

  const maxBpiv = createMaxBpiv(scorecard);
  const results = [];

  for (const held of uniqueSubsets(dice)) {
    if (held.length === NUM_DICE) continue; // holding all = score now
    const numReroll = NUM_DICE - held.length;

    let bpiv = 0;
    const rawOutcomes = [];

    for (const { values: rolled, prob } of DIST[numReroll]) {
      const newDice = [...held, ...rolled].sort((a, b) => a - b);
      const downstream = maxBpiv(newDice, rollsRemaining - 1);
      bpiv += prob * downstream;
      rawOutcomes.push({ held, rolled, prob, newDice, downstreamBpiv: downstream });
    }

    results.push({ held, bpiv, rawOutcomes });
  }

  return results;
}
