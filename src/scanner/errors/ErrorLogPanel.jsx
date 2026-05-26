import { useState } from 'react';
import { getLogs, clearLogs, downloadLogs } from './errorLog.js';
import './ErrorLogPanel.css';

export default function ErrorLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);

  function handleOpen() { setLogs(getLogs()); setOpen(true); }

  const latest   = logs[0];
  const okCount  = latest?.cellResults?.filter(c => c.status === 'ok').length          ?? 0;
  const lowCount = latest?.cellResults?.filter(c => c.status === 'low_confidence').length ?? 0;
  const missCount= latest?.cellResults?.filter(c => c.status === 'no_detection').length  ?? 0;

  return (
    <>
      <button className="log-toggle" onClick={open ? () => setOpen(false) : handleOpen}>
        🔍 Debug log ({getLogs().length})
      </button>

      {open && (
        <div className="log-panel">
          <div className="log-panel__header">
            <span className="log-panel__title">OCR Error Log</span>
            <div className="log-panel__actions">
              <button className="log-btn" onClick={downloadLogs}>Download JSON</button>
              <button className="log-btn log-btn--danger" onClick={() => { clearLogs(); setLogs([]); }}>Clear</button>
              <button className="log-btn" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {logs.length === 0 && <p className="log-empty">No scans logged yet.</p>}

          {logs.map((entry, i) => (
            <details key={i} className="log-entry" open={i === 0}>
              <summary className="log-entry__summary">
                <span className="log-entry__ts">{entry.timestamp}</span>
                {i === 0 && (
                  <span className="log-entry__stats">
                    ✓ {okCount} · ⚠ {lowCount} · ✗ {missCount}
                    {entry.error ? ' · ERROR' : ''}
                  </span>
                )}
              </summary>
              {entry.error && <p className="log-entry__error">Error: {entry.error}</p>}
              <p className="log-entry__meta">
                Image: {entry.imageSize?.width}×{entry.imageSize?.height}px · OCR exit: {entry.ocrExitCode ?? '—'}
              </p>
              {entry.rawText && <pre className="log-entry__raw">{entry.rawText}</pre>}
              <table className="log-table">
                <thead>
                  <tr><th>Category</th><th>Col</th><th>Raw</th><th>Value</th><th>Conf</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {entry.cellResults?.map((c, j) => (
                    <tr key={j} className={`log-row log-row--${c.status}`}>
                      <td>{c.category}</td>
                      <td>{c.column + 1}</td>
                      <td className="log-raw">{c.rawText || '—'}</td>
                      <td>{c.parsedValue ?? '—'}</td>
                      <td>{c.confidence != null ? `${(c.confidence * 100).toFixed(0)}%` : '—'}</td>
                      <td>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
