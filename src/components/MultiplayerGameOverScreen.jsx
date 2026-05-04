import { useState, useEffect } from 'react';
import { calcTotals, countBaluts } from '../logic/scoring.js';
import { checkQualifies, submitScore } from '../services/highscores.js';
import './MultiplayerGameOverScreen.css';

const NAME_KEY = 'balut_player_name';

function useLastName() {
  return useState(() => localStorage.getItem(NAME_KEY) ?? '');
}

export default function MultiplayerGameOverScreen({ players, onPlayAgain, onViewHighscores, onScoreSubmitted }) {
  // Sort players by big points desc, then small pts, then baluts
  const ranked = [...players]
    .map(p => ({ ...p, ...calcTotals(p.scorecard), balutCount: countBaluts(p.scorecard) }))
    .sort((a, b) => {
      if (b.totalBig   !== a.totalBig)   return b.totalBig   - a.totalBig;
      if (b.totalSmall !== a.totalSmall) return b.totalSmall - a.totalSmall;
      return b.balutCount - a.balutCount;
    });

  return (
    <div className="mp-gameover">
      <div className="mp-gameover__top">
        <p className="mp-gameover__label">Final Results</p>
        <p className="mp-gameover__winner">🏆 {ranked[0].name} wins!</p>
      </div>

      <div className="mp-gameover__table-wrap">
        <table className="mp-gameover__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Big Pts</th>
              <th>Small Pts</th>
              <th>Baluts</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={i} className={i === 0 ? 'mp-gameover__row--winner' : ''}>
                <td>{i + 1}</td>
                <td className="mp-gameover__player-name">{p.name}</td>
                <td>{p.totalBig}</td>
                <td>{p.totalSmall}</td>
                <td>{p.balutCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mp-gameover__submissions">
        {ranked.map((p, i) => (
          <PlayerSubmit
            key={i}
            player={p}
            defaultName={p.name}
            onScoreSubmitted={onScoreSubmitted}
          />
        ))}
      </div>

      <div className="mp-gameover__actions">
        <button className="mp-gameover__hs-btn" onClick={onViewHighscores}>
          View Leaderboard →
        </button>
        <button className="mp-gameover__play-again" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}

function PlayerSubmit({ player, defaultName, onScoreSubmitted }) {
  const [qualifyingPeriods, setQualifyingPeriods] = useState(null);
  const [name, setName] = useState(defaultName);
  const [submitState, setSubmitState] = useState('idle');

  useEffect(() => {
    checkQualifies(player.totalBig, player.totalSmall, player.balutCount)
      .then(setQualifyingPeriods)
      .catch(() => setQualifyingPeriods([]));
  }, [player.totalBig, player.totalSmall, player.balutCount]);

  const PERIOD_LABELS = { daily: 'Today', monthly: 'This Month', yearly: 'This Year' };
  const qualifies = qualifyingPeriods && qualifyingPeriods.length > 0;

  if (!qualifies && qualifyingPeriods !== null) return null;
  if (submitState === 'done') return (
    <p className="mp-gameover__submitted">✓ {player.name}'s score submitted!</p>
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitState('submitting');
    try {
      await submitScore(name.trim(), player.totalBig, player.totalSmall, player.balutCount);
      localStorage.setItem(NAME_KEY, name.trim());
      setSubmitState('done');
      onScoreSubmitted?.();
    } catch {
      setSubmitState('error');
    }
  }

  return (
    <div className="mp-gameover__submit-row">
      {qualifyingPeriods === null ? (
        <p className="mp-gameover__checking">Checking leaderboard for {player.name}…</p>
      ) : (
        <>
          <p className="mp-gameover__qualify-title">
            🏆 {player.name} made the top 10!
          </p>
          <div className="mp-gameover__badges">
            {qualifyingPeriods.map(p => (
              <span key={p} className="mp-gameover__badge">{PERIOD_LABELS[p]}</span>
            ))}
          </div>
          <form className="mp-gameover__form" onSubmit={handleSubmit}>
            <input
              className="mp-gameover__input"
              type="text"
              placeholder="Name (max 20 chars)"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={submitState === 'submitting'}
            />
            <button
              className="mp-gameover__submit"
              type="submit"
              disabled={!name.trim() || submitState === 'submitting'}
            >
              {submitState === 'submitting' ? 'Submitting…' : 'Submit'}
            </button>
          </form>
          {submitState === 'error' && (
            <p className="mp-gameover__error">Submission failed — check connection.</p>
          )}
        </>
      )}
    </div>
  );
}
