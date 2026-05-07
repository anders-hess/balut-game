import { calculateScore as _calculateScore } from '../scoring.js';
import { CATEGORIES, NUM_COLUMNS } from '../gameConstants.js';
export { calculateScore, nextColumn, calcTotals } from '../scoring.js';

// Number of turns remaining in the game.
// turnsRemaining = total cells − filled cells = 28 − non-null entries.
export function computeTurnsRemaining(scorecard) {
  const filled = CATEGORIES.reduce((n, cat) =>
    n + scorecard[cat].filter(s => s !== null).length, 0);
  return CATEGORIES.length * NUM_COLUMNS - filled;
}

// Like calculateScore but coerces null (invalid pattern) to 0.
export function scoreCell(cat, dice) {
  return _calculateScore(cat, dice) ?? 0;
}

// Sum of all filled column values for a category (null columns contribute 0).
export function categoryCurrentSum(scorecard, cat) {
  return scorecard[cat].reduce((sum, v) => sum + (v ?? 0), 0);
}

// Number of unfilled (null) columns for a category.
export function columnsUnfilled(scorecard, cat) {
  return scorecard[cat].filter(v => v === null).length;
}

// True if any filled column for the category has value exactly 0.
// For all-columns-filled types (straight, fullHouse) this locks out the big-point bonus.
export function hasLockedFailure(scorecard, cat) {
  return scorecard[cat].some(v => v !== null && v === 0);
}
