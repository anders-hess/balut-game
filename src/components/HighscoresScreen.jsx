import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../services/highscores.js';
import './HighscoresScreen.css';

const PERIODS = ['daily', 'monthly', 'yearly'];
const PERIOD_LABELS = { daily: 'Today', monthly: 'This Month', yearly: 'This Year' };

export default function HighscoresScreen({ onClose }) {
  const [activePeriod, setActivePeriod] = useState('daily');
  const [boards, setBoards] = useState({ daily: null, monthly: null, yearly: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(PERIODS.map(p => fetchLeaderboard(p)))
      .then(([daily, monthly, yearly]) => {
        if (!cancelled) {
          setBoards({ daily, monthly, yearly });
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
      <div className="hs-screen__inner">
        <div className="hs-screen__header">
          <button className="hs-screen__back" onClick={onClose}>← Back</button>
          <h1 className="hs-screen__title">🏆 Leaderboard</h1>
          <div /> {/* spacer */}
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
            <table className="hs-table">
              <thead>
                <tr>
                  <th className="hs-table__th hs-table__th--rank">#</th>
                  <th className="hs-table__th">Name</th>
                  <th className="hs-table__th hs-table__th--num">Big Pts</th>
                  <th className="hs-table__th hs-table__th--num">Small Pts</th>
                  <th className="hs-table__th hs-table__th--num">Baluts</th>
                  <th className="hs-table__th hs-table__th--date">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'hs-table__row hs-table__row--top' : 'hs-table__row'}>
                    <td className="hs-table__td hs-table__td--rank">{i + 1}</td>
                    <td className="hs-table__td hs-table__td--name">{row.player_name}</td>
                    <td className="hs-table__td hs-table__td--num">{row.big_points}</td>
                    <td className="hs-table__td hs-table__td--num">{row.small_points}</td>
                    <td className="hs-table__td hs-table__td--num">{row.balut_count}</td>
                    <td className="hs-table__td hs-table__td--date">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
