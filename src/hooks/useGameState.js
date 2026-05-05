import { useReducer } from 'react';
import { MAX_ROLLS } from '../logic/gameConstants.js';
import {
  createInitialState,
  createInitialPlayer,
  rollDice,
  toggleHold,
  resetTurn,
} from '../logic/gameState.js';
import { calculateScore, isGameOver, nextColumn, getTargetColumn } from '../logic/scoring.js';

function reducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return { ...createInitialState(), phase: 'playing' };

    case 'SETUP_MULTIPLAYER': {
      const { names } = action;
      return {
        ...createInitialState(),
        phase: 'playing',
        players: names.map(name => createInitialPlayer(name)),
      };
    }

    case 'ROLL': {
      if (state.rollsLeft === 0) return state;
      return {
        ...state,
        dice: rollDice(state.dice),
        rollsLeft: state.rollsLeft - 1,
        justScoredBalut: false,
      };
    }

    case 'TOGGLE_HOLD': {
      if (state.rollsLeft === MAX_ROLLS) return state;
      if (state.rollsLeft === 0) return state;
      return { ...state, dice: toggleHold(state.dice, action.index) };
    }

    case 'SCORE': {
      const { category } = action;
      const currentPlayer = state.players[state.currentPlayerIndex];

      const diceValues = state.dice.map(d => d.value);
      const score      = calculateScore(category, diceValues);
      const finalScore = score === null ? 0 : score;
      const col        = getTargetColumn(currentPlayer.scorecard, category, finalScore);
      if (col === -1) return state;
      const isBalut    = category === 'balut' && finalScore > 0;

      const newScorecard = {
        ...currentPlayer.scorecard,
        [category]: currentPlayer.scorecard[category].map((v, i) => i === col ? finalScore : v),
      };

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, scorecard: newScorecard } : p
      );

      const allDone = newPlayers.every(p => isGameOver(p.scorecard));

      if (allDone) {
        return {
          ...state,
          players: newPlayers,
          dice: resetTurn(state.dice),
          rollsLeft: MAX_ROLLS,
          turnNumber: state.turnNumber + 1,
          phase: 'gameover',
          justScoredBalut: isBalut,
          showHandoff: false,
        };
      }

      // Find next player who still has unfilled cells
      let nextIdx = state.currentPlayerIndex;
      for (let i = 1; i <= state.players.length; i++) {
        const idx = (state.currentPlayerIndex + i) % state.players.length;
        if (!isGameOver(newPlayers[idx].scorecard)) {
          nextIdx = idx;
          break;
        }
      }

      return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: nextIdx,
        dice: resetTurn(state.dice),
        rollsLeft: MAX_ROLLS,
        turnNumber: state.turnNumber + 1,
        phase: 'playing',
        justScoredBalut: isBalut,
        showHandoff: state.players.length > 1,
      };
    }

    case 'DISMISS_HANDOFF':
      return { ...state, showHandoff: false, justScoredBalut: false };

    case 'GO_HOME':
      return createInitialState();

    case 'TOGGLE_ORACLE':
      return { ...state, oracleEnabled: !state.oracleEnabled };

    case 'APPLY_HOLD': {
      const remaining = [...action.valuesToHold];
      const newDice = state.dice.map(die => {
        const idx = remaining.indexOf(die.value);
        if (idx !== -1) { remaining.splice(idx, 1); return { ...die, held: true }; }
        return { ...die, held: false };
      });
      return { ...state, dice: newDice };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, createInitialState());

  return {
    state,
    startGame:        ()              => dispatch({ type: 'START_GAME' }),
    setupMultiplayer: (names)         => dispatch({ type: 'SETUP_MULTIPLAYER', names }),
    dismissHandoff:   ()              => dispatch({ type: 'DISMISS_HANDOFF' }),
    goHome:           ()              => dispatch({ type: 'GO_HOME' }),
    roll:             ()              => dispatch({ type: 'ROLL' }),
    toggleHold:       (index)         => dispatch({ type: 'TOGGLE_HOLD', index }),
    scoreCategory:    (category)      => dispatch({ type: 'SCORE', category }),
    toggleOracle:     ()              => dispatch({ type: 'TOGGLE_ORACLE' }),
    applyHold:        (valuesToHold)  => dispatch({ type: 'APPLY_HOLD', valuesToHold }),
  };
}
