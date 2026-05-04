import { useState, useEffect } from 'react';
import { CATEGORIES, CATEGORY_LABELS } from '../logic/gameConstants.js';
import { calcTotals, countBaluts } from '../logic/scoring.js';
import { checkQualifies, submitScore } from '../services/highscores.js';
import './GameOverScreen.css';

const PERIOD_LABELS = { daily: 'Today', monthly: 'This Month', yearly: 'This Year' };
const NAME_KEY = 'balut_player_name';

export default function GameOverScreen({ scorecard, onPlayAgain, onViewHighscores, onScoreSubmitted }) {
  const { totalSmall, totalBig, bonus, categoryBigPoints } = calcTotals(scorecard);
  const balutCount = countBaluts(scorecard);

  const [qualifyingPeriods, setQualifyingPeriods] = useState(null); // null = checking
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [submitState, setSubmitState] = useState('idle'); // 'idle' | 'submitting' | 'done' | 'error'

  // Check qualification on mount
  useEffect(() => {
    checkQualifies(totalBig, totalSmall, balutCount)
      .then(setQualifyingPeriods)
      .catch(() => setQualifyingPeriods([]));
  }, [totalBig, totalSmall, balutCount]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!playerName.trim()) return;
    setSubmitState('submitting');
    try {
      await submitScore(playerName.trim(), totalBig, totalSmall, balutCount);
      localStorage.setItem(NAME_KEY, playerName.trim());
      setSubmitState('done');
      onScoreSubmitted?.();
    } catch {
      setSubmitState('error');
    }
  }

  const qualifies = qualifyingPeriods && qualifyingPeriods.length > 0;

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

      {/* ── Leaderboard section ── */}
      <div className="gameover__leaderboard">
        {qualifyingPeriods === null ? (
          <p className="gameover__hs-checking">Checking leaderboard…</p>
        ) : qualifies && submitState !== 'done' ? (
          <div className="gameover__hs-qualify">
            <p className="gameover__hs-title">🏆 You made the top 10!</p>
            <div className="gameover__hs-badges">
              {qualifyingPeriods.map(p => (
                <span key={p} className="gameover__hs-badge">{PERIOD_LABELS[p]}</span>
              ))}
            </div>
            <form className="gameover__hs-form" onSubmit={handleSubmit}>
              <input
                className="gameover__hs-input"
                type="text"
                placeholder="Your name (max 20 chars)"
                maxLength={20}
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                disabled={submitState === 'submitting'}
                autoFocus
              />
              <button
                className="gameover__hs-submit"
                type="submit"
                disabled={!playerName.trim() || submitState === 'submitting'}
              >
                {submitState === 'submitting' ? 'Submitting…' : 'Submit Score'}
              </button>
            </form>
            {submitState === 'error' && (
              <p className="gameover__hs-error">Submission failed — check your connection.</p>
            )}
          </div>
        ) : submitState === 'done' ? (
          <p className="gameover__hs-done">✓ Score submitted!</p>
        ) : null}

        <button className="gameover__hs-view" onClick={onViewHighscores}>
          View Leaderboard →
        </button>
      </div>

      <button className="gameover__play-again" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
