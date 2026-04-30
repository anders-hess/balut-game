import { useReducer } from 'react';
import { MAX_ROLLS } from '../logic/gameConstants.js';
import {
  createInitialState,
  rollDice,
  toggleHold,
  resetTurn,
} from '../logic/gameState.js';
import { calculateScore, isGameOver, nextColumn } from '../logic/scoring.js';

function reducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return { ...createInitialState(), phase: 'playing' };

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
      const col = nextColumn(state.scorecard, category);
      if (col === -1) return state;

      const diceValues  = state.dice.map(d => d.value);
      const score       = calculateScore(category, diceValues);
      const finalScore  = score === null ? 0 : score;
      const isBalut     = category === 'balut' && finalScore > 0;

      const newScorecard = {
        ...state.scorecard,
        [category]: state.scorecard[category].map((v, i) => i === col ? finalScore : v),
      };

      return {
        ...state,
        scorecard: newScorecard,
        dice: resetTurn(state.dice),
        rollsLeft: MAX_ROLLS,
        turnNumber: state.turnNumber + 1,
        phase: isGameOver(newScorecard) ? 'gameover' : 'playing',
        justScoredBalut: isBalut,
      };
    }

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
    startGame:     ()             => dispatch({ type: 'START_GAME' }),
    roll:          ()             => dispatch({ type: 'ROLL' }),
    toggleHold:    (index)        => dispatch({ type: 'TOGGLE_HOLD', index }),
    scoreCategory: (category)     => dispatch({ type: 'SCORE', category }),
    toggleOracle:  ()             => dispatch({ type: 'TOGGLE_ORACLE' }),
    applyHold:     (valuesToHold) => dispatch({ type: 'APPLY_HOLD', valuesToHold }),
  };
}
