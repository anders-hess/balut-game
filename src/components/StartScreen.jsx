import './StartScreen.css';

export default function StartScreen({ onStart, onMultiplayer, onHighscores, onRules, onOracle }) {
  return (
    <div className="start-screen">
      <div className="start-hero">
        <h1 className="start-title">BALUT</h1>
        <p className="start-subtitle">The Classic Dice Game</p>
      </div>

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

          <div className="start-divider" />

          <button className="mode-btn mode-btn--secondary" onClick={onOracle}>
            ✦ The Oracle
          </button>

          <button className="mode-btn mode-btn--secondary" onClick={onRules}>
            📖 Rules
          </button>

          <button className="mode-btn mode-btn--secondary" onClick={onHighscores}>
            🏆 Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
