/**
 * Achievement evaluators — pure, no React.
 * Feats derive from a single game's final scorecard (+ live featFlags);
 * progression derives from the user's lifetime score rows.
 */

import { CATEGORIES, NUM_COLUMNS } from '../gameConstants.js';
import { calcTotals } from '../scoring.js';
import { FOUR_OAK_VALUE, PROGRESSION } from './definitions.js';
import { weekIndex } from './streaks.js';

/**
 * Evaluate feat badges for one finished game.
 * @param {object} scorecard - { [category]: Array(NUM_COLUMNS) of number|null }
 * @param {object} featFlags - transient live flags raised during play (e.g. one_roll_wonder)
 * @returns {string[]} feat ids earned this game (not yet diffed against prior unlocks)
 */
export function evaluateFeats({ scorecard, featFlags = {} }) {
  const earned = [];
  const { categoryTotals, categoryBigPoints, totalSmall } = calcTotals(scorecard);

  const balutPositive = scorecard.balut.filter(s => s != null && s > 0).length;

  if (balutPositive > 0) earned.push('first_balut');
  if (balutPositive === NUM_COLUMNS) earned.push('balut_hoarder');
  if (featFlags.one_roll_wonder) earned.push('one_roll_wonder');

  if (scorecard.straight.every(s => s === 20)) earned.push('the_long_road');
  if (categoryTotals.choice > 110) earned.push('spoilt_for_choice');

  const fourByFour = ['fours', 'fives', 'sixes'].some(cat =>
    scorecard[cat].every(s => s === FOUR_OAK_VALUE[cat]));
  if (fourByFour) earned.push('four_by_four');

  if (scorecard.fullHouse.some(s => s === 7)) earned.push('the_tent');
  if (scorecard.fullHouse.every(s => s != null && s > 0) && categoryTotals.fullHouse <= 40) {
    earned.push('campsite');
  }

  if (totalSmall >= 500) earned.push('big_roller');

  const allCells = CATEGORIES.flatMap(cat => scorecard[cat]);
  if (allCells.every(s => s != null && s > 0)) earned.push('clean_sheet');

  if (CATEGORIES.every(cat => categoryBigPoints[cat] > 0)) earned.push('the_perfect_game');

  return earned;
}

/**
 * Aggregate lifetime stats from a user's score rows.
 * @param {Array<{ big_points, small_points, balut_count, created_at }>} scores
 */
export function computeStats(scores) {
  let lifetimeBaluts = 0;
  let lifetimeBigPoints = 0;
  const weeks = new Set();

  for (const s of scores) {
    lifetimeBaluts += s.balut_count ?? 0;
    lifetimeBigPoints += s.big_points ?? 0;
    if (s.created_at) weeks.add(weekIndex(new Date(s.created_at)));
  }

  return {
    gamesPlayed: scores.length,
    lifetimeBaluts,
    lifetimeBigPoints,
    weeksActive: weeks.size,
  };
}

/**
 * Map lifetime stats to the highest tier reached per progression badge.
 * @returns {Object<string, number>} { achievementId: tier } — only badges with tier ≥ 1
 */
export function evaluateProgression(stats) {
  const result = {};
  for (const def of PROGRESSION) {
    const value = stats[def.metric] ?? 0;
    let tier = 0;
    for (const t of def.tiers) {
      if (value >= t.threshold) tier = t.tier;
    }
    if (tier > 0) result[def.id] = tier;
  }
  return result;
}

/**
 * The overall collector tier (0..4). A tier counts only when EVERY progression
 * metric meets that tier's threshold. Thresholds are ascending, so the result
 * is the highest fully-satisfied tier (reached tiers are contiguous 1..result).
 */
export function overallTier(stats) {
  let reached = 0;
  for (let t = 1; t <= 4; t++) {
    const allMet = PROGRESSION.every(def => {
      const td = def.tiers.find(x => x.tier === t);
      return td != null && (stats[def.metric] ?? 0) >= td.threshold;
    });
    if (allMet) reached = t;
    else break;
  }
  return reached;
}
