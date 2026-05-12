import { useReducer } from 'react';
import { MAX_ROLLS } from '../logic/gameConstants.js';
import {
  createInitialState,
  createInitialPlayer,
  rollDice,
  toggleHold,
  resetTurn,
} from '../logic/gameState.js';
import { calculateScore, isGameOver, getTargetColumn } from '../logic/scoring.js';

// ─── Shared: commit a pending or immediate score to scorecard ─────────────────
// Returns the full next state after applying the score, including turn rotation.
// Used by both PENDING_SCORE (immediate) and ROLL (deferred commit).
function applyScore(state, category, column, finalScore) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isBalut = category === 'balut' && finalScore > 0;

  const newScorecard = {
    ...currentPlayer.scorecard,
    [category]: currentPlayer.scorecard[category].map((v, i) => i === column ? finalScore : v),
  };

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, scorecard: newScorecard } : p
  );

  const allDone = newPlayers.every(p => isGameOver(p.scorecard));

  if (allDone) {
    return {
      ...state,
      players:         newPlayers,
      dice:            resetTurn(state.dice),
      rollsLeft:       MAX_ROLLS,
      turnNumber:      state.turnNumber + 1,
      phase:           'gameover',
      justScoredBalut: isBalut,
      showHandoff:     false,
      pendingScore:    null,
    };
  }

  let nextIdx = state.currentPlayerIndex;
  for (let i = 1; i <= state.players.length; i++) {
    const idx = (state.currentPlayerIndex + i) % state.players.length;
    if (!isGameOver(newPlayers[idx].scorecard)) { nextIdx = idx; break; }
  }

  return {
    ...state,
    players:            newPlayers,
    currentPlayerIndex: nextIdx,
    dice:               resetTurn(state.dice),
    rollsLeft:          MAX_ROLLS,
    turnNumber:         state.turnNumber + 1,
    phase:              'playing',
    justScoredBalut:    isBalut,
    showHandoff:        state.players.length > 1,
    pendingScore:       null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return { ...createInitialState(), phase: 'playing' };

    case 'SETUP_MULTIPLAYER': {
      const { names } = action;
      return {
        ...createInitialState(),
        phase:   'playing',
        players: names.map(name => createInitialPlayer(name)),
      };
    }

    case 'ROLL': {
      // If a pending score exists: commit it (like the old SCORE action) and start new turn.
      if (state.pendingScore) {
        const { category, column, score } = state.pendingScore;
        return applyScore(state, category, column, score);
      }
      // Normal roll
      if (state.rollsLeft === 0) return state;
      return {
        ...state,
        dice:            rollDice(state.dice),
        rollsLeft:       state.rollsLeft - 1,
        justScoredBalut: false,
      };
    }

    case 'TOGGLE_HOLD': {
      // Holding is meaningless while a pending score is being adjusted.
      if (state.pendingScore) return state;
      if (state.rollsLeft === MAX_ROLLS) return state;
      if (state.rollsLeft === 0) return state;
      return { ...state, dice: toggleHold(state.dice, action.index) };
    }

    case 'PENDING_SCORE': {
      // Player clicked a scorecard cell. If it matches the current pending cell,
      // cancel it (player changed their mind). Otherwise set/move the pending score.
      const { category } = action;
      const currentPlayer = state.players[state.currentPlayerIndex];

      const diceValues = state.dice.map(d => d.value);
      const rawScore   = calculateScore(category, diceValues);
      const finalScore = rawScore === null ? 0 : rawScore;
      const col        = getTargetColumn(currentPlayer.scorecard, category, finalScore);
      if (col === -1) return state;

      // Toggle off if clicking the already-pending cell
      if (
        state.pendingScore &&
        state.pendingScore.category === category &&
        state.pendingScore.column   === col
      ) {
        return { ...state, pendingScore: null };
      }

      return { ...state, pendingScore: { category, column: col, score: finalScore } };
    }

    case 'DISMISS_HANDOFF':
      return { ...state, showHandoff: false, justScoredBalut: false };

    case 'GO_HOME':
      return createInitialState();

    case 'TOGGLE_ORACLE':
      return { ...state, oracleEnabled: !state.oracleEnabled };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, createInitialState());

  return {
    state,
    startGame:        ()         => dispatch({ type: 'START_GAME' }),
    setupMultiplayer: (names)    => dispatch({ type: 'SETUP_MULTIPLAYER', names }),
    dismissHandoff:   ()         => dispatch({ type: 'DISMISS_HANDOFF' }),
    goHome:           ()         => dispatch({ type: 'GO_HOME' }),
    roll:             ()         => dispatch({ type: 'ROLL' }),
    toggleHold:       (index)    => dispatch({ type: 'TOGGLE_HOLD', index }),
    scoreCategory:    (category) => dispatch({ type: 'PENDING_SCORE', category }),
    toggleOracle:     ()         => dispatch({ type: 'TOGGLE_ORACLE' }),
  };
}
