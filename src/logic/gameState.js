import { CATEGORIES, NUM_COLUMNS, NUM_DICE, MAX_ROLLS } from './gameConstants.js';

export function createInitialScorecard() {
  return Object.fromEntries(CATEGORIES.map(cat => [cat, Array(NUM_COLUMNS).fill(null)]));
}

export function createInitialDice() {
  return Array(NUM_DICE).fill(0).map(() => ({ value: 0, held: false }));
}

export function createInitialState() {
  return {
    phase: 'start',       // 'start' | 'playing' | 'gameover'
    scorecard: createInitialScorecard(),
    dice: createInitialDice(),
    rollsLeft: MAX_ROLLS,
    turnNumber: 1,        // 1-based, max = NUM_COLUMNS * CATEGORIES.length
    oracleEnabled: true,
    justScoredBalut: false,
  };
}

export function rollDice(dice) {
  return dice.map(die =>
    die.held
      ? die
      : { ...die, value: Math.ceil(Math.random() * 6) }
  );
}

export function toggleHold(dice, index) {
  return dice.map((die, i) =>
    i === index ? { ...die, held: !die.held } : die
  );
}

export function resetTurn(dice) {
  return dice.map(die => ({ ...die, held: false, value: 0 }));
}
