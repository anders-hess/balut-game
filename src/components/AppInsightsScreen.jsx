import { useState, useEffect } from 'react';
import { fetchInsights } from '../services/analytics.js';
import './AppInsightsScreen.css';

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

function StatTile({ label, value, accent = false, suffix = '' }) {
  const display = value === null ? '—' : `${value}${suffix}`;
  return (
    <div className="ai-tile">
      <span className="ai-tile__value" style={accent ? { color: 'var(--color-accent)' } : {}}>{display}</span>
      <span className="ai-tile__label">{label}</span>
    </div>
  );
}

// Renders one group of tiles, or — when `user` tiles are supplied — an
// all-players-vs-you side-by-side comparison.
function CompareTiles({ all, user, username, tilesClass = 'ai-tiles' }) {
  if (!user) return <div className={tilesClass}>{all}</div>;
  return (
    <div className="ai-compare">
      <div className="ai-compare__col">
        <span className="ai-compare__heading">All players</span>
        <div className={tilesClass}>{all}</div>
      </div>
      <div className="ai-compare__col ai-compare__col--you">
        <span className="ai-compare__heading">{username || 'You'}</span>
        <div className={tilesClass}>{user}</div>
      </div>
    </div>
  );
}

const gamesTiles = (g) => (
  <>
    <StatTile label="All time"   value={g.allTime}   accent />
    <StatTile label="This month" value={g.thisMonth} />
    <StatTile label="This week"  value={g.thisWeek}  />
  </>
);

const scoreTiles = (s) => (
  <>
    <StatTile label="Avg big points"   value={s.avgBig}    accent />
    <StatTile label="Avg small points" value={s.avgSmall}  />
    <StatTile label="Avg baluts"       value={s.avgBaluts} />
  </>
);

const scorecardTiles = (sc) => (
  <>
    <StatTile label="Fours ≥ 52"     value={sc.pctFours}     suffix="%" />
    <StatTile label="Fives ≥ 65"     value={sc.pctFives}     suffix="%" />
    <StatTile label="Sixes ≥ 78"     value={sc.pctSixes}     suffix="%" />
    <StatTile label="Straight ×4"    value={sc.pctStraight}  suffix="%" />
    <StatTile label="Full House ×4"  value={sc.pctFullHouse} suffix="%" />
    <StatTile label="Chance ≥ 100"   value={sc.pctChoice}    suffix="%" />
    <StatTile label="Balut ≥ 1"      value={sc.pctBalut}     suffix="%" accent />
  </>
);

export default function AppInsightsScreen({ onClose, userId = null, username = null }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchInsights(userId)
      .then(d  => { if (!cancelled) { setData(d);          setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="ai-screen">
      <header className="ai-screen__marketing-header">
        <Logo size={36} onClick={onClose} />
        <button className="ai-screen__back" onClick={onClose}>← Back to home</button>
      </header>

      <div className="ai-screen__inner">
        <div className="ai-screen__hero">
          <div className="ai-screen__kicker">Analytics</div>
          <h1 className="ai-screen__title">How the game<br />is being played.</h1>
        </div>

        {loading && <p className="ai-screen__status">Loading…</p>}
        {error   && <p className="ai-screen__status ai-screen__status--error">Could not load insights. Check your connection.</p>}

        {data && (
          <div className="ai-screen__sections">

            <section className="ai-section">
              <h2 className="ai-section__title">Visitor Stats</h2>
              {/* Visits aren't per-user — always all-players */}
              <div className="ai-tiles">
                <StatTile label="All time"   value={data.visits.allTime}   accent />
                <StatTile label="This month" value={data.visits.thisMonth} />
                <StatTile label="This week"  value={data.visits.thisWeek}  />
              </div>
            </section>

            <section className="ai-section">
              <h2 className="ai-section__title">Games Played</h2>
              <CompareTiles
                all={gamesTiles(data.games)}
                user={data.user && gamesTiles(data.user.games)}
                username={username}
              />
            </section>

            <section className="ai-section">
              <h2 className="ai-section__title">Score Insights</h2>
              <p className="ai-section__sub">Averages from {data.scores.scoresCount} leaderboard score{data.scores.scoresCount !== 1 ? 's' : ''}.</p>
              <CompareTiles
                all={scoreTiles(data.scores)}
                user={data.user && scoreTiles(data.user.scores)}
                username={username}
              />
            </section>

            <section className="ai-section">
              <h2 className="ai-section__title">Scorecard Insights</h2>
              <p className="ai-section__sub">
                {data.scorecard.eventsCount > 0
                  ? `% of ${data.scorecard.eventsCount} tracked game${data.scorecard.eventsCount !== 1 ? 's' : ''} meeting each threshold.`
                  : 'Accumulates as games are played after tracking started.'}
              </p>
              <CompareTiles
                all={scorecardTiles(data.scorecard)}
                user={data.user && scorecardTiles(data.user.scorecard)}
                username={username}
                tilesClass="ai-tiles ai-tiles--six"
              />
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
