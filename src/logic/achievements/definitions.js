/**
 * Achievement catalog — pure metadata, no React, no side effects.
 * Trigger logic lives in evaluate.js / streaks.js; this file is the single
 * source of truth for ids, names, descriptions, icons, and tier thresholds
 * (used by both the evaluator and the UI grid).
 */

/** One-time feat badges. Earned from a single game's final scorecard. */
export const FEATS = [
  { id: 'first_balut',       icon: '🎲', name: 'First Balut',       description: 'Score your first Balut.' },
  { id: 'balut_hoarder',     icon: '🧺', name: 'Balut Hoarder',     description: 'Fill all four Balut columns in one game.' },
  { id: 'one_roll_wonder',   icon: '⚡', name: 'One-Roll Wonder',   description: 'Roll a Balut on the very first roll.' },
  { id: 'the_long_road',     icon: '🛤️', name: 'The Long Road',     description: 'Score a big Straight (20) in all four columns.' },
  { id: 'spoilt_for_choice', icon: '🍽️', name: 'Spoilt for Choice', description: 'Finish Choice with a row total over 110.' },
  { id: 'four_by_four',      icon: '🎯', name: 'Four by Four',      description: 'Complete Fours, Fives or Sixes with four-of-a-kind in every column.' },
  { id: 'the_tent',          icon: '⛺', name: 'The Tent',          description: 'Score a Full House of three 1s and two 2s.' },
  { id: 'campsite',          icon: '🏕️', name: 'Campsite',          description: 'Fill all four Full House columns with a row total of 40 or less.' },
  { id: 'big_roller',        icon: '💰', name: 'Big Roller',        description: 'Reach the top small-points bonus tier (500 small points).' },
  { id: 'clean_sheet',       icon: '🧹', name: 'Clean Sheet',       description: 'Finish a game with no scratched (zero) cells.' },
  { id: 'the_perfect_game',  icon: '👑', name: 'The Perfect Game',  description: 'Earn the big-point bonus in all seven categories.' },
];

/**
 * Tiered progression badges. `metric` keys match the object returned by
 * computeStats(). `tiers` are ascending; the highest threshold met is awarded.
 */
export const PROGRESSION = [
  {
    id: 'games_played', icon: '🎮', name: 'Games Played', metric: 'gamesPlayed',
    description: 'Play more games.',
    tiers: [
      { tier: 1, threshold: 10,  label: 'Bronze' },
      { tier: 2, threshold: 50,  label: 'Silver' },
      { tier: 3, threshold: 100, label: 'Gold' },
      { tier: 4, threshold: 500, label: 'Platinum' },
    ],
  },
  {
    id: 'lifetime_baluts', icon: '🎲', name: 'Balut Collector', metric: 'lifetimeBaluts',
    description: 'Score Baluts across all your games.',
    tiers: [
      { tier: 1, threshold: 10,  label: 'Bronze' },
      { tier: 2, threshold: 50,  label: 'Silver' },
      { tier: 3, threshold: 100, label: 'Gold' },
      { tier: 4, threshold: 500, label: 'Platinum' },
    ],
  },
  {
    id: 'lifetime_big_points', icon: '📈', name: 'Big Points', metric: 'lifetimeBigPoints',
    description: 'Accumulate big points across all your games.',
    tiers: [
      { tier: 1, threshold: 100,  label: 'Bronze' },
      { tier: 2, threshold: 500,  label: 'Silver' },
      { tier: 3, threshold: 2000, label: 'Gold' },
    ],
  },
  {
    id: 'weeks_active', icon: '📅', name: 'Regular', metric: 'weeksActive',
    description: 'Play in many different weeks.',
    tiers: [
      { tier: 1, threshold: 4,  label: 'Bronze' },
      { tier: 2, threshold: 12, label: 'Silver' },
      { tier: 3, threshold: 52, label: 'Gold' },
    ],
  },
];

/**
 * Streak & competitive badges. Computed from history (see streaks.js for the
 * weekly streak math; first_blood / top_of_the_week derive from leaderboard
 * presence/rank in the service layer).
 */
export const STREAKS = [
  { id: 'play_streak',        icon: '🔥', name: 'Play Streak',        description: 'Consecutive weeks with at least one game.' },
  {
    id: 'leaderboard_streak', icon: '🏆', name: 'Leaderboard Streak', description: 'Consecutive weeks in the weekly Top 10.',
    tiers: [
      { tier: 1, threshold: 2,  label: 'Bronze' },
      { tier: 2, threshold: 4,  label: 'Silver' },
      { tier: 3, threshold: 8,  label: 'Gold' },
      { tier: 4, threshold: 12, label: 'Platinum' },
    ],
  },
  { id: 'first_blood',        icon: '🩸', name: 'First Blood',        description: 'Reach the weekly Top 10 for the first time.' },
  { id: 'top_of_the_week',    icon: '🥇', name: 'Top of the Week',    description: 'Finish a week ranked #1.' },
];

/** Four-of-a-kind score per number category (used by the `four_by_four` feat). */
export const FOUR_OAK_VALUE = { fours: 16, fives: 20, sixes: 24 };
