import { useState, useEffect } from 'react';
import { calcTotals, countBaluts } from '../logic/scoring.js';
import { checkQualifies, submitScore } from '../services/highscores.js';
import './MultiplayerGameOverScreen.css';

const NAME_KEY = 'balut_player_name';
const PERIOD_LABELS = { weekly: 'This Week', monthly: 'This Month', yearly: 'This Year' };

export default function MultiplayerGameOverScreen({
  players, onPlayAgain, onViewHighscores, onScoreSubmitted,
  submittedNames = [], onMpPlayerSubmitted,
  isOnline = false, myPlayerIndex = null, authUser = null, authUsername = null,
}) {
  const ranked = players
    .map((p, i) => ({ ...p, origIndex: i, ...calcTotals(p.scorecard), balutCount: countBaluts(p.scorecard) }))
    .sort((a, b) => {
      if (b.totalBig   !== a.totalBig)   return b.totalBig   - a.totalBig;
      if (b.totalSmall !== a.totalSmall) return b.totalSmall - a.totalSmall;
      return b.balutCount - a.balutCount;
    });

  // Online: each device only submits its own player. Local pass-and-play:
  // every player can submit from the shared device.
  const submittable = isOnline
    ? ranked.filter(p => p.origIndex === myPlayerIndex)
    : ranked;

  return (
    <div className="mp-gameover">
      <div>
        <p className="mp-gameover__label">Game complete</p>
        <h1 className="mp-gameover__winner">
          And the winner is —{' '}
          <span className="mp-gameover__winner-accent">{ranked[0].name}.</span>
        </h1>
      </div>

      <div className="mp-gameover__table-wrap">
        <table className="mp-gameover__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Big</th>
              <th>Small</th>
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
        {submittable.map((p) => (
          <PlayerSubmit
            key={p.origIndex}
            player={p}
            alreadySubmitted={submittedNames.includes(p.name)}
            onPlayerSubmitted={() => onMpPlayerSubmitted?.(p.name)}
            onScoreSubmitted={onScoreSubmitted}
            isMe={isOnline && p.origIndex === myPlayerIndex}
            authUser={authUser}
            authUsername={authUsername}
          />
        ))}
      </div>

      <div className="mp-gameover__actions">
        <button className="mp-gameover__play-again" onClick={onPlayAgain}>
          Play again
        </button>
        <button className="mp-gameover__hs-btn" onClick={onViewHighscores}>
          View leaderboard →
        </button>
      </div>
    </div>
  );
}

function PlayerSubmit({ player, alreadySubmitted, onPlayerSubmitted, onScoreSubmitted, isMe = false, authUser = null, authUsername = null }) {
  const [qualifyingPeriods, setQualifyingPeriods] = useState(null);
  const [name, setName] = useState(player.name);
  const [submitState, setSubmitState] = useState('idle');

  const isLoggedInMe = isMe && !!authUser;

  // Guests: check qualification for a manual submit form.
  useEffect(() => {
    if (alreadySubmitted || isLoggedInMe) return;
    checkQualifies(player.totalBig, player.totalSmall, player.balutCount)
      .then(setQualifyingPeriods)
      .catch(() => setQualifyingPeriods([]));
  }, [player.totalBig, player.totalSmall, player.balutCount, alreadySubmitted, isLoggedInMe]);

  // Logged-in player: auto-save their own game to profile + leaderboard.
  useEffect(() => {
    if (!isLoggedInMe || alreadySubmitted || submitState !== 'idle') return;
    setSubmitState('submitting');
    submitScore(authUsername || player.name, player.totalBig, player.totalSmall, player.balutCount, { userId: authUser.id })
      .then(() => { setSubmitState('done'); onPlayerSubmitted?.(); onScoreSubmitted?.(); })
      .catch(() => setSubmitState('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedInMe]);

  const qualifies = qualifyingPeriods && qualifyingPeriods.length > 0;

  if (alreadySubmitted || submitState === 'done') {
    return <p className="mp-gameover__submitted">✓ {player.name}'s score {isLoggedInMe ? 'saved' : 'submitted'}!</p>;
  }

  if (isLoggedInMe) {
    return submitState === 'error'
      ? <p className="mp-gameover__error">Couldn’t save {player.name}'s score — check connection.</p>
      : <p className="mp-gameover__checking">Saving {player.name}'s game…</p>;
  }

  if (!qualifies && qualifyingPeriods !== null) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitState('submitting');
    try {
      await submitScore(name.trim(), player.totalBig, player.totalSmall, player.balutCount);
      localStorage.setItem(NAME_KEY, name.trim());
      setSubmitState('done');
      onPlayerSubmitted?.();
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
            {player.name} qualifies for —
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
