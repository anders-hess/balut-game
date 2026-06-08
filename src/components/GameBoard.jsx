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
  authUser = null, authUsername = null,
  isOnlineGame = false, onlineGame = null,
}) {
  const { dice, rollsLeft, oracleEnabled, players, currentPlayerIndex, phase, turnNumber, justScoredBalut, showHandoff, pendingScore } = state;
  const isMultiplayer = players.length > 1;
  const isGameOver    = phase === 'gameover';
  const hasRolled     = rollsLeft < 3;
  const allRolled     = dice.every(d => d.value > 0);

  // Online-specific derived values
  const isOnline  = !!isOnlineGame;
  const myTurn    = !isOnline || !!onlineGame?.isMyTurn;
  const myIdx     = isOnline ? (onlineGame?.myPlayerIndex ?? null) : currentPlayerIndex;

  const currentPlayer = players[currentPlayerIndex];

  const playerTurn = CATEGORIES.reduce((n, cat) => n + currentPlayer.scorecard[cat].filter(s => s !== null).length, 0) + 1;

  const [oracleOn, setOracleOn] = useState(true);

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
    oracleOn,
    onPowerToggle: () => setOracleOn(o => !o),
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
              <MultiplayerStandings
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                onlinePlayers={isOnline ? onlineGame?.onlinePlayers : null}
              />
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
                onPlayAgain={isOnline ? onlineGame?.playAgain : onNewGame}
                onViewHighscores={onViewHighscores}
                onScoreSubmitted={() => setHsRefresh(n => n + 1)}
                submittedNames={mpSubmittedNames}
                onMpPlayerSubmitted={onMpPlayerSubmitted}
                isOnline={isOnline}
                isHost={isOnline ? !!onlineGame?.isHost : true}
                myPlayerIndex={isOnline ? onlineGame?.myPlayerIndex : null}
                authUser={authUser}
                authUsername={authUsername}
              />
            ) : (
              <GameOverScreen
                scorecard={currentPlayer.scorecard}
                onPlayAgain={onNewGame}
                onViewHighscores={onViewHighscores}
                onScoreSubmitted={() => { setHsRefresh(n => n + 1); onScoreSubmitted?.(); }}
                scoreSubmitted={scoreSubmitted}
                authUser={authUser}
                authUsername={authUsername}
              />
            )
          ) : (isMultiplayer && showHandoff) ? (() => {
            const handoffTarget = pendingScore?.nextPlayerIdx ?? currentPlayerIndex;
            const isMyHandoff   = !isOnline || myIdx === handoffTarget;
            const canCancel     = !isOnline || myIdx === currentPlayerIndex;
            return (
              <section className="dice-area dice-area--handoff">
                {isOnline ? (
                  isMyHandoff ? (
                    <>
                      <p className="handoff-inline__sub">It's your turn,</p>
                      <p className="handoff-inline__name">{handoffName}</p>
                      <button className="handoff-inline__btn" onClick={onDismissHandoff}>
                        Start my turn →
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="handoff-inline__sub">Waiting for</p>
                      <p className="handoff-inline__name">{handoffName}</p>
                      <p className="handoff-inline__waiting">to start their turn…</p>
                    </>
                  )
                ) : (
                  <>
                    <p className="handoff-inline__sub">Pass the device to</p>
                    <p className="handoff-inline__name">{handoffName}</p>
                    <button className="handoff-inline__btn" onClick={onDismissHandoff}>
                      Start {handoffName}'s Turn →
                    </button>
                  </>
                )}
                {pendingScore && canCancel && (
                  <button className="handoff-inline__cancel" onClick={onCancelPending}>
                    ← Cancel score
                  </button>
                )}
              </section>
            );
          })() : (
            <DiceArea
              dice={dice}
              rollsLeft={rollsLeft}
              onRoll={onRoll}
              onToggleHold={onToggleHold}
              turnNumber={playerTurn}
              totalTurns={TOTAL_TURNS}
              disabled={isOnline && !myTurn}
              waitingFor={isOnline && !myTurn ? currentPlayer.name : null}
            />
          )}

          {/* Oracle — in left column when ON */}
          {!isGameOver && oracleOn && <TheOracle {...oracleProps} />}

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
            onScore={viewingOwnTurn && !isGameOver && myTurn ? onScore : null}
            playerName={isMultiplayer ? players[displayIdx].name : null}
            pendingScore={viewingOwnTurn ? pendingScore : null}
            showAvailability={viewingOwnTurn && myTurn && !isGameOver}
          />
          {/* Oracle — below scorecard when OFF */}
          {!isGameOver && !oracleOn && <TheOracle {...oracleProps} />}
          <HighscoresCard
            onViewAll={onViewHighscores}
            refreshTrigger={hsRefresh}
          />
        </div>
      </div>
    </div>
  );
}
