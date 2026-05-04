import { useState } from 'react';
import DiceArea from './DiceArea.jsx';
import Scorecard from './Scorecard.jsx';
import TheOracle from './TheOracle.jsx';
import GameOverScreen from './GameOverScreen.jsx';
import HighscoresCard from './HighscoresCard.jsx';
import BalutToast from './BalutToast.jsx';
import { CATEGORIES, NUM_COLUMNS } from '../logic/gameConstants.js';
import './GameBoard.css';

const TOTAL_TURNS = CATEGORIES.length * NUM_COLUMNS;

export default function GameBoard({ state, onRoll, onToggleHold, onScore, onToggleOracle, onGoHome, onNewGame, onViewHighscores }) {
  const { dice, rollsLeft, oracleEnabled, scorecard, phase, turnNumber, justScoredBalut } = state;
  const hasRolled  = rollsLeft < 3;
  const allRolled  = dice.every(d => d.value > 0);
  const isGameOver = phase === 'gameover';

  // Increment to trigger HighscoresCard refresh after a score is submitted
  const [hsRefresh, setHsRefresh] = useState(0);

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
            <GameOverScreen
              scorecard={scorecard}
              onPlayAgain={onNewGame}
              onViewHighscores={onViewHighscores}
              onScoreSubmitted={() => setHsRefresh(n => n + 1)}
            />
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

        {/* ── Right column: Oracle + leaderboard card ── */}
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
          <HighscoresCard
            onViewAll={onViewHighscores}
            refreshTrigger={hsRefresh}
          />
        </div>
      </div>
    </div>
  );
}
