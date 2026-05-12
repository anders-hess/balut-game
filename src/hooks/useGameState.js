import { useReducer } from 'react';
import { MAX_ROLLS, CATEGORIES } from '../logic/gameConstants.js';
import {
  createInitialState,
  createInitialPlayer,
  rollDice,
  toggleHold,
  resetTurn,
} from '../logic/gameState.js';
import { calculateScore, isGameOver, getTargetColumn } from '../logic/scoring.js';

// ─── Commit a score to the scorecard and rotate the turn ─────────────────────
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
      // Commit a pending score and start the new turn.
      if (state.pendingScore) {
        const { category, column, score } = state.pendingScore;
        const committed = applyScore(state, category, column, score);

        // Gameover or multiplayer handoff — caller handles next step.
        if (committed.phase === 'gameover' || committed.showHandoff) return committed;

        // Single player: also perform the first roll of the new turn.
        return {
          ...committed,
          dice:      rollDice(committed.dice),
          rollsLeft: committed.rollsLeft - 1,
        };
      }

      // Normal roll.
      if (state.rollsLeft === 0) return state;
      return {
        ...state,
        dice:            rollDice(state.dice),
        rollsLeft:       state.rollsLeft - 1,
        justScoredBalut: false,
      };
    }

    case 'TOGGLE_HOLD': {
      if (state.pendingScore) return state;   // no holds while score is pending
      if (state.rollsLeft === MAX_ROLLS) return state;
      if (state.rollsLeft === 0) return state;
      return { ...state, dice: toggleHold(state.dice, action.index) };
    }

    case 'PENDING_SCORE': {
      // Player clicked a scorecard cell.
      //
      // First click  → dice clear, rollsLeft resets, pendingScore set.
      // Second click on a *different* cell → pendingScore moves there.
      // Click on the *same* pending cell → cancel; dice restored to original
      //   values and rollsLeft returns to 0 so the player can choose again.
      const { category } = action;
      const currentPlayer = state.players[state.currentPlayerIndex];

      if (state.pendingScore) {
        // Already pending — use the stored originalDice for all computation.
        const origDice = state.pendingScore.originalDice;
        const rawScore = calculateScore(category, origDice);
        const finalScore = rawScore === null ? 0 : rawScore;
        const col = getTargetColumn(currentPlayer.scorecard, category, finalScore);

        // Cancel: clicked the pending cell again.
        if (
          state.pendingScore.category === category &&
          state.pendingScore.column   === col
        ) {
          return {
            ...state,
            pendingScore: null,
            // Restore original dice (unheld) so the player can see & re-choose.
            dice:      origDice.map(v => ({ value: v, held: false })),
            rollsLeft: 0,   // all rolls consumed — must score, can't re-roll
          };
        }

        // Move: valid cell for the original dice.
        if (col === -1) return state;
        return {
          ...state,
          pendingScore: { ...state.pendingScore, category, column: col, score: finalScore },
        };
      }

      // First click — record original dice, clear them, reset roll counter.
      const diceValues = state.dice.map(d => d.value);
      const rawScore   = calculateScore(category, diceValues);
      const finalScore = rawScore === null ? 0 : rawScore;
      const col        = getTargetColumn(currentPlayer.scorecard, category, finalScore);
      if (col === -1) return state;

      // Last turn: only one unfilled cell exists — lock immediately, no pending state.
      const unfilledCount = CATEGORIES.reduce(
        (n, cat) => n + currentPlayer.scorecard[cat].filter(s => s === null).length, 0
      );
      if (unfilledCount === 1) {
        return applyScore(state, category, col, finalScore);
      }

      return {
        ...state,
        pendingScore: { category, column: col, score: finalScore, originalDice: diceValues },
        dice:         resetTurn(state.dice),   // clear: values → 0, all unheld
        rollsLeft:    MAX_ROLLS,               // "Roll Dice" becomes available
      };
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
