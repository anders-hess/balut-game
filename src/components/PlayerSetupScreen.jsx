import { useState } from 'react';
import './PlayerSetupScreen.css';

function Logo({ size = 36, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.27,
        background: 'var(--color-accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontWeight: 500, fontSize: size * 0.62,
      }}>b</div>
      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: size * 0.62, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>balut</span>
    </div>
  );
}

export default function PlayerSetupScreen({ onStart, onBack }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  function handleNameChange(i, value) {
    setNames(prev => prev.map((n, idx) => idx === i ? value : n));
  }

  function handleStart() {
    const trimmed = names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStart(trimmed);
  }

  return (
    <div className="setup-screen">
      {/* Marketing header */}
      <header className="setup-screen__marketing-header">
        <Logo size={36} onClick={onBack} />
        <button className="setup-screen__cancel" onClick={onBack}>Cancel</button>
      </header>

      <main className="setup-screen__main">
        {/* Left: hero copy */}
        <div className="setup-screen__hero">
          <div className="setup-screen__kicker">Local multiplayer</div>
          <h1 className="setup-screen__headline">
            Who's<br />playing<br />tonight?
          </h1>
          <p className="setup-screen__desc">
            Pass the device between turns. Each player keeps their own scorecard.
          </p>
        </div>

        {/* Right: form card */}
        <div className="setup-screen__card">
          {/* Player count */}
          <div>
            <p className="setup-screen__label">Players</p>
            <div className="setup-screen__count-btns" style={{ marginTop: 10 }}>
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`setup-screen__count-btn ${count === n ? 'setup-screen__count-btn--active' : ''}`}
                  onClick={() => setCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Name inputs */}
          <div className="setup-screen__names">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="setup-screen__name-row">
                <span className="setup-screen__name-num">{i + 1}</span>
                <input
                  className="setup-screen__name-input"
                  type="text"
                  maxLength={16}
                  placeholder={`Player ${i + 1} name`}
                  value={names[i]}
                  onChange={e => handleNameChange(i, e.target.value)}
                  autoFocus={i === 0}
                />
                {names[i]?.trim() && (
                  <span style={{ fontSize: 11, color: 'var(--color-ink-mute)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 500 }}>
                    ready
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="setup-screen__divider" />

          <div className="setup-screen__actions">
            <button className="setup-screen__start" onClick={handleStart}>
              Start game →
            </button>
            <button className="setup-screen__back" onClick={onBack}>Back</button>
          </div>
        </div>
      </main>
    </div>
  );
}
