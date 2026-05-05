import { useState, useEffect } from 'react';
import DiceArea from './DiceArea.jsx';
import Scorecard from './Scorecard.jsx';
import TheOracle from './TheOracle.jsx';
import GameOverScreen from './GameOverScreen.jsx';
import MultiplayerGameOverScreen from './MultiplayerGameOverScreen.jsx';
import MultiplayerStandings from './MultiplayerStandings.jsx';
import HighscoresCard from './HighscoresCard.jsx';
import BalutToast from './BalutToast.jsx';
import { CATEGORIES, NUM_COLUMNS } from '../logic/gameConstants.js';
import { calcTotals } from '../logic/scoring.js';
import './GameBoard.css';

const TOTAL_TURNS = CATEGORIES.length * NUM_COLUMNS;

export default function GameBoard({
  state,
  onRoll, onToggleHold, onScore, onToggleOracle,
  onGoHome, onNewGame, onViewHighscores, onDismissHandoff,
  scoreSubmitted, onScoreSubmitted,
  mpSubmittedNames, onMpPlayerSubmitted,
}) {
  const { dice, rollsLeft, oracleEnabled, players, currentPlayerIndex, phase, turnNumber, justScoredBalut, showHandoff } = state;
  const isMultiplayer = players.length > 1;
  const isGameOver    = phase === 'gameover';
  const hasRolled     = rollsLeft < 3;
  const allRolled     = dice.every(d => d.value > 0);

  const currentPlayer = players[currentPlayerIndex];

  const [viewingIdx, setViewingIdx] = useState(currentPlayerIndex);
  useEffect(() => { setViewingIdx(currentPlayerIndex); }, [currentPlayerIndex]);

  const displayIdx     = isMultiplayer ? viewingIdx : currentPlayerIndex;
  const viewingOwnTurn = displayIdx === currentPlayerIndex;

  const [hsRefresh, setHsRefresh] = useState(0);

  return (
    <div className="game-board">
      <BalutToast trigger={justScoredBalut} />

      <header className="board-header">
        <button className="board-title" onClick={onGoHome} title="Back to menu">BALUT</button>
        <div className="board-header__meta">
          {!isGameOver && isMultiplayer && (
            <MultiplayerStandings players={players} currentPlayerIndex={currentPlayerIndex} />
          )}
          {!isGameOver && !isMultiplayer && (
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
            isMultiplayer ? (
              <MultiplayerGameOverScreen
                players={players}
                onPlayAgain={onNewGame}
                onViewHighscores={onViewHighscores}
                onScoreSubmitted={() => setHsRefresh(n => n + 1)}
                submittedNames={mpSubmittedNames}
                onMpPlayerSubmitted={onMpPlayerSubmitted}
              />
            ) : (
              <GameOverScreen
                scorecard={currentPlayer.scorecard}
                onPlayAgain={onNewGame}
                onViewHighscores={onViewHighscores}
                onScoreSubmitted={() => { setHsRefresh(n => n + 1); onScoreSubmitted?.(); }}
                scoreSubmitted={scoreSubmitted}
              />
            )
          ) : (isMultiplayer && showHandoff) ? (
            <section className="dice-area dice-area--handoff">
              <p className="handoff-inline__sub">Pass the device to</p>
              <p className="handoff-inline__name">{players[currentPlayerIndex].name}</p>
              <button className="handoff-inline__btn" onClick={onDismissHandoff}>
                🎲 Start {players[currentPlayerIndex].name}'s Turn
              </button>
            </section>
          ) : (
            <DiceArea
              dice={dice}
              rollsLeft={rollsLeft}
              onRoll={onRoll}
              onToggleHold={onToggleHold}
            />
          )}

          {/* Player tabs (multiplayer only) */}
          {isMultiplayer && !isGameOver && (
            <div className="player-tabs">
              {players.map((p, i) => (
                <button
                  key={i}
                  className={[
                    'player-tab',
                    i === currentPlayerIndex ? 'player-tab--active'  : '',
                    i === displayIdx         ? 'player-tab--viewing' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setViewingIdx(i)}
                >
                  {i === currentPlayerIndex ? '🎲 ' : ''}{p.name}
                  <span className="player-tab__pts">
                    {calcTotals(p.scorecard).totalBig} points
                  </span>
                </button>
              ))}
            </div>
          )}

          <Scorecard
            scorecard={players[displayIdx].scorecard}
            dice={dice}
            rollsLeft={rollsLeft}
            onScore={viewingOwnTurn && !isGameOver ? onScore : null}
            playerName={isMultiplayer ? players[displayIdx].name : null}
          />
        </div>

        {/* ── Right column: Oracle + leaderboard card ── */}
        <div className="board-right">
          <TheOracle
            dice={dice}
            rollsLeft={rollsLeft}
            scorecard={currentPlayer.scorecard}
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
