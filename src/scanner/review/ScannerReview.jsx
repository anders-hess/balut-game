import { useState } from 'react';
import { CATEGORIES, CATEGORY_LABELS, NUM_COLUMNS } from '../../logic/gameConstants.js';
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

  const flagCount   = Object.keys(flaggedCells).length;
  const filledCount = CATEGORIES.reduce((n, cat) => n + edited[cat].filter(v => v !== null).length, 0);

  return (
    <div className="review-screen">
      <header className="review-header">
        <h1 className="review-title">Review Scan</h1>
        {flagCount > 0
          ? <p className="review-warning">{flagCount} cell{flagCount > 1 ? 's' : ''} flagged — check highlighted cells.</p>
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
                  const isFlagged = !!flaggedCells[key];
                  const isEditing = editing === key;
                  const value     = edited[cat][col];
                  return (
                    <td
                      key={col}
                      className={[
                        'rtd-cell',
                        isFlagged  ? 'rtd-cell--flagged' : '',
                        isEditing  ? 'rtd-cell--editing' : '',
                        value === null ? 'rtd-cell--empty' : 'rtd-cell--filled',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setEditing(key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setEditing(key)}
                      title={isFlagged ? `Flagged (raw: "${flaggedCells[key].rawText || '—'}")` : 'Tap to edit'}
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
                          {isFlagged && !isEditing && <span className="rtd-cell__flag" aria-label="flagged">⚠</span>}
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
          <button className="review-btn review-btn--primary" onClick={() => onConfirm(edited)}>
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
