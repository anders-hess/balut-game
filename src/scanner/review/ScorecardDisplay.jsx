import { CATEGORIES, CATEGORY_LABELS, BIG_POINT_RULES, NUM_COLUMNS } from '../../logic/gameConstants.js';
import { calcTotals, countBaluts } from '../../logic/scoring.js';
import './ScorecardDisplay.css';

export default function ScorecardDisplay({ scorecard, onDone, onClose }) {
  const { totalSmall, totalBig, bonus, categoryBigPoints, categoryTotals } = calcTotals(scorecard);
  const balutCount = countBaluts(scorecard);

  return (
    <div className="scd-screen">
      <header className="scd-header">
        <div className="scd-header__top">
          <h1 className="scd-title">Scorecard</h1>
          {onClose && (
            <button className="scd-back" onClick={onClose}>← Back to app</button>
          )}
        </div>
        <p className="scd-subtitle">Scan complete — review your imported scorecard.</p>
      </header>

      <div className="scd-scroll">
        <table className="scd-table">
          <thead>
            <tr>
              <th className="scd-th-cat">Category</th>
              {Array.from({ length: NUM_COLUMNS }, (_, i) => (
                <th key={i} className="scd-th-entry">#{i + 1}</th>
              ))}
              <th className="scd-th-sum">Sum</th>
              <th className="scd-th-big">Big</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => {
              const catTotal  = categoryTotals[cat];
              const bigPts    = categoryBigPoints[cat];
              const rule      = BIG_POINT_RULES[cat];
              const isComplete= scorecard[cat].every(s => s !== null);

              return (
                <tr key={cat} className="scd-row">
                  <td className="scd-td-cat">{CATEGORY_LABELS[cat]}</td>
                  {scorecard[cat].map((score, col) => (
                    <td key={col} className={`scd-td-entry ${score !== null ? 'scd-td-entry--filled' : 'scd-td-entry--empty'}`}>
                      {score !== null ? fmtZero(score) : ''}
                    </td>
                  ))}
                  <td className="scd-td-sum">{scorecard[cat].some(s => s !== null) ? catTotal : ''}</td>
                  <td className="scd-td-big">
                    {bigPts > 0
                      ? <span className="scd-big-earned">+{bigPts}</span>
                      : isComplete
                        ? <span className="scd-big-zero">0</span>
                        : <span className="scd-big-target">{bigPtTarget(rule)}</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="scd-footer">
        <div className="scd-total">
          <span className="scd-total__label">Small Points</span>
          <span className="scd-total__value">{totalSmall}</span>
          <span className="scd-total__hint">({bonus >= 0 ? `+${bonus}` : bonus} big points)</span>
        </div>
        <div className="scd-total">
          <span className="scd-total__label">Balut</span>
          <span className="scd-total__value">{balutCount}</span>
        </div>
        <div className="scd-total scd-total--big">
          <span className="scd-total__label">Grand Total <span className="scd-total__label-small">(Big)</span></span>
          <div className="scd-total__big-row">
            <span className="scd-total__value scd-total__value--big">{totalBig}</span>
            <span className="scd-total__big-sub">big points</span>
          </div>
        </div>
      </div>

      <div className="scd-actions">
        <button className="scd-btn" onClick={onDone}>Scan another</button>
        {onClose && (
          <button className="scd-btn scd-btn--primary" onClick={onClose}>Back to app</button>
        )}
      </div>
    </div>
  );
}

function bigPtTarget(rule) {
  if (rule.type === 'sum')      return `/${rule.threshold}`;
  if (rule.type === 'filled')   return `+${rule.points}`;
  if (rule.type === 'perBalut') return '+2 ea';
  return '';
}

// A scored 0 (scratched / forced-zero cell) reads more clearly as a dash.
function fmtZero(v) {
  return v === 0 ? '–' : v;
}
