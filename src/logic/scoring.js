import { BIG_POINT_RULES, BONUS_BREAKPOINTS, CATEGORIES, NUM_COLUMNS } from './gameConstants.js';

/**
 * Calculate the small-point score for a given category and dice values.
 * Returns null if the dice don't satisfy the category (for straight/full house),
 * or the numeric score (may be 0 for an intentional zero entry).
 */
export function calculateScore(category, dice) {
  const counts = getCounts(dice);
  const sum = dice.reduce((a, b) => a + b, 0);

  switch (category) {
    case 'fours':
      return dice.filter(d => d === 4).length * 4;

    case 'fives':
      return dice.filter(d => d === 5).length * 5;

    case 'sixes':
      return dice.filter(d => d === 6).length * 6;

    case 'straight': {
      const sorted = [...new Set(dice)].sort((a, b) => a - b);
      const low  = sorted.length === 5 && sorted.join('') === '12345';
      const high = sorted.length === 5 && sorted.join('') === '23456';
      if (low)  return 15;
      if (high) return 20;
      return null; // invalid
    }

    case 'fullHouse': {
      const vals = Object.values(counts);
      if (vals.includes(3) && vals.includes(2)) return sum;
      return null;
    }

    case 'choice':
      return sum;

    case 'balut':
      if (Object.values(counts).includes(5)) return sum + 20;
      return null;

    default:
      return null;
  }
}

/** Returns true if the dice satisfy the scoring requirement for a category. */
export function isValidScore(category, dice) {
  return calculateScore(category, dice) !== null;
}

/** Count occurrences of each die face. */
export function getCounts(dice) {
  return dice.reduce((acc, d) => {
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Calculate big points earned for a single category given its column scores.
 * columnScores: array of (number | null) length NUM_COLUMNS
 */
export function calcCategoryBigPoints(category, columnScores) {
  const rule = BIG_POINT_RULES[category];
  const filled = columnScores.filter(s => s !== null && s > 0);

  if (rule.type === 'sum') {
    const total = columnScores.reduce((a, s) => a + (s ?? 0), 0);
    return total >= rule.threshold ? rule.points : 0;
  }

  if (rule.type === 'filled') {
    return filled.length === NUM_COLUMNS ? rule.points : 0;
  }

  if (rule.type === 'perBalut') {
    return filled.length * rule.points;
  }

  return 0;
}

/**
 * Calculate the small-point bonus based on total small points.
 */
export function calcBonus(totalSmall) {
  if (totalSmall >= 450) {
    return 2 + Math.floor((totalSmall - 450) / 50);
  }
  for (const bp of BONUS_BREAKPOINTS) {
    if (totalSmall >= bp.min && totalSmall <= bp.max) return bp.bonus;
  }
  return -2;
}

/**
 * Calculate all totals from the scorecard state.
 * scorecard: { [category]: Array(NUM_COLUMNS) of (number | null) }
 */
export function calcTotals(scorecard) {
  let totalSmall = 0;
  let totalBig = 0;
  const categoryBigPoints = {};
  const categoryTotals = {};

  for (const cat of CATEGORIES) {
    const cols = scorecard[cat];
    const catTotal = cols.reduce((a, s) => a + (s ?? 0), 0);
    totalSmall += catTotal;
    categoryTotals[cat] = catTotal;

    const bigPts = calcCategoryBigPoints(cat, cols);
    categoryBigPoints[cat] = bigPts;
    totalBig += bigPts;
  }

  const bonus = calcBonus(totalSmall);
  totalBig += bonus;

  return { totalSmall, totalBig, bonus, categoryBigPoints, categoryTotals };
}

/** Count how many Baluts have been scored. */
export function countBaluts(scorecard) {
  return scorecard.balut.filter(s => s !== null && s > 0).length;
}

/** Check if the game is over (all cells filled). */
export function isGameOver(scorecard) {
  return CATEGORIES.every(cat => scorecard[cat].every(s => s !== null));
}

/** Return the next unfilled column index for a category, or -1 if full. */
export function nextColumn(scorecard, category) {
  return scorecard[category].findIndex(s => s === null);
}
