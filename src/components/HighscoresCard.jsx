import { useState, useEffect } from 'react';
import { fetchLeaderboard } from '../services/highscores.js';
import './HighscoresCard.css';

export default function HighscoresCard({ onViewAll, refreshTrigger }) {
  const [rows, setRows]       = useState(null); // null = loading
  const [error, setError]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(false);
    fetchLeaderboard('weekly')
      .then(data => { if (!cancelled) setRows(data.slice(0, 3)); })
      .catch(() =>  { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  return (
    <div className="hs-card">
      <div className="hs-card__header">
        <span className="hs-card__icon">🏆</span>
        <span className="hs-card__title">This Week's Top 3</span>
        <button className="hs-card__view-all" onClick={onViewAll}>
          View all →
        </button>
      </div>

      <div className="hs-card__body">
        {rows === null ? (
          <p className="hs-card__status">Loading…</p>
        ) : error || rows.length === 0 ? (
          <p className="hs-card__status">No scores yet today.</p>
        ) : (
          <ol className="hs-card__list">
            {rows.map((row, i) => (
              <li key={i} className={`hs-card__row ${i === 0 ? 'hs-card__row--top' : ''}`}>
                <span className="hs-card__rank">{i + 1}</span>
                <span className="hs-card__name">{row.player_name}</span>
                <span className="hs-card__pts">{row.big_points} points</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
