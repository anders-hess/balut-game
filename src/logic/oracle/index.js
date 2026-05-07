import { CATEGORIES, CATEGORY_LABELS } from '../gameConstants.js';
import { nextColumn } from '../scoring.js';
import { bpivScoreNow } from './bpiv.js';
import { bpivRerollAllHolds, holdLabel } from './recursion.js';
import { buildScoreNowTooltip, selectTop5Outcomes } from './outcomes.js';
import { computeTurnsRemaining } from './scoring.js';

// ─── Public API ───────────────────────────────────────────────────────────────
// recommend({ currentDice, rollsRemaining, scorecard, turnsRemaining? })
//
// currentDice:    number[5]
// rollsRemaining: 0 | 1 | 2
// scorecard:      { [cat]: (number|null)[] }
// turnsRemaining: optional — defaults to 28 − filled cells
//
// Returns:
// {
//   actions:         [{ rank, type, category?, held?, description, bpiv,
//                       breakdown, tooltipOutcomes, isForcedAction? }],
//   isAllNegative:   boolean,
//   isForcedAction?: boolean,
//   recommendedRank: 1,
// }

export function recommend({ currentDice, rollsRemaining, scorecard, turnsRemaining }) {
  const tR = turnsRemaining ?? computeTurnsRemaining(scorecard);

  // ── Forced-action shortcut ───────────────────────────────────────────────
  // When only one cell remains and no rolls are left, the player has no choice.
  // Return BPIV = 0 with isForcedAction so the UI can display it differently.
  const unfilledCells = CATEGORIES.reduce(
    (n, c) => n + scorecard[c].filter(s => s === null).length, 0,
  );

  if (rollsRemaining === 0 && unfilledCells === 1) {
    const forcedCat = CATEGORIES.find(c => nextColumn(scorecard, c) !== -1);
    const r = bpivScoreNow(forcedCat, currentDice, scorecard, tR);
    return {
      actions: [{
        rank:           1,
        type:           'SCORE_NOW',
        category:       forcedCat,
        description:    `Score ${CATEGORY_LABELS[forcedCat]}`,
        bpiv:           0,
        isForcedAction: true,
        breakdown:      { categoryBigDelta: 0, bonusBigDelta: 0 },
        smallPoints:    r?.smallPoints ?? 0,
        tooltipOutcomes: [],
      }],
      isAllNegative:   false,
      isForcedAction:  true,
      recommendedRank: 1,
    };
  }

  // ── Normal evaluation ────────────────────────────────────────────────────
  const actions = [];

  for (const cat of CATEGORIES) {
    const r = bpivScoreNow(cat, currentDice, scorecard, tR);
    if (!r) continue;
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

  if (rollsRemaining > 0) {
    const rerollResults = bpivRerollAllHolds(currentDice, rollsRemaining, scorecard, tR);
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

  const hasPositive = actions.some(a => a.bpiv > 0);
  const displayed   = hasPositive ? actions.filter(a => a.bpiv > 0) : [...actions];
  displayed.sort((a, b) => b.bpiv - a.bpiv);

  return {
    actions:         displayed.slice(0, 5).map((a, i) => ({ ...a, rank: i + 1 })),
    isAllNegative:   !hasPositive,
    recommendedRank: 1,
  };
}
