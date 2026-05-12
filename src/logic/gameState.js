import { CATEGORIES, NUM_COLUMNS, NUM_DICE, MAX_ROLLS } from './gameConstants.js';

export function createInitialScorecard() {
  return Object.fromEntries(CATEGORIES.map(cat => [cat, Array(NUM_COLUMNS).fill(null)]));
}

export function createInitialDice() {
  return Array(NUM_DICE).fill(0).map(() => ({ value: 0, held: false }));
}

export function createInitialPlayer(name = 'You') {
  return { name, scorecard: createInitialScorecard() };
}

export function createInitialState() {
  return {
    phase: 'start',          // 'start' | 'setup' | 'playing' | 'gameover'
    players: [createInitialPlayer('You')],
    currentPlayerIndex: 0,
    showHandoff: false,
    dice: createInitialDice(),
    rollsLeft: MAX_ROLLS,
    turnNumber: 1,
    oracleEnabled: window.innerWidth > 800,
    justScoredBalut: false,
    // Pending score: set when player clicks a cell, committed on next Roll.
    // null | { category: string, column: number, score: number }
    pendingScore: null,
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
