import { CATEGORIES, CATEGORY_LABELS } from '../logic/gameConstants.js';
import { calcTotals, countBaluts } from '../logic/scoring.js';
import './GameOverScreen.css';

export default function GameOverScreen({ scorecard, onPlayAgain }) {
  const { totalSmall, totalBig, bonus, categoryBigPoints } = calcTotals(scorecard);
  const balutCount = countBaluts(scorecard);

  return (
    <div className="gameover">
      <div className="gameover__top">
        <p className="gameover__label">Game Over</p>
        <div className="gameover__grand">
          <span className="gameover__grand-value">{totalBig}</span>
          <span className="gameover__grand-unit">big points</span>
        </div>
      </div>

      <div className="gameover__stats">
        <div className="gameover__stat">
          <span className="gameover__stat-label">Small Points</span>
          <span className="gameover__stat-value">{totalSmall}</span>
        </div>
        <div className="gameover__stat">
          <span className="gameover__stat-label">Baluts Scored</span>
          <span className="gameover__stat-value">{balutCount}</span>
        </div>
        <div className="gameover__stat">
          <span className="gameover__stat-label">Bonus</span>
          <span className={`gameover__stat-value ${bonus < 0 ? 'gameover__stat-value--neg' : ''}`}>
            {bonus >= 0 ? `+${bonus}` : bonus}
          </span>
        </div>
      </div>

      <div className="gameover__breakdown">
        <p className="gameover__breakdown-title">Big Points Breakdown</p>
        <ul className="gameover__breakdown-list">
          {CATEGORIES.map(cat => {
            const pts = categoryBigPoints[cat];
            return (
              <li key={cat} className={`gameover__brow ${pts > 0 ? 'gameover__brow--earned' : 'gameover__brow--missed'}`}>
                <span className="gameover__brow-name">{CATEGORY_LABELS[cat]}</span>
                <span className="gameover__brow-pts">{pts > 0 ? `+${pts}` : '0'}</span>
              </li>
            );
          })}
          <li className={`gameover__brow gameover__brow--bonus ${bonus >= 0 ? 'gameover__brow--earned' : 'gameover__brow--missed'}`}>
            <span className="gameover__brow-name">Bonus</span>
            <span className="gameover__brow-pts">{bonus >= 0 ? `+${bonus}` : bonus}</span>
          </li>
        </ul>
      </div>

      <button className="gameover__play-again" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
