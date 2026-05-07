import { CATEGORIES, NUM_DICE } from '../gameConstants.js';
import { DIST, uniqueSubsets } from './probabilities.js';
import { bpivScoreNow } from './bpiv.js';
import { computeTurnsRemaining } from './scoring.js';

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
// Returns maxBpiv(dice, rollsRemaining) — the highest achievable BPIV from the
// given dice state.
//
// scorecard and turnsRemaining are captured in the closure: both are constant
// within a single turn's evaluation so the memo key is (sorted dice, rollsLeft).
//
// turnsRemaining defaults to 28 − filled cells if omitted.

export function createMaxBpiv(scorecard, turnsRemaining) {
  const tR   = turnsRemaining ?? computeTurnsRemaining(scorecard);
  const memo = new Map();

  function maxBpiv(dice, rollsRemaining) {
    const key = [...dice].sort((a, b) => a - b).join(',') + '|' + rollsRemaining;
    if (memo.has(key)) return memo.get(key);

    let best = -Infinity;
    for (const cat of CATEGORIES) {
      const r = bpivScoreNow(cat, dice, scorecard, tR);
      if (r !== null && r.bpiv > best) best = r.bpiv;
    }
    if (best === -Infinity) best = 0;

    if (rollsRemaining > 0) {
      for (const held of uniqueSubsets(dice)) {
        if (held.length === NUM_DICE) continue;
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

export function bpivRerollAllHolds(dice, rollsRemaining, scorecard, turnsRemaining) {
  if (rollsRemaining <= 0) return [];

  const tR     = turnsRemaining ?? computeTurnsRemaining(scorecard);
  const maxBpiv = createMaxBpiv(scorecard, tR);
  const results = [];

  for (const held of uniqueSubsets(dice)) {
    if (held.length === NUM_DICE) continue;
    const numReroll = NUM_DICE - held.length;

    let bpiv = 0;
    const rawOutcomes = [];

    for (const { values: rolled, prob } of DIST[numReroll]) {
      const newDice    = [...held, ...rolled].sort((a, b) => a - b);
      const downstream = maxBpiv(newDice, rollsRemaining - 1);
      bpiv += prob * downstream;
      rawOutcomes.push({ held, rolled, prob, newDice, downstreamBpiv: downstream });
    }

    results.push({ held, bpiv, rawOutcomes });
  }

  return results;
}
