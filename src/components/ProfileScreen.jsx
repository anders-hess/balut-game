import { useState, useEffect } from 'react';
import { fetchInsights } from '../services/analytics.js';
import { fetchUserGames, fetchUserBest } from '../services/profile.js';
import AchievementsPanel from './AchievementsPanel.jsx';
import './ProfileScreen.css';

function Logo({ size = 36, onClick }) {
  return (
    <div className="profile-logo" style={{ cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <div className="profile-logo__mark" style={{ width: size, height: size, fontSize: size * 0.62 }}>b</div>
      <span className="profile-logo__word" style={{ fontSize: size * 0.62 }}>balut</span>
    </div>
  );
}

function StatTile({ label, value, accent = false, suffix = '' }) {
  const display = value === null || value === undefined ? '—' : `${value}${suffix}`;
  return (
    <div className="profile-tile">
      <span className="profile-tile__value" style={accent ? { color: 'var(--color-accent)' } : {}}>{display}</span>
      <span className="profile-tile__label">{label}</span>
    </div>
  );
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

export default function ProfileScreen({ onClose, onSignOut, userId, username }) {
  const [insights, setInsights] = useState(null);
  const [games,    setGames]    = useState([]);
  const [best,     setBest]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchInsights(userId), fetchUserGames(userId, 50), fetchUserBest(userId)])
      .then(([ins, gs, b]) => {
        if (cancelled) return;
        setInsights(ins?.user ?? null);
        setGames(gs);
        setBest(b);
        setLoading(false);
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);

  const sc = insights?.scores;
  const sk = insights?.scorecard;

  return (
    <div className="profile-screen">
      <header className="profile-screen__header">
        <Logo size={36} onClick={onClose} />
        <div className="profile-screen__header-actions">
          <button className="profile-screen__signout" onClick={onSignOut}>Log out</button>
          <button className="profile-screen__back" onClick={onClose}>← Back to home</button>
        </div>
      </header>

      <main className="profile-screen__inner">
        <div className="profile-screen__hero">
          <div className="profile-screen__kicker">My profile</div>
          <h1 className="profile-screen__title">{username || 'You'}</h1>
        </div>

        {loading && <p className="profile-screen__status">Loading your stats…</p>}
        {error   && <p className="profile-screen__status profile-screen__status--error">Could not load your profile. Check your connection.</p>}

        {!loading && !error && (
          <div className="profile-screen__sections">
            <section className="profile-section">
              <h2 className="profile-section__title">At a glance</h2>
              <div className="profile-tiles">
                <StatTile label="Games played"   value={insights?.games?.allTime ?? 0} accent />
                <StatTile label="Personal best"  value={best ? best.big_points : null} suffix={best ? ' big' : ''} />
                <StatTile label="Total baluts"   value={games.length ? games.reduce((a, g) => a + g.balut_count, 0) : (insights?.games?.allTime === 0 ? 0 : null)} />
              </div>
              {best && <p className="profile-section__sub">Your best game was {best.big_points} big · {best.small_points} small on {fmtDate(best.created_at)}.</p>}
            </section>

            <section className="profile-section">
              <h2 className="profile-section__title">Averages</h2>
              <div className="profile-tiles">
                <StatTile label="Avg big points"   value={sc?.avgBig}    accent />
                <StatTile label="Avg small points" value={sc?.avgSmall}  />
                <StatTile label="Avg baluts"       value={sc?.avgBaluts == null ? null : sc.avgBaluts.toFixed(1)} />
              </div>
            </section>

            <AchievementsPanel userId={userId} username={username} />

            <section className="profile-section">
              <h2 className="profile-section__title">Scorecard rates</h2>
              <p className="profile-section__sub">
                {sk?.eventsCount > 0
                  ? `% of your ${sk.eventsCount} tracked game${sk.eventsCount !== 1 ? 's' : ''} meeting each threshold.`
                  : 'Accumulates as you play games while logged in.'}
              </p>
              <div className="profile-tiles profile-tiles--six">
                <StatTile label="Fours ≥ 52"    value={sk?.pctFours}     suffix="%" />
                <StatTile label="Fives ≥ 65"    value={sk?.pctFives}     suffix="%" />
                <StatTile label="Sixes ≥ 78"    value={sk?.pctSixes}     suffix="%" />
                <StatTile label="Straight ×4"   value={sk?.pctStraight}  suffix="%" />
                <StatTile label="Full House ×4" value={sk?.pctFullHouse} suffix="%" />
                <StatTile label="Chance ≥ 100"  value={sk?.pctChoice}    suffix="%" />
                <StatTile label="Balut ≥ 1"     value={sk?.pctBalut}     suffix="%" accent />
              </div>
            </section>

            <section className="profile-section">
              <h2 className="profile-section__title">Play history</h2>
              {games.length === 0 ? (
                <p className="profile-section__sub">No games yet — finish a game while logged in and it’ll appear here.</p>
              ) : (
                <div className="profile-history">
                  <table className="profile-history__table">
                    <thead>
                      <tr><th>Date</th><th>Big</th><th>Small</th><th>Baluts</th></tr>
                    </thead>
                    <tbody>
                      {games.map((g, i) => (
                        <tr key={i}>
                          <td>{fmtDate(g.created_at)}</td>
                          <td className="profile-history__big">{g.big_points}</td>
                          <td>{g.small_points}</td>
                          <td>{g.balut_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
