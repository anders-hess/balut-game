import { useMemo, useState, useEffect, useRef } from 'react';
import { recommend } from '../logic/oracle/index.js';
import DiceFace from './DiceFace.jsx';
import './TheOracle.css';

export default function TheOracle({
  dice, rollsLeft, scorecard,
  isOpen, hasRolled, isGameOver,
  onToggle,
  oracleOn, onPowerToggle,
}) {
  const diceValues = dice.map(d => d.value);
  const [openTip,  setOpenTip]  = useState(null);
  const [tipPos,   setTipPos]   = useState(null);
  const panelRef = useRef(null);

  const result = useMemo(() => {
    if (!hasRolled || isGameOver) return null;
    // Compute turnsRemaining here so Oracle has full game-state context
    const filledCells = Object.values(scorecard).reduce(
      (n, cols) => n + cols.filter(s => s !== null).length, 0,
    );
    const turnsRemaining = 28 - filledCells;
    return recommend({ currentDice: diceValues, rollsRemaining: rollsLeft, scorecard, turnsRemaining });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceValues.join(','), rollsLeft, scorecard, hasRolled, isGameOver]);

  useEffect(() => { setOpenTip(null); setTipPos(null); }, [result]);

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

  function toggleTip(i, e) {
    if (openTip === i) {
      setOpenTip(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTipPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setOpenTip(i);
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

  if (!oracleOn) {
    return (
      <aside className="oracle" ref={panelRef}>
        <div className="oracle__header">
          <h2 className="oracle__title oracle__title--off">The Oracle is turned off.</h2>
          <button className="oracle__power-btn" onClick={onPowerToggle}>
            Turn on
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="oracle" ref={panelRef}>
      <div className="oracle__header">
        <h2 className="oracle__title">The Oracle suggests</h2>
        {!isOpen && result?.actions?.length > 0 && (
          <span className="oracle__top-hint" aria-hidden="true">
            {result.actions[0].description}
          </span>
        )}
        <button
          className="oracle__toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          title={isOpen ? 'Hide Oracle' : 'Show Oracle'}
        >
          {isOpen ? 'Hide' : 'Show'}
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
                Statistically recommended actions for your current roll and scorecard,
                ranked by Big Point Incremental Value (BPIV) vs. an expected baseline roll.
              </p>
              <ol className="oracle__list">
                {result?.actions.map((action, i) => (
                  <li
                    key={i}
                    className={[
                      'oracle__item',
                      i === 0                     ? 'oracle__item--top'   : '',
                      action.type === 'SCORE_NOW' ? 'oracle__item--score' : 'oracle__item--hold',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="oracle__rank">{action.rank}</span>

                    <div className="oracle__content">
                      {/* Hide text label when dice icons are shown */}
                      {(action.type === 'SCORE_NOW' || !action.held?.length) && (
                        <span className="oracle__label">{action.description}</span>
                      )}
                      {action.type === 'SCORE_NOW' ? (
                        <span className="oracle__detail">{action.smallPoints} pts</span>
                      ) : action.held?.length > 0 ? (
                        <div className="oracle__held-dice">
                          {action.held.map((v, di) => (
                            <DiceFace
                              key={di}
                              value={v}
                              size={23}
                              strokeWidth={3}
                              dieIndex={action.rank * 10 + di}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <span className={bpivClass(action.bpiv)} title="Big Point Incremental Value">
                      {formatBpiv(action.bpiv)}
                    </span>

                    <div className="oracle__tip-wrap">
                      <button
                        className={`oracle__info-btn ${openTip === i ? 'oracle__info-btn--active' : ''}`}
                        onClick={(e) => toggleTip(i, e)}
                        aria-label="More information"
                        aria-expanded={openTip === i}
                      >
                        i
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="oracle__footer">
            <button
              className="oracle__power-btn oracle__power-btn--off"
              onClick={onPowerToggle}
            >
              Turn off Oracle
            </button>
          </div>
        </div>
      )}

      {/* Tooltip rendered outside list flow; position: fixed escapes overflow:hidden */}
      {openTip !== null && tipPos && result && (
        <div
          className="oracle__tooltip"
          role="tooltip"
          style={{ top: tipPos.top, right: tipPos.right }}
        >
          {renderTooltip(result.actions[openTip])}
        </div>
      )}
    </aside>
  );
}

function renderTooltip(action) {
  if (!action) return null;

  if (action.type === 'SCORE_NOW') {
    const { categoryBigDelta, bonusBigDelta } = action.breakdown;
    return (
      <div className="oracle__tooltip-score">
        <p><strong>Small points scored:</strong> {action.smallPoints}</p>
        <p><strong>Category big pt delta:</strong> {fmt(categoryBigDelta)}</p>
        <p><strong>Bonus big pt delta:</strong> {fmt(bonusBigDelta)}</p>
        <p><strong>Total BPIV:</strong> {action.bpiv >= 0 ? '+' : ''}{action.bpiv.toFixed(2)}</p>
      </div>
    );
  }

  // REROLL tooltip — 3-column table: Result | Probability | BPIV
  const outcomes = action.tooltipOutcomes ?? [];
  return (
    <div className="oracle__tooltip-reroll">
      <p className="oracle__tooltip-header">{action.description}:</p>
      <table className="oracle__tooltip-table">
        <thead>
          <tr>
            <th className="oracle__tooltip-th">Result</th>
            <th className="oracle__tooltip-th oracle__tooltip-th--num">Prob</th>
            <th className="oracle__tooltip-th oracle__tooltip-th--num">BPIV</th>
          </tr>
        </thead>
        <tbody>
          {outcomes.map((o, i) => (
            <tr key={i}>
              <td className="oracle__tooltip-result">{o.description}</td>
              <td className="oracle__tooltip-prob">{(o.probability * 100).toFixed(1)}%</td>
              <td className={o.downstreamBpiv >= 0 ? 'oracle__tooltip-bpiv--pos' : 'oracle__tooltip-bpiv--neg'}>
                {o.downstreamBpiv >= 0 ? '+' : ''}{o.downstreamBpiv.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}
