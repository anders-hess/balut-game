import { useMemo, useState, useEffect, useRef } from 'react';
import { recommend } from '../logic/oracle/index.js';
import './TheOracle.css';

export default function TheOracle({
  dice, rollsLeft, scorecard,
  isOpen, hasRolled, isGameOver,
  onToggle,
}) {
  const diceValues = dice.map(d => d.value);
  const [openTip, setOpenTip] = useState(null);
  const panelRef = useRef(null);

  const result = useMemo(() => {
    if (!hasRolled || isGameOver) return null;
    return recommend({ currentDice: diceValues, rollsRemaining: rollsLeft, scorecard });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceValues.join(','), rollsLeft, scorecard, hasRolled, isGameOver]);

  useEffect(() => { setOpenTip(null); }, [result]);

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

  function formatBpiv(bpiv) {
    if (bpiv === null || bpiv === undefined) return '—';
    const sign = bpiv > 0 ? '+' : '';
    return `${sign}${bpiv.toFixed(2)}`;
  }

  function bpivClass(bpiv) {
    if (bpiv > 0) return 'oracle__bpiv oracle__bpiv--positive';
    if (bpiv < 0) return 'oracle__bpiv oracle__bpiv--negative';
    return 'oracle__bpiv';
  }

  function actionDetail(action) {
    if (action.type === 'SCORE_NOW') {
      return `${action.smallPoints} pts`;
    }
    const numReroll = 5 - (action.held?.length ?? 0);
    return `Reroll ${numReroll} ${numReroll === 1 ? 'die' : 'dice'}`;
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
              {result?.isAllNegative && (
                <p className="oracle__no-positive-banner">
                  No positive options available. Showing the least costly choices.
                </p>
              )}
              <p className="oracle__intro">
                BPIV = Big Point Incremental Value vs. average outcome
              </p>
              <ol className="oracle__list">
                {result?.actions.map((action, i) => (
                  <li
                    key={i}
                    className={[
                      'oracle__item',
                      i === 0                       ? 'oracle__item--top'   : '',
                      action.type === 'SCORE_NOW'   ? 'oracle__item--score' : 'oracle__item--hold',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="oracle__rank">{action.rank}</span>

                    <div className="oracle__content">
                      <span className="oracle__label">{action.description}</span>
                      <span className="oracle__detail">{actionDetail(action)}</span>
                    </div>

                    <span className={bpivClass(action.bpiv)} title="Big Point Incremental Value">
                      {formatBpiv(action.bpiv)}
                    </span>

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
                          {renderTooltip(action)}
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

function renderTooltip(action) {
  if (action.type === 'SCORE_NOW') {
    const { categoryBigDelta, bonusBigDelta } = action.breakdown;
    return (
      <div className="oracle__tooltip-score">
        <p><strong>Small points scored:</strong> {action.smallPoints}</p>
        <p><strong>Category big pt delta:</strong> {categoryBigDelta?.toFixed(2) ?? '—'}</p>
        <p><strong>Bonus big pt delta:</strong> {bonusBigDelta?.toFixed(2) ?? '—'}</p>
        <p><strong>Total BPIV:</strong> {action.bpiv >= 0 ? '+' : ''}{action.bpiv.toFixed(2)}</p>
      </div>
    );
  }

  // REROLL tooltip
  const outcomes = action.tooltipOutcomes ?? [];
  const weightedAvg = outcomes.reduce((s, o) => s + (o.probability * o.downstreamBpiv), 0)
    / (outcomes.reduce((s, o) => s + o.probability, 0) || 1);

  return (
    <div className="oracle__tooltip-reroll">
      <p className="oracle__tooltip-header">Top outcomes if you {action.description.toLowerCase()}:</p>
      <table className="oracle__tooltip-table">
        <tbody>
          {outcomes.map((o, i) => (
            <tr key={i}>
              <td className="oracle__tooltip-desc">{o.description}</td>
              <td className="oracle__tooltip-prob">{(o.probability * 100).toFixed(1)}%</td>
              <td className="oracle__tooltip-action">{o.bestDownstreamAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="oracle__tooltip-avg">
        Weighted average BPIV: {weightedAvg >= 0 ? '+' : ''}{weightedAvg.toFixed(2)}
      </p>
    </div>
  );
}
