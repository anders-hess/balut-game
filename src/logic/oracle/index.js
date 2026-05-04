import { CATEGORIES, CATEGORY_LABELS } from '../gameConstants.js';
import { nextColumn } from '../scoring.js';
import { bpivScoreNow } from './bpiv.js';
import { bpivRerollAllHolds, holdLabel } from './recursion.js';
import { buildScoreNowTooltip, selectTop5Outcomes } from './outcomes.js';

// ─── Public API ───────────────────────────────────────────────────────────────
// recommend({ currentDice, rollsRemaining, scorecard })
//
// currentDice:    number[5]           e.g. [4, 4, 4, 3, 3]
// rollsRemaining: 0 | 1 | 2           rolls still available this turn
// scorecard:      { [cat]: (number|null)[] }
//
// Returns:
// {
//   actions: [{
//     rank, type, description, bpiv,
//     breakdown: { categoryBigDelta, bonusBigDelta },
//     tooltipOutcomes: [...]
//   }],
//   isAllNegative: boolean,
//   recommendedRank: 1,
// }

export function recommend({ currentDice, rollsRemaining, scorecard }) {
  const actions = [];

  // ── SCORE_NOW actions ────────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    const r = bpivScoreNow(cat, currentDice, scorecard);
    if (!r) continue; // category full
    actions.push({
      type:            'SCORE_NOW',
      category:        cat,
      description:     `Score ${CATEGORY_LABELS[cat]}`,
      bpiv:            r.bpiv,
      breakdown:       r.breakdown,
      smallPoints:     r.smallPoints,
      tooltipOutcomes: buildScoreNowTooltip(cat, r),
    });
  }

  // ── REROLL actions ───────────────────────────────────────────────────────
  if (rollsRemaining > 0) {
    const rerollResults = bpivRerollAllHolds(currentDice, rollsRemaining, scorecard);
    for (const { held, bpiv, rawOutcomes } of rerollResults) {
      actions.push({
        type:            'REROLL',
        held,
        description:     holdLabel(held),
        bpiv,
        breakdown:       { categoryBigDelta: null, bonusBigDelta: null },
        tooltipOutcomes: selectTop5Outcomes(rawOutcomes, scorecard),
      });
    }
  }

  // ── Filtering ────────────────────────────────────────────────────────────
  const hasPositive = actions.some(a => a.bpiv > 0);
  const displayed   = hasPositive ? actions.filter(a => a.bpiv > 0) : [...actions];
  displayed.sort((a, b) => b.bpiv - a.bpiv);

  return {
    actions:        displayed.slice(0, 5).map((a, i) => ({ ...a, rank: i + 1 })),
    isAllNegative:  !hasPositive,
    recommendedRank: 1,
  };
}
