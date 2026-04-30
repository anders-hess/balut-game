import { useMemo, useState, useEffect, useRef } from 'react';
import { computeRecommendations } from '../logic/oracle.js';
import './TheOracle.css';

export default function TheOracle({
  dice, rollsLeft, scorecard,
  isOpen, hasRolled, isGameOver,
  onToggle,
}) {
  const diceValues = dice.map(d => d.value);
  const [openTip, setOpenTip] = useState(null);
  const panelRef = useRef(null);

  const recommendations = useMemo(() => {
    if (!hasRolled || isGameOver) return [];
    return computeRecommendations(diceValues, rollsLeft, scorecard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceValues.join(','), rollsLeft, scorecard, hasRolled, isGameOver]);

  // Close tooltip when recommendations change (new roll / score)
  useEffect(() => { setOpenTip(null); }, [recommendations]);

  // Close tooltip on outside click
  useEffect(() => {
    if (openTip === null) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpenTip(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openTip]);

  function toggleTip(i) {
    setOpenTip(prev => prev === i ? null : i);
  }

  return (
    <aside className="oracle" ref={panelRef}>
      <div className="oracle__header">
        <span className="oracle__star">✦</span>
        <h2 className="oracle__title">The Oracle</h2>
        <button
          className="oracle__toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          title={isOpen ? 'Hide Oracle' : 'Show Oracle'}
        >
          {isOpen ? '▲ Hide' : '▼ Show'}
        </button>
      </div>

      {isOpen && (
        <div className="oracle__body">
          {isGameOver ? (
            <div className="oracle__placeholder">
              <span className="oracle__placeholder-icon">🏁</span>
              <p>Game complete!</p>
              <p className="oracle__placeholder-sub">Check your final scores in the scorecard.</p>
            </div>
          ) : !hasRolled ? (
            <div className="oracle__placeholder">
              <span className="oracle__placeholder-icon">🎲</span>
              <p>Waiting for dice to be rolled…</p>
              <p className="oracle__placeholder-sub">Roll to see recommended actions.</p>
            </div>
          ) : (
            <>
              <p className="oracle__intro">All actions ranked by expected value</p>
              <ol className="oracle__list">
                {recommendations.map((action, i) => (
                  <li
                    key={i}
                    className={[
                      'oracle__item',
                      i === 0                 ? 'oracle__item--top'   : '',
                      action.type === 'score' ? 'oracle__item--score' : 'oracle__item--hold',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="oracle__rank">{i + 1}</span>

                    <div className="oracle__content">
                      <span className="oracle__label">{action.label}</span>
                      <span className="oracle__detail">{action.detail}</span>
                      {action.type === 'hold' && action.detail !== action.evText && (
                        <span className="oracle__ev">{action.evText}</span>
                      )}
                    </div>

                    {/* Info tooltip button */}
                    <div className="oracle__tip-wrap">
                      <button
                        className={`oracle__info-btn ${openTip === i ? 'oracle__info-btn--active' : ''}`}
                        onClick={() => toggleTip(i)}
                        aria-label="More information"
                        aria-expanded={openTip === i}
                      >
                        i
                      </button>
                      {openTip === i && (
                        <div className="oracle__tooltip" role="tooltip">
                          <p className="oracle__tooltip-placeholder">
                            Detailed probability breakdown coming soon.
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
