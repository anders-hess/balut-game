import { CATEGORIES, NUM_COLUMNS } from '../../logic/gameConstants.js';

const NUM_ROWS = CATEGORIES.length;

export function mapOcrToGrid(ocrResponse, imageWidth, imageHeight) {
  const cellW = imageWidth  / NUM_COLUMNS;
  const cellH = imageHeight / NUM_ROWS;

  const cells = Array.from({ length: NUM_ROWS }, () =>
    Array.from({ length: NUM_COLUMNS }, () => ({ value: null, confidence: 0, rawText: '' }))
  );

  const lines = ocrResponse?.ParsedResults?.[0]?.TextOverlay?.Lines ?? [];

  for (const line of lines) {
    for (const word of line.Words ?? []) {
      const text = (word.WordText ?? '').trim();
      if (!text) continue;

      const cx = (word.Left ?? 0) + (word.Width  ?? 0) / 2;
      const cy = (word.Top  ?? 0) + (word.Height ?? 0) / 2;

      const col = Math.floor(cx / cellW);
      const row = Math.floor(cy / cellH);
      if (col < 0 || col >= NUM_COLUMNS || row < 0 || row >= NUM_ROWS) continue;

      const digits  = text.replace(/[^0-9]/g, '');
      const numeric = digits === '' ? null : parseInt(digits, 10);
      const conf    = typeof word.Confidence === 'number' ? word.Confidence / 100 : 0.5;

      if (numeric !== null && conf >= cells[row][col].confidence) {
        cells[row][col] = { value: numeric, confidence: conf, rawText: text };
      } else if (numeric !== null && cells[row][col].value === null) {
        cells[row][col] = { value: numeric, confidence: conf, rawText: text };
      }
    }
  }

  return cells;
}

export function cellsToScorecard(cells) {
  return Object.fromEntries(
    CATEGORIES.map((cat, row) => [cat, cells[row].map(c => c.value)])
  );
}

export function buildFlaggedCells(cells, isInvalidFn) {
  const flagged = {};
  CATEGORIES.forEach((cat, row) => {
    cells[row].forEach((cell, col) => {
      const low = cell.value !== null && cell.confidence < 0.70;
      const bad = isInvalidFn(cat, cell.value);
      if (low || bad) {
        flagged[`${cat}:${col}`] = {
          confidence: cell.confidence,
          rawText: cell.rawText,
          reason: bad ? 'out_of_range' : 'low_confidence',
        };
      }
    });
  });
  return flagged;
}
