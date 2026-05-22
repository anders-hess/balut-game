import { useState, useEffect } from 'react';
import './OnlineLobbyScreen.css';

// ── Shared Logo ───────────────────────────────────────────────────────────────
function Logo({ size = 36 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.27,
        background: 'var(--color-accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontWeight: 500, fontSize: size * 0.62,
      }}>b</div>
      <span style={{
        fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: size * 0.62,
        color: 'var(--color-ink)', letterSpacing: '-0.3px',
      }}>balut</span>
    </div>
  );
}

// ── Presence dot ─────────────────────────────────────────────────────────────
function PresenceDot({ online }) {
  return (
    <span
      className={`lobby-dot ${online ? 'lobby-dot--on' : 'lobby-dot--off'}`}
      aria-hidden="true"
    />
  );
}

// ── Player list ───────────────────────────────────────────────────────────────
function PlayerList({ onlinePlayers, myPlayerIndex }) {
  return (
    <ul className="lobby-player-list">
      {onlinePlayers.map((p, i) => (
        <li key={i} className="lobby-player-row">
          <PresenceDot online={p.isOnline} />
          <span className="lobby-player-name">
            {p.name}
            {p.playerIndex === myPlayerIndex && (
              <span className="lobby-player-you"> — you</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Spinner screen (creating / joining) ───────────────────────────────────────
function SpinnerScreen({ message, onCancel }) {
  return (
    <div className="lobby-screen">
      <header className="lobby-screen__header">
        <Logo />
        <button className="lobby-screen__cancel" onClick={onCancel}>Cancel</button>
      </header>
      <main className="lobby-screen__main lobby-screen__main--centered">
        <div className="lobby-spinner" aria-label="Loading" />
        <p className="lobby-spinner-msg">{message}</p>
      </main>
    </div>
  );
}

// ── Waiting room (lobby-host / lobby-guest) ───────────────────────────────────
function WaitingRoom({ isHost, roomCode, onlinePlayers, myPlayerIndex, onStartGame, onLeave }) {
  const [copied, setCopied] = useState(false);
  const canStart = isHost && onlinePlayers.length >= 2;

  function handleCopy() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="lobby-screen">
      <header className="lobby-screen__header">
        <Logo />
        <button className="lobby-screen__cancel" onClick={onLeave}>Leave</button>
      </header>

      <main className="lobby-screen__main">
        <div className="lobby-screen__hero">
          <div className="lobby-screen__kicker">Online multiplayer</div>
          <h1 className="lobby-screen__headline">
            {isHost ? (
              <>Waiting for<br />your friends…</>
            ) : (
              <>Waiting for<br />host to start…</>
            )}
          </h1>
          <p className="lobby-screen__desc">
            {isHost
              ? 'Share the room code below. Up to 4 players can join.'
              : 'The host will start the game when everyone is ready.'}
          </p>
        </div>

        <div className="lobby-screen__card">
          {isHost && (
            <div className="lobby-code-block">
              <p className="lobby-screen__label">Room code</p>
              <div className="lobby-code-display">{roomCode}</div>
              <button className="lobby-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>
          )}

          <div>
            <p className="lobby-screen__label">
              Players ({onlinePlayers.length} / 4)
            </p>
            <PlayerList onlinePlayers={onlinePlayers} myPlayerIndex={myPlayerIndex} />
          </div>

          {isHost ? (
            <button
              className="lobby-btn-primary"
              onClick={onStartGame}
              disabled={!canStart}
            >
              {canStart ? 'Start game →' : 'Waiting for players…'}
            </button>
          ) : (
            <p className="lobby-waiting-msg">Waiting for the host to start…</p>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OnlineLobbyScreen({ onBack, onGameStart, onlineGameHook }) {
  const {
    connectionPhase, roomCode, myPlayerIndex,
    onlinePlayers, errorMessage,
    createRoom, joinRoom, startGame, leaveRoom,
  } = onlineGameHook;

  const [name, setName] = useState(() => localStorage.getItem('balut_player_name') || '');
  const [view, setView] = useState('choose');       // 'choose' | 'joining'
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Persist name preference
  useEffect(() => {
    if (name.trim()) localStorage.setItem('balut_player_name', name.trim());
  }, [name]);

  // Transition to GameBoard when game starts
  useEffect(() => {
    if (connectionPhase === 'playing') onGameStart();
  }, [connectionPhase, onGameStart]);

  function handleBack() {
    leaveRoom();
    onBack();
  }

  async function handleCreate() {
    const trimmed = name.trim() || 'Player 1';
    await createRoom(trimmed);
  }

  async function handleJoin() {
    if (joinCode.length < 6 || isJoining) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await joinRoom(joinCode, name.trim() || 'Player 1');
    } catch (err) {
      const msgs = {
        NOT_FOUND:       'Room not found. Check the code and try again.',
        FULL:            'That room is full (4 players max).',
        ALREADY_STARTED: 'That game has already started.',
      };
      setJoinError(msgs[err?.code] || 'Could not join. Please try again.');
      setIsJoining(false);
    }
  }

  function handleJoinCodeChange(e) {
    // Allow only the room code alphabet characters
    const val = e.target.value.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '');
    setJoinCode(val);
    setJoinError(null);
  }

  // ── Delegate to sub-views ────────────────────────────────────────────────

  if (connectionPhase === 'creating' || connectionPhase === 'joining') {
    return (
      <SpinnerScreen
        message={connectionPhase === 'creating' ? 'Creating room…' : 'Joining room…'}
        onCancel={handleBack}
      />
    );
  }

  if (connectionPhase === 'lobby-host' || connectionPhase === 'lobby-guest') {
    return (
      <WaitingRoom
        isHost={connectionPhase === 'lobby-host'}
        roomCode={roomCode}
        onlinePlayers={onlinePlayers}
        myPlayerIndex={myPlayerIndex}
        onStartGame={startGame}
        onLeave={handleBack}
      />
    );
  }

  if (connectionPhase === 'error') {
    return (
      <div className="lobby-screen">
        <header className="lobby-screen__header">
          <Logo />
          <button className="lobby-screen__cancel" onClick={handleBack}>Cancel</button>
        </header>
        <main className="lobby-screen__main lobby-screen__main--centered">
          <p className="lobby-error-msg">{errorMessage}</p>
          <button className="lobby-btn-secondary" onClick={handleBack}>
            ← Back to home
          </button>
        </main>
      </div>
    );
  }

  // ── Choose / join view ('idle') ──────────────────────────────────────────
  const nameFilled = name.trim().length > 0;

  return (
    <div className="lobby-screen">
      <header className="lobby-screen__header">
        <Logo />
        <button className="lobby-screen__cancel" onClick={handleBack}>Cancel</button>
      </header>

      <main className="lobby-screen__main">
        <div className="lobby-screen__hero">
          <div className="lobby-screen__kicker">Online multiplayer</div>
          <h1 className="lobby-screen__headline">
            Play with<br />friends<br />anywhere.
          </h1>
          <p className="lobby-screen__desc">
            Share a 6-letter room code and take turns from any device.
          </p>
        </div>

        <div className="lobby-screen__card">
          {/* Name input */}
          <div>
            <p className="lobby-screen__label">Your name</p>
            <input
              className="lobby-name-input"
              type="text"
              maxLength={16}
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="lobby-divider" />

          {view === 'choose' ? (
            <>
              <button
                className="lobby-btn-primary"
                onClick={handleCreate}
                disabled={!nameFilled}
              >
                Create game →
              </button>
              <button
                className="lobby-btn-secondary"
                onClick={() => setView('joining')}
                disabled={!nameFilled}
              >
                Join game
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="lobby-screen__label">Room code</p>
                <input
                  className="lobby-code-input"
                  type="text"
                  maxLength={6}
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={handleJoinCodeChange}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  autoFocus
                  spellCheck={false}
                />
                {joinError && <p className="lobby-join-error">{joinError}</p>}
              </div>
              <button
                className="lobby-btn-primary"
                onClick={handleJoin}
                disabled={joinCode.length < 6 || isJoining}
              >
                {isJoining ? 'Joining…' : 'Join game →'}
              </button>
              <button
                className="lobby-btn-secondary"
                onClick={() => { setView('choose'); setJoinCode(''); setJoinError(null); }}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
