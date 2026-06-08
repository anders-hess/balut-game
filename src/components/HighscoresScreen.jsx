import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../services/highscores.js';
import './HighscoresScreen.css';

const PERIODS = ['weekly', 'monthly', 'yearly'];
const PERIOD_LABELS = { weekly: 'Week', monthly: 'Month', yearly: 'Year' };
const HEADLINE = { weekly: 'This week\'s\nhighest scores.', monthly: 'This month\'s\nhighest scores.', yearly: 'This year\'s\nhighest scores.' };

// Simple logo mark
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

export default function HighscoresScreen({ onClose, backLabel = '← Back to home' }) {
  const [activePeriod, setActivePeriod] = useState('weekly');
  const [boards, setBoards] = useState({ weekly: null, monthly: null, yearly: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(PERIODS.map(p => fetchLeaderboard(p)))
      .then(([weekly, monthly, yearly]) => {
        if (!cancelled) {
          setBoards({ weekly, monthly, yearly });
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, []);

  const rows = boards[activePeriod] ?? [];

  return (
    <div className="hs-screen">
      {/* Marketing header */}
      <header className="hs-screen__marketing-header">
        <Logo size={36} onClick={onClose} />
        <button className="hs-screen__back" onClick={onClose}>{backLabel}</button>
      </header>

      <div className="hs-screen__inner">
        {/* Headline + tabs */}
        <div className="hs-screen__header">
          <div className="hs-screen__hero">
            <div className="hs-screen__kicker">Leaderboard</div>
            <h1 className="hs-screen__title">
              {HEADLINE[activePeriod].split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h1>
          </div>
          <div className="hs-screen__tabs">
            {PERIODS.map(p => (
              <button
                key={p}
                className={`hs-screen__tab ${activePeriod === p ? 'hs-screen__tab--active' : ''}`}
                onClick={() => setActivePeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Column header + body */}
        <div className="hs-screen__table">
        <div className="hs-screen__col-header">
          <span>#</span>
          <span>Player</span>
          <span className="hs-screen__col-baluts">Baluts</span>
          <span className="hs-screen__col-small">Small</span>
          <span className="hs-screen__col-big">Big</span>
        </div>

        <div className="hs-screen__body">
          {loading ? (
            <p className="hs-screen__status">Loading…</p>
          ) : error ? (
            <p className="hs-screen__status hs-screen__status--error">
              Could not load scores. Check your connection.
            </p>
          ) : rows.length === 0 ? (
            <p className="hs-screen__status">No scores yet — be the first!</p>
          ) : (
            rows.map((row, i) => {
              const medalClass = i < 3 ? ` hs-row__rank--${i + 1}` : '';
              return (
                <div key={i} className="hs-row">
                  <span className={`hs-row__rank${medalClass}`}>{i + 1}</span>
                  <div className="hs-row__name">
                    <span className="hs-row__name-line">
                      {row.player_name}
                      {row.is_guest
                        ? <span className="hs-row__tag hs-row__tag--guest">guest</span>
                        : <span className="hs-row__tag hs-row__tag--verified" title="Registered player">✓</span>}
                    </span>
                    <span className="hs-row__sub">
                      {activePeriod === 'weekly'
                        ? new Date(row.created_at).toLocaleDateString('en', { weekday: 'long' })
                        : new Date(row.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                      }
                    </span>
                  </div>
                  <span className="hs-row__baluts">{row.balut_count}</span>
                  <span className="hs-row__small">{row.small_points}</span>
                  <span className="hs-row__big">{row.big_points}</span>
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
