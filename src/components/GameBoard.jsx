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

function Logo() {
  return (
    <div className="board-logo">
      <div className="board-logo__mark">b</div>
      <span className="board-logo__word">balut</span>
    </div>
  );
}

export default function GameBoard({
  state,
  onRoll, onToggleHold, onScore, onToggleOracle,
  onGoHome, onNewGame, onViewHighscores, onDismissHandoff, onCancelPending,
  scoreSubmitted, onScoreSubmitted,
  mpSubmittedNames, onMpPlayerSubmitted,
}) {
  const { dice, rollsLeft, oracleEnabled, players, currentPlayerIndex, phase, turnNumber, justScoredBalut, showHandoff, pendingScore } = state;
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

  // Who the handoff screen addresses — the next player when a score is pending,
  // otherwise the current player (post-roll handoff).
  const handoffName = pendingScore?.nextPlayerIdx != null
    ? players[pendingScore.nextPlayerIdx].name
    : players[currentPlayerIndex].name;

  const oracleProps = {
    dice, rollsLeft,
    scorecard:   currentPlayer.scorecard,
    isOpen:      oracleEnabled,
    hasRolled:   hasRolled && allRolled,
    isGameOver,
    onToggle:    onToggleOracle,
  };

  return (
    <div className="game-board">
      <BalutToast trigger={justScoredBalut} />

      {/* ── Header ─────────────────────────────────────── */}
      <header className="board-header">
        <button className="board-logo-btn" onClick={onGoHome} title="Back to home">
          <Logo />
        </button>
        <div className="board-header__meta">
          {!isGameOver && isMultiplayer && (
            <div className="standings-header-wrap">
              <MultiplayerStandings players={players} currentPlayerIndex={currentPlayerIndex} />
            </div>
          )}
          <button className="btn-back-home" onClick={onGoHome}>
            ← Back to home
          </button>
          <button className="btn-new-game" onClick={onNewGame}>
            New game
          </button>
        </div>
      </header>

      {/* ── Two-column layout ──────────────────────────── */}
      <div className="board-layout">
        {/* Left: dice + oracle + player tabs */}
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
              <p className="handoff-inline__name">{handoffName}</p>
              <button className="handoff-inline__btn" onClick={onDismissHandoff}>
                Start {handoffName}'s Turn →
              </button>
              {pendingScore && (
                <button className="handoff-inline__cancel" onClick={onCancelPending}>
                  ← Cancel score
                </button>
              )}
            </section>
          ) : (
            <DiceArea
              dice={dice}
              rollsLeft={rollsLeft}
              onRoll={onRoll}
              onToggleHold={onToggleHold}
              turnNumber={turnNumber}
              totalTurns={TOTAL_TURNS}
            />
          )}

          {/* Oracle — always in left column */}
          {!isGameOver && <TheOracle {...oracleProps} />}

          {/* Player tabs (multiplayer) */}
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
                    {calcTotals(p.scorecard).totalBig} pts
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: standings (mobile only) + scorecard + highscores card */}
        <div className="board-right">
          <Scorecard
            scorecard={players[displayIdx].scorecard}
            dice={dice}
            rollsLeft={rollsLeft}
            onScore={viewingOwnTurn && !isGameOver ? onScore : null}
            playerName={isMultiplayer ? players[displayIdx].name : null}
            pendingScore={viewingOwnTurn ? pendingScore : null}
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
