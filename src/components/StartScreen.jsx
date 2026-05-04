import './StartScreen.css';

export default function StartScreen({ onStart, onMultiplayer, onHighscores }) {
  return (
    <div className="start-screen">
      {/* Title lives on the felt — no card width constraint */}
      <div className="start-hero">
        <h1 className="start-title">BALUT</h1>
        <p className="start-subtitle">The Classic Dice Game</p>
      </div>

      {/* Narrow card only holds the mode buttons */}
      <div className="start-card">
        <div className="start-modes">
          <button className="mode-btn mode-btn--primary" onClick={onStart}>
            Single Player
          </button>

          <button className="mode-btn mode-btn--primary" onClick={onMultiplayer}>
            Local Multiplayer
          </button>

          <button className="mode-btn mode-btn--disabled" disabled>
            Online Multiplayer
            <span className="coming-soon">Coming Soon</span>
          </button>

          <button className="mode-btn mode-btn--secondary" onClick={onHighscores}>
            🏆 Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
