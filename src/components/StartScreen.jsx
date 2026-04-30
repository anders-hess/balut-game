import './StartScreen.css';

export default function StartScreen({ onStart }) {
  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="start-title">BALUT</h1>
        <p className="start-subtitle">The Danish Dice Game</p>

        <div className="start-modes">
          <button className="mode-btn mode-btn--primary" onClick={onStart}>
            Single Player
          </button>

          <button className="mode-btn mode-btn--disabled" disabled>
            Local Multiplayer
            <span className="coming-soon">Coming Soon</span>
          </button>

          <button className="mode-btn mode-btn--disabled" disabled>
            Online Multiplayer
            <span className="coming-soon">Coming Soon</span>
          </button>
        </div>
      </div>
    </div>
  );
}
