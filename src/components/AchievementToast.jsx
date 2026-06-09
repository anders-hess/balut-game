import { useEffect } from 'react';
import './AchievementToast.css';

/**
 * Sequential unlock toast. Renders the head of the queue (`item`) for a few
 * seconds, then calls onDone so the parent can shift the queue. Each item must
 * carry a unique `id` so the timer re-arms per item.
 *
 * item: { id, kind: 'best' | 'achievement', def?, tierLabel?, nudge? }
 */
export default function AchievementToast({ item, onDone, onSignUp }) {
  useEffect(() => {
    if (!item) return undefined;
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  if (item.kind === 'best') {
    return (
      <div className="achv-toast achv-toast--best" role="status" aria-live="polite">
        <span className="achv-toast__icon">🎉</span>
        <div className="achv-toast__body">
          <span className="achv-toast__kicker">New personal best!</span>
          <span className="achv-toast__name">Your highest game yet</span>
        </div>
      </div>
    );
  }

  const { def, tierLabel, nudge } = item;
  return (
    <div className="achv-toast" role="status" aria-live="polite">
      <span className="achv-toast__icon">{def.icon}</span>
      <div className="achv-toast__body">
        <span className="achv-toast__kicker">
          {item.isMilestone ? 'Milestone unlocked' : 'Achievement unlocked'}
        </span>
        <span className="achv-toast__name">
          {def.name}{tierLabel ? ` · ${tierLabel}` : ''}
        </span>
        {nudge && (
          <button className="achv-toast__nudge" onClick={onSignUp}>
            Sign up to save your badges →
          </button>
        )}
      </div>
    </div>
  );
}
