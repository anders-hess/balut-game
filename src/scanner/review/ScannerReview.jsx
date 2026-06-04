import { useState } from 'react';
import { CATEGORIES, CATEGORY_LABELS, NUM_COLUMNS } from '../../logic/gameConstants.js';
import { isInvalid } from '../validators.js';
import CellEditor from './CellEditor.jsx';
import './ScannerReview.css';

export default function ScannerReview({ scorecard, flaggedCells, onConfirm, onRescan }) {
  const [edited,  setEdited]  = useState(() => deepCopy(scorecard));
  const [editing, setEditing] = useState(null);

  function handleSave(cat, col, value) {
    setEdited(prev => ({
      ...prev,
      [cat]: prev[cat].map((v, i) => i === col ? value : v),
    }));
    setEditing(null);
  }

  // Live flag reason per cell, recomputed from the (possibly edited) value so that
  // editing a cell clears its flag. 'invalid' is red (blocking); 'empty'/'ambiguous' are yellow.
  function liveReason(cat, col) {
    const v = edited[cat][col];
    if (isInvalid(cat, v)) return 'invalid';
    if (v === null) return 'empty';
    const f = flaggedCells[`${cat}:${col}`];
    if (f?.reason === 'ambiguous' && v === scorecard[cat][col]) return 'ambiguous';
    return null;
  }

  let redCount = 0, flagCount = 0;
  CATEGORIES.forEach(cat => {
    for (let col = 0; col < NUM_COLUMNS; col++) {
      const r = liveReason(cat, col);
      if (r) flagCount++;
      if (r === 'invalid') redCount++;
    }
  });
  const hasRed      = redCount > 0;
  const filledCount = CATEGORIES.reduce((n, cat) => n + edited[cat].filter(v => v !== null).length, 0);

  return (
    <div className="review-screen">
      <header className="review-header">
        <h1 className="review-title">Review Scan</h1>
        {hasRed
          ? <p className="review-error">{redCount} cell{redCount > 1 ? 's' : ''} have an impossible value — fix the red cells to continue.</p>
          : flagCount > 0
            ? <p className="review-warning">{flagCount} cell{flagCount > 1 ? 's' : ''} flagged — check highlighted cells, then confirm.</p>
            : <p className="review-ok">All cells look good. Confirm or tap any cell to edit.</p>
        }
      </header>

      <div className="review-scroll">
        <table className="review-table">
          <thead>
            <tr>
              <th className="rth-cat">Category</th>
              {Array.from({ length: NUM_COLUMNS }, (_, i) => (
                <th key={i} className="rth-col">#{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat} className="review-row">
                <td className="rtd-cat">{CATEGORY_LABELS[cat]}</td>
                {Array.from({ length: NUM_COLUMNS }, (_, col) => {
                  const key       = `${cat}:${col}`;
                  const reason    = liveReason(cat, col);
                  const isEditing = editing === key;
                  const value     = edited[cat][col];
                  const rawText   = flaggedCells[key]?.rawText;
                  return (
                    <td
                      key={col}
                      className={[
                        'rtd-cell',
                        reason === 'invalid' ? 'rtd-cell--red' : '',
                        (reason === 'empty' || reason === 'ambiguous') ? 'rtd-cell--flagged' : '',
                        isEditing  ? 'rtd-cell--editing' : '',
                        value === null ? 'rtd-cell--empty' : 'rtd-cell--filled',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setEditing(key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setEditing(key)}
                      title={
                        reason === 'invalid'   ? `Impossible value for ${CATEGORY_LABELS[cat]} — tap to fix (raw: "${rawText || '—'}")` :
                        reason === 'ambiguous' ? `Uncertain reading — tap to check (raw: "${rawText || '—'}")` :
                        reason === 'empty'     ? 'No value detected — tap to enter' :
                        'Tap to edit'
                      }
                    >
                      {isEditing ? (
                        <CellEditor
                          initialValue={value}
                          onSave={v => handleSave(cat, col, v)}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <>
                          <span className="rtd-cell__val">{value !== null ? value : '—'}</span>
                          {reason && !isEditing && (
                            <span className="rtd-cell__flag" aria-label="flagged">
                              {reason === 'invalid' ? '⛔' : '⚠'}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="review-footer">
        <span className="review-footer__count">{filledCount} / 28 cells filled</span>
        <div className="review-footer__btns">
          <button className="review-btn" onClick={onRescan}>Re-scan</button>
          <button
            className="review-btn review-btn--primary"
            onClick={() => onConfirm(edited)}
            disabled={hasRed}
            title={hasRed ? 'Fix the red cells to continue.' : undefined}
          >
            Confirm Scorecard
          </button>
        </div>
      </footer>
    </div>
  );
}

function deepCopy(sc) {
  return Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, [...v]]));
}
