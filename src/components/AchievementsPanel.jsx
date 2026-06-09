import { useState, useEffect } from 'react';
import { loadProfileAchievements } from '../services/achievements.js';
import './AchievementsPanel.css';

function StreakCard({ icon, label, current, longest }) {
  const unit = (n) => (n === 1 ? 'wk' : 'wks');
  return (
    <div className="achv-streak-card">
      <span className="achv-streak-card__icon">{icon}</span>
      <span className="achv-streak-card__current">
        {current}<span className="achv-streak-card__unit"> {unit(current)}</span>
      </span>
      <span className="achv-streak-card__label">{label}</span>
      <span className="achv-streak-card__longest">Best: {longest} {unit(longest)}</span>
    </div>
  );
}

function ProgressRow({ p }) {
  const reached = p.tier > 0 ? p.tiers.find(t => t.tier === p.tier) : null;
  const pct = p.next ? Math.min(100, Math.round((p.value / p.next) * 100)) : 100;
  return (
    <div className="achv-progress">
      <div className="achv-progress__head">
        <span className="achv-progress__icon">{p.icon}</span>
        <span className="achv-progress__name">{p.name}</span>
        {reached && <span className="achv-progress__tier">{reached.label}</span>}
        <span className="achv-progress__val">
          {p.next ? `${p.value} / ${p.next}` : `${p.value} ✓`}
        </span>
      </div>
      <div className="achv-progress__bar">
        <div className="achv-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AchievementsPanel({ userId, username }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    loadProfileAchievements({ id: userId }, username)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [userId, username]);

  if (error) {
    return (
      <section className="profile-section">
        <h2 className="profile-section__title">Achievements</h2>
        <p className="profile-section__sub">Couldn’t load your achievements. Check your connection.</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="profile-section">
        <h2 className="profile-section__title">Achievements</h2>
        <p className="profile-section__sub">Loading achievements…</p>
      </section>
    );
  }

  const { feats, competitive, progression, play, leaderboard } = data;
  const badges = [...feats, ...competitive];
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <>
      <section className="profile-section">
        <h2 className="profile-section__title">Streaks</h2>
        <div className="achv-streaks">
          <StreakCard icon="🔥" label="Play streak"        current={play.current}        longest={play.longest} />
          <StreakCard icon="🏆" label="Leaderboard streak" current={leaderboard.current} longest={leaderboard.longest} />
        </div>
      </section>

      <section className="profile-section">
        <h2 className="profile-section__title">
          Achievements <span className="achv-count">{earnedCount} / {badges.length}</span>
        </h2>
        <div className="achv-grid">
          {badges.map(b => (
            <div
              key={b.id}
              className={`achv-badge${b.earned ? '' : ' achv-badge--locked'}`}
              title={b.description}
            >
              <span className="achv-badge__icon">{b.icon}</span>
              <span className="achv-badge__name">{b.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <h2 className="profile-section__title">Progress</h2>
        <div className="achv-progress-list">
          {progression.map(p => <ProgressRow key={p.id} p={p} />)}
        </div>
      </section>
    </>
  );
}
