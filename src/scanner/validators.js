import { CATEGORIES } from '../logic/gameConstants.js';
import { calculateScore } from '../logic/scoring.js';

// Precompute the set of legal small-point scores per category by running every
// possible 5-dice roll through the game's OWN scoring function. This keeps the
// scanner's validation exactly in sync with how the game actually scores, so the
// legal sets work out to:
//   fours 0/4/8/12/16/20 · fives 0/5/…/25 · sixes 0/6/…/30
//   straight 0/15/20 · choice 0 or 5–30 · balut 0/25/30/35/40/45/50
//   fullHouse 0 or any achievable 3a+2b sum (7,8,9,11,12,13,…,28; no 10 or 25)
const LEGAL_SCORES = buildLegalScores();

function buildLegalScores() {
  const sets = Object.fromEntries(CATEGORIES.map(c => [c, new Set()]));
  const dice = [0, 0, 0, 0, 0];
  for (dice[0] = 1; dice[0] <= 6; dice[0]++)
    for (dice[1] = 1; dice[1] <= 6; dice[1]++)
      for (dice[2] = 1; dice[2] <= 6; dice[2]++)
        for (dice[3] = 1; dice[3] <= 6; dice[3]++)
          for (dice[4] = 1; dice[4] <= 6; dice[4]++)
            for (const cat of CATEGORIES) {
              const s = calculateScore(cat, dice);
              if (s !== null) sets[cat].add(s);
            }
  return sets;
}

/**
 * A scanned value is invalid (red flag — blocks Confirm) when it can never
 * legally appear in that category. `null` (empty) is not invalid here — it's
 * handled as a soft yellow flag. `0` is always allowed (an intentional zero /
 * scratched cell, which is also what a "-" or "x" resolves to).
 */
export function isInvalid(category, value) {
  if (value === null) return false;
  if (!Number.isInteger(value) || value < 0) return true;
  if (value === 0) return false;
  const legal = LEGAL_SCORES[category];
  return legal ? !legal.has(value) : false;
}
