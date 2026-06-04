import { CATEGORIES, NUM_COLUMNS } from '../../logic/gameConstants.js';

const NUM_ROWS = CATEGORIES.length;

// Tokens people write to mean a deliberate zero ("skipped / scratched" a cell):
// a dash (any variant) or an x/×. Matched on the whole trimmed token so a stray
// digit is never swallowed. Kept tight so OCR noise (stray dots) isn't read as 0.
const ZERO_MARKER = /^[-–—xX×]+$/;

/**
 * Map OCR.space word bounding-boxes to a NUM_ROWS × NUM_COLUMNS grid of cells.
 *
 * The captured canvas is always rotated to the canonical "landscape" shape before
 * OCR (categories run top→bottom, players left→right). The portrait capture modes
 * rotate the crop in opposite directions, which reverses one axis of the result —
 * `orientation` tells us which axis to flip back so the labelled 4s/#1 top-left
 * corner always maps to fours / player #1.
 *
 * @param {object} ocrResponse  Raw OCR.space API response
 * @param {number} imageWidth   Width of the OCR'd canvas (px)
 * @param {number} imageHeight  Height of the OCR'd canvas (px)
 * @param {string} orientation  'landscape' | 'portrait-r' | 'portrait-l'
 */
export function mapOcrToGrid(ocrResponse, imageWidth, imageHeight, orientation = 'landscape') {
  const cellW = imageWidth  / NUM_COLUMNS;
  const cellH = imageHeight / NUM_ROWS;

  // value: number|null, dirty: token needed non-digit cleanup, zero: came from a marker
  const cells = Array.from({ length: NUM_ROWS }, () =>
    Array.from({ length: NUM_COLUMNS }, () => ({ value: null, rawText: '', dirty: false, zero: false }))
  );

  const lines = ocrResponse?.ParsedResults?.[0]?.TextOverlay?.Lines ?? [];

  for (const line of lines) {
    for (const word of line.Words ?? []) {
      const text = (word.WordText ?? '').trim();
      if (!text) continue;

      const cx = (word.Left ?? 0) + (word.Width  ?? 0) / 2;
      const cy = (word.Top  ?? 0) + (word.Height ?? 0) / 2;

      const rawRow = Math.floor(cy / cellH);
      const rawCol = Math.floor(cx / cellW);
      if (rawCol < 0 || rawCol >= NUM_COLUMNS || rawRow < 0 || rawRow >= NUM_ROWS) continue;

      // Undo the per-orientation axis reversal introduced by the crop rotation.
      const row = orientation === 'portrait-r' ? (NUM_ROWS - 1) - rawRow : rawRow;
      const col = orientation === 'portrait-l' ? (NUM_COLUMNS - 1) - rawCol : rawCol;

      // Parse the token: a deliberate zero-marker, or digits.
      let numeric, isZeroMarker = false, dirty = false;
      if (ZERO_MARKER.test(text)) {
        numeric = 0;
        isZeroMarker = true;
      } else {
        const digits = text.replace(/[^0-9]/g, '');
        numeric = digits === '' ? null : parseInt(digits, 10);
        dirty = numeric !== null && digits !== text; // had stray non-digit characters
      }
      if (numeric === null) continue;

      // Precedence per cell: a real number beats a zero-marker beats empty; first wins on ties.
      const current = cells[row][col];
      const incomingIsReal = !isZeroMarker;
      const cellIsEmpty    = current.value === null;
      const replace =
        cellIsEmpty ||
        (incomingIsReal && current.zero); // upgrade a marker-zero to a real reading
      if (replace) {
        cells[row][col] = { value: numeric, rawText: text, dirty, zero: isZeroMarker };
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

/**
 * Flag cells for review. OCR.space's handwriting engine returns no reliable
 * per-character confidence, so we flag on real signals instead:
 *   - reason 'invalid'   → RED   (out of range / impossible) — blocks Confirm
 *   - reason 'ambiguous' → YELLOW (token needed cleanup) — informational
 *   - reason 'empty'     → YELLOW (OCR found nothing) — informational
 */
export function buildFlaggedCells(cells, isInvalidFn) {
  const flagged = {};
  CATEGORIES.forEach((cat, row) => {
    cells[row].forEach((cell, col) => {
      let reason = null;
      if (isInvalidFn(cat, cell.value)) reason = 'invalid';
      else if (cell.value === null)     reason = 'empty';
      else if (cell.dirty)              reason = 'ambiguous';

      if (reason) {
        flagged[`${cat}:${col}`] = { reason, rawText: cell.rawText };
      }
    });
  });
  return flagged;
}
