import { useState, useMemo, useRef, useEffect } from 'react';
import { recommend } from '../logic/oracle/index.js';
import { CATEGORIES, CATEGORY_LABELS } from '../logic/gameConstants.js';
import DiceFace from './DiceFace.jsx';
import './OracleScreen.css';

// Empty scorecard — used as default when no scorecard is configured.
const EMPTY_SCORECARD = Object.fromEntries(
  CATEGORIES.map(cat => [cat, [null, null, null, null]])
);

export default function OracleScreen({ onClose }) {
  const [dice,      setDice]      = useState([1, 1, 1, 1, 1]);
  const [rollsLeft, setRollsLeft] = useState(2);
  const [openTip,   setOpenTip]   = useState(null);
  const [tipPos,    setTipPos]    = useState(null);
  const panelRef = useRef(null);

  // TODO: Phase 2 — add manual scorecard state editor (toggle each cell).
  // TODO: Phase 3 — OCR scanner to import a physical scorecard via camera/image.
  const scorecard = EMPTY_SCORECARD;

  const result = useMemo(() =>
    recommend({ currentDice: dice, rollsRemaining: rollsLeft, scorecard }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dice.join(','), rollsLeft]
  );

  useEffect(() => { setOpenTip(null); setTipPos(null); }, [result]);

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

  function cycleDie(i) {
    setDice(prev => prev.map((v, j) => j === i ? (v % 6) + 1 : v));
  }

  function toggleTip(i, e) {
    if (openTip === i) { setOpenTip(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setTipPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setOpenTip(i);
  }

  function formatBpiv(bpiv) {
    const sign = bpiv > 0 ? '+' : '';
    return `${sign}${bpiv.toFixed(2)}`;
  }

  function bpivClass(bpiv) {
    if (bpiv > 0) return 'oracle__bpiv oracle__bpiv--positive';
    if (bpiv < 0) return 'oracle__bpiv oracle__bpiv--negative';
    return 'oracle__bpiv';
  }

  return (
    <div className="oracle-screen">
      <div className="oracle-screen__inner">

        <div className="oracle-screen__header">
          <button className="oracle-screen__back" onClick={onClose}>← Back</button>
          <div className="oracle-screen__title-wrap">
            <span className="oracle-screen__star">✦</span>
            <h1 className="oracle-screen__title">The Oracle</h1>
          </div>
          <div />
        </div>

        <p className="oracle-screen__desc">
          Set up your dice and remaining rolls, then see what The Oracle recommends.
        </p>

        <div className="oracle-screen__layout">

          {/* ── Left: inputs ── */}
          <div className="oracle-screen__inputs">

            {/* Dice */}
            <div className="oracle-screen__card">
              <h2 className="oracle-screen__card-title">Your Dice</h2>
              <p className="oracle-screen__hint">Click a die to change its value</p>
              <div className="oracle-screen__dice-tray">
                {dice.map((v, i) => (
                  <button
                    key={i}
                    className="oracle-screen__die-btn"
                    onClick={() => cycleDie(i)}
                    aria-label={`Die ${i + 1}: ${v}, click to change`}
                    title="Click to cycle value"
                  >
                    <DiceFace value={v} size={60} dieIndex={100 + i} />
                    <span className="oracle-screen__die-val">{v}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rolls remaining */}
            <div className="oracle-screen__card">
              <h2 className="oracle-screen__card-title">Rolls Remaining</h2>
              <p className="oracle-screen__hint">How many more times can you roll?</p>
              <div className="oracle-screen__rolls-group">
                {[2, 1, 0].map(r => (
                  <button
                    key={r}
                    className={`oracle-screen__rolls-btn ${rollsLeft === r ? 'oracle-screen__rolls-btn--active' : ''}`}
                    onClick={() => setRollsLeft(r)}
                  >
                    {r === 0 ? 'Must score' : r === 1 ? '1 roll left' : '2 rolls left'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scorecard (placeholder) */}
            <div className="oracle-screen__card oracle-screen__card--placeholder">
              <h2 className="oracle-screen__card-title">Scorecard</h2>
              <p className="oracle-screen__hint">
                Using an empty scorecard (first turn).
              </p>
              <div className="oracle-screen__placeholder-body">
                <span className="oracle-screen__placeholder-icon">📋</span>
                <p className="oracle-screen__placeholder-text">
                  Custom scorecard input coming soon
                </p>
                {/* TODO: Phase 2 — add per-category column editors */}
                {/* TODO: Phase 3 — OCR scanner: scan a photo of your physical
                    scorecard to populate the state automatically */}
              </div>
            </div>

          </div>

          {/* ── Right: Oracle output ── */}
          <div className="oracle-screen__output" ref={panelRef}>
            <div className="oracle-screen__card oracle-screen__card--output">
              <h2 className="oracle-screen__card-title">
                <span className="oracle-screen__star oracle-screen__star--sm">✦</span>
                Recommended Actions
              </h2>

              {result.isAllNegative && (
                <p className="oracle-screen__no-positive">
                  No positive options available — showing the least costly choices.
                </p>
              )}

              <p className="oracle-screen__oracle-intro">
                Ranked by BPIV (Big Point Incremental Value) — the expected gain vs.
                scoring an average roll in that cell.
              </p>

              <ol className="oracle__list">
                {result.actions.map((action, i) => (
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
                      {(action.type === 'SCORE_NOW' || !action.held?.length) && (
                        <span className="oracle__label">{action.description}</span>
                      )}
                      {action.type === 'SCORE_NOW' ? (
                        <span className="oracle__detail">{action.smallPoints} pts</span>
                      ) : action.held?.length > 0 ? (
                        <div className="oracle__held-dice">
                          {action.held.map((v, di) => (
                            <DiceFace key={di} value={v} size={18} dieIndex={action.rank * 10 + di} />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <span className={bpivClass(action.bpiv)} title="BPIV">
                      {formatBpiv(action.bpiv)}
                    </span>

                    <div className="oracle__tip-wrap">
                      <button
                        className={`oracle__info-btn ${openTip === i ? 'oracle__info-btn--active' : ''}`}
                        onClick={e => toggleTip(i, e)}
                        aria-label="More information"
                        aria-expanded={openTip === i}
                      >
                        i
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

        </div>
      </div>

      {/* Tooltip */}
      {openTip !== null && tipPos && (
        <div
          className="oracle__tooltip"
          role="tooltip"
          style={{ top: tipPos.top, right: tipPos.right }}
        >
          {renderTooltip(result.actions[openTip])}
        </div>
      )}
    </div>
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
