import { useState } from 'react';
import './PlayerSetupScreen.css';

export default function PlayerSetupScreen({ onStart, onBack }) {
  const [count, setCount]   = useState(2);
  const [names, setNames]   = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  function handleNameChange(i, value) {
    setNames(prev => prev.map((n, idx) => idx === i ? value : n));
  }

  function handleStart() {
    const trimmed = names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStart(trimmed);
  }

  return (
    <div className="setup-screen">
      <div className="setup-screen__inner">
        <div className="setup-screen__header">
          <button className="setup-screen__back" onClick={onBack}>← Back</button>
          <h1 className="setup-screen__title">Local Multiplayer</h1>
          <div />
        </div>

        <div className="setup-screen__body">
          <p className="setup-screen__label">Number of players</p>
          <div className="setup-screen__count-btns">
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

          <p className="setup-screen__label">Player names</p>
          <div className="setup-screen__names">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="setup-screen__name-row">
                <span className="setup-screen__name-num">{i + 1}</span>
                <input
                  className="setup-screen__name-input"
                  type="text"
                  maxLength={16}
                  placeholder={`Player ${i + 1}`}
                  value={names[i]}
                  onChange={e => handleNameChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button className="setup-screen__start" onClick={handleStart}>
            Start Game →
          </button>
        </div>
      </div>
    </div>
  );
}
