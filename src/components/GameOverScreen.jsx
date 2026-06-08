import { useState, useEffect } from 'react';
import { calcTotals, countBaluts } from '../logic/scoring.js';
import { checkQualifies, submitScore } from '../services/highscores.js';
import './GameOverScreen.css';

const PERIOD_LABELS = { weekly: 'This Week', monthly: 'This Month', yearly: 'This Year' };
const NAME_KEY = 'balut_player_name';

export default function GameOverScreen({ scorecard, onPlayAgain, onViewHighscores, onScoreSubmitted, scoreSubmitted, authUser = null, authUsername = null }) {
  const { totalSmall, totalBig, bonus } = calcTotals(scorecard);
  const balutCount = countBaluts(scorecard);

  const bonusText =
    bonus > 0 ? `+${bonus} bonus point${bonus !== 1 ? 's' : ''}`
    : bonus < 0 ? `${bonus} big points`
    : 'no bonus';

  const isLoggedIn = !!authUser;

  const [qualifyingPeriods, setQualifyingPeriods] = useState(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [submitState, setSubmitState] = useState('idle');

  // Guests: check leaderboard qualification for a manual submit form.
  useEffect(() => {
    if (isLoggedIn || scoreSubmitted) return;
    checkQualifies(totalBig, totalSmall, balutCount)
      .then(setQualifyingPeriods)
      .catch(() => setQualifyingPeriods([]));
  }, [totalBig, totalSmall, balutCount, scoreSubmitted, isLoggedIn]);

  // Logged-in: auto-save every game to the profile + leaderboard (no form).
  useEffect(() => {
    if (!isLoggedIn || scoreSubmitted || submitState !== 'idle') return;
    setSubmitState('submitting');
    submitScore(authUsername || 'Player', totalBig, totalSmall, balutCount, { userId: authUser.id })
      .then(() => { setSubmitState('done'); onScoreSubmitted?.(); })
      .catch(() => setSubmitState('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

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
  const alreadyDone = scoreSubmitted || submitState === 'done';

  return (
    <div className="gameover">
      <div>
        <p className="gameover__label">Game complete</p>
        <h1 className="gameover__headline">
          What a quiet,<br />brilliant game.
        </h1>
      </div>

      <div className="gameover__stats">
        <div className="gameover__stat">
          <span className="gameover__stat-label">Grand total</span>
          <span className="gameover__stat-value gameover__stat-value--big">{totalBig}</span>
          <span className="gameover__stat-hint">from {totalSmall} small points</span>
        </div>
        <div className="gameover__stat">
          <span className="gameover__stat-label">Bonus</span>
          <span className="gameover__stat-value" style={{ color: bonus >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
            {bonus >= 0 ? `+${bonus}` : bonus}
          </span>
        </div>
        <div className="gameover__stat">
          <span className="gameover__stat-label">Baluts</span>
          <span className="gameover__stat-value">{balutCount}</span>
          <span className="gameover__stat-hint">× 2 big pts</span>
        </div>
      </div>

      {/* Compact summary bar — mobile only (CSS-gated) */}
      <div className="gameover__bar">
        <div className="gameover__bar-cell">
          <span className="gameover__bar-label">Grand total</span>
          <span className="gameover__bar-value gameover__bar-value--big">{totalBig}</span>
          <span className="gameover__bar-sub">big points</span>
        </div>
        <div className="gameover__bar-cell">
          <span className="gameover__bar-label">Small</span>
          <span className="gameover__bar-value">{totalSmall}</span>
          <span
            className="gameover__bar-sub"
            style={{ color: bonus > 0 ? 'var(--color-accent)' : bonus < 0 ? 'var(--color-danger)' : undefined }}
          >
            {bonusText}
          </span>
        </div>
        <div className="gameover__bar-cell">
          <span className="gameover__bar-label">Baluts</span>
          <span className="gameover__bar-value">{balutCount}</span>
          <span className="gameover__bar-sub">× 2 big pts</span>
        </div>
      </div>

      <div className="gameover__leaderboard">
        {isLoggedIn ? (
          (submitState === 'done' || scoreSubmitted) ? (
            <p className="gameover__hs-done">Saved to your profile &amp; the leaderboard.</p>
          ) : submitState === 'error' ? (
            <p className="gameover__hs-error">Couldn’t save your score — check your connection.</p>
          ) : (
            <p className="gameover__hs-checking">Saving your game…</p>
          )
        ) : alreadyDone ? (
          <p className="gameover__hs-done">Score submitted!</p>
        ) : qualifyingPeriods === null ? (
          <p className="gameover__hs-checking">Checking leaderboard…</p>
        ) : qualifies ? (
          <div className="gameover__hs-qualify">
            <p className="gameover__hs-title">You qualify for —</p>
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
                {submitState === 'submitting' ? 'Submitting…' : 'Submit score'}
              </button>
            </form>
            {submitState === 'error' && (
              <p className="gameover__hs-error">Submission failed — check your connection.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="gameover__actions">
        <button className="gameover__play-again" onClick={onPlayAgain}>
          Play again
        </button>
        <button className="gameover__hs-view" onClick={onViewHighscores}>
          View leaderboard →
        </button>
      </div>
    </div>
  );
}
