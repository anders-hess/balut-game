import { CATEGORIES } from '../../logic/gameConstants.js';

const LOG_KEY  = 'scorecard_ocr_log';
const MAX_LOGS = 20;

export function appendLog(entry) {
  const existing = getLogs();
  const updated  = [
    { ...entry, timestamp: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_LOGS);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[OCR log] write failed:', e);
  }
}

export function getLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}

export function downloadLogs() {
  const blob = new Blob([JSON.stringify(getLogs(), null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `ocr-log-${Date.now()}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function buildLogEntry({ canvas, ocrResponse, cells, error }) {
  const cellResults = cells
    ? CATEGORIES.flatMap((cat, row) =>
        cells[row].map((cell, col) => ({
          category:    cat,
          column:      col,
          rawText:     cell.rawText,
          parsedValue: cell.value,
          status:
            cell.value === null ? 'no_detection' :
            cell.dirty          ? 'ambiguous'    :
            cell.zero           ? 'zero_marker'  : 'ok',
        }))
      )
    : [];

  return {
    imageSize:   canvas ? { width: canvas.width, height: canvas.height } : null,
    ocrExitCode: ocrResponse?.OCRExitCode ?? null,
    isErrored:   ocrResponse?.IsErroredOnProcessing ?? false,
    rawText:     ocrResponse?.ParsedResults?.[0]?.ParsedText ?? null,
    cellResults,
    error:       error?.message ?? null,
  };
}
