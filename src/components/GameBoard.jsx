import DiceArea from './DiceArea.jsx';
import Scorecard from './Scorecard.jsx';
import TheOracle from './TheOracle.jsx';
import GameOverScreen from './GameOverScreen.jsx';
import BalutToast from './BalutToast.jsx';
import { CATEGORIES, NUM_COLUMNS } from '../logic/gameConstants.js';
import './GameBoard.css';

const TOTAL_TURNS = CATEGORIES.length * NUM_COLUMNS;

export default function GameBoard({ state, onRoll, onToggleHold, onScore, onToggleOracle, onGoHome, onNewGame }) {
  const { dice, rollsLeft, oracleEnabled, scorecard, phase, turnNumber, justScoredBalut } = state;
  const hasRolled  = rollsLeft < 3;
  const allRolled  = dice.every(d => d.value > 0);
  const isGameOver = phase === 'gameover';

  return (
    <div className="game-board">
      <BalutToast trigger={justScoredBalut} />

      <header className="board-header">
        <button className="board-title" onClick={onGoHome} title="Back to menu">BALUT</button>
        <div className="board-header__meta">
          {!isGameOver && (
            <span className="turn-counter">
              Turn {Math.min(turnNumber, TOTAL_TURNS)} / {TOTAL_TURNS}
            </span>
          )}
          <button className="btn-new-game" onClick={onNewGame}>New Game</button>
        </div>
      </header>

      <div className="board-layout">
        {/* ── Left column: dice + scorecard ── */}
        <div className="board-left">
          {isGameOver ? (
            <GameOverScreen scorecard={scorecard} onPlayAgain={onNewGame} />
          ) : (
            <DiceArea
              dice={dice}
              rollsLeft={rollsLeft}
              onRoll={onRoll}
              onToggleHold={onToggleHold}
            />
          )}

          <Scorecard
            scorecard={scorecard}
            dice={dice}
            rollsLeft={rollsLeft}
            onScore={onScore}
          />
        </div>

        {/* ── Right column: Oracle (always present) ── */}
        <div className="board-right">
          <TheOracle
            dice={dice}
            rollsLeft={rollsLeft}
            scorecard={scorecard}
            isOpen={oracleEnabled}
            hasRolled={hasRolled && allRolled}
            isGameOver={isGameOver}
            onToggle={onToggleOracle}
          />
        </div>
      </div>
    </div>
  );
}
