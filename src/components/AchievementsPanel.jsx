import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { loadProfileAchievements } from '../services/achievements.js';
import './AchievementsPanel.css';

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

// ── Overall tier rail: four medallions linked by a progression line ──────────
function TierRail({ overall }) {
  // Fill reaches the centre of the current tier's medallion (12.5% per cell).
  const fillPct = overall.current > 0 ? (overall.current - 1) * 25 : 0;
  return (
    <div className="tier-rail" role="img" aria-label={`Collector tier ${overall.current} of 4`}>
      <span className="tier-rail__line" />
      <span className="tier-rail__line tier-rail__line--fill" style={{ width: `${fillPct}%` }} />
      {overall.tiers.map(t => (
        <div className="tier-cell" key={t.tier}>
          <div className={`tier-medal tier-medal--${t.key}${t.reached ? ' is-reached' : ''}`}>
            <span className="tier-medal__numeral">{t.numeral}</span>
            {t.reached && <span className="tier-medal__check" aria-hidden>✓</span>}
          </div>
          <span className={`tier-cell__label${t.reached ? ' is-reached' : ''}`}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function Tracker({ t }) {
  const span = t.next != null ? t.next - t.prev : 1;
  const pct = t.next != null ? Math.max(0, Math.min(100, Math.round(((t.value - t.prev) / span) * 100))) : 100;
  return (
    <div className="tracker">
      <div className="tracker__top">
        <span className="tracker__icon">{t.icon}</span>
        <span className="tracker__name">{t.name}</span>
        <span className="tracker__value">
          <b>{t.value.toLocaleString()}</b>{t.next != null ? ` / ${t.next.toLocaleString()}` : ''}
        </span>
      </div>
      <div className="tracker__bar">
        <div className="tracker__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="tracker__foot">
        {t.next != null
          ? `${(t.next - t.value).toLocaleString()} more to ${t.nextLabel}`
          : 'Top tier reached ✓'}
      </div>
    </div>
  );
}

function StreakCard({ variant, glyph, label, current, longest }) {
  const wk = (n) => (n === 1 ? 'week' : 'weeks');
  return (
    <div className={`streak-card streak-card--${variant}${current > 0 ? ' is-active' : ''}`}>
      <span className="streak-card__watermark" aria-hidden>{glyph}</span>
      <span className="streak-card__head">{label}</span>
      <div className="streak-card__figure">
        <span className="streak-card__num">{current}</span>
        <span className="streak-card__unit">{wk(current)}</span>
      </div>
      <span className="streak-card__foot">
        Longest <b>{longest}</b> {longest === 1 ? 'wk' : 'wks'}
      </span>
    </div>
  );
}

// Tap-to-open description popover per badge (touch-friendly; replaces the
// native hover title). Only one popover is open at a time.
function BadgeGrid({ badges }) {
  const [openId, setOpenId] = useState(null);
  const ref = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (openId === null) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenId(null); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpenId(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openId]);

  // Keep the popover inside the viewport: measure (before paint) and shift it,
  // moving the arrow by the opposite amount so it still points at the badge.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (openId === null || !pop) return;
    pop.style.setProperty('--shift', '0px');
    const rect = pop.getBoundingClientRect();
    const margin = 10;
    let shift = 0;
    if (rect.left < margin) shift = margin - rect.left;
    else if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;
    pop.style.setProperty('--shift', `${shift}px`);
  }, [openId]);

  return (
    <div className="achv-grid" ref={ref}>
      {badges.map(b => {
        const open = openId === b.id;
        return (
          <div key={b.id} className={`achv-badge${b.earned ? '' : ' achv-badge--locked'}${open ? ' is-open' : ''}`}>
            <button
              type="button"
              className="achv-badge__btn"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : b.id)}
            >
              <span className="achv-badge__icon">{b.icon}</span>
              <span className="achv-badge__name">{b.name}</span>
            </button>
            {open && (
              <div className="achv-pop" role="tooltip" ref={popRef}>
                <span className="achv-pop__title">{b.name}</span>
                <span className="achv-pop__desc">{b.description}</span>
                <span className={`achv-pop__status${b.earned ? ' is-earned' : ''}`}>
                  {b.earned ? (b.at ? `Unlocked ${fmtDate(b.at)}` : 'Unlocked') : 'Locked'}
                </span>
              </div>
            )}
          </div>
        );
      })}
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

  const { feats, competitive, overall, trackers, play, leaderboard } = data;
  const badges = [...feats, ...competitive];
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <>
      <section className="profile-section">
        <h2 className="profile-section__title">Collector</h2>
        <p className="profile-section__sub">
          Reach a tier by meeting <em>all three</em> milestones below.
        </p>
        <TierRail overall={overall} />
        <div className="tracker-list">
          {trackers.map(t => <Tracker key={t.id} t={t} />)}
        </div>
      </section>

      <section className="profile-section">
        <h2 className="profile-section__title">Streaks</h2>
        <div className="streaks">
          <StreakCard variant="play"  glyph="🔥" label="Play streak"        current={play.current}        longest={play.longest} />
          <StreakCard variant="board" glyph="🏆" label="Leaderboard streak" current={leaderboard.current} longest={leaderboard.longest} />
        </div>
      </section>

      <section className="profile-section">
        <h2 className="profile-section__title">
          Achievements <span className="achv-count">{earnedCount} / {badges.length}</span>
        </h2>
        <p className="profile-section__sub">Tap a badge to see how to earn it.</p>
        <BadgeGrid badges={badges} />
      </section>
    </>
  );
}
