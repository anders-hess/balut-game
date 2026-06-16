// Turns a Gemini extraction result into the structures the existing review UI
// already understands: a NUM_ROWS × NUM_COLUMNS cells grid (same shape as the old
// cellMapper) plus the per-row Øjne sums for the live checksum. Pure + client-safe.

import { CATEGORIES, NUM_COLUMNS } from '../../logic/gameConstants.js';

const NUM_ROWS = CATEGORIES.length;

function emptyCell() {
  return { value: null, rawText: '', dirty: false, zero: false };
}

/**
 * @param {{ rows?: Array }} result  Parsed Gemini response
 * @returns {Array<Array<{value:number|null, rawText:string, dirty:boolean, zero:boolean}>>}
 */
export function resultToCells(result) {
  const cells = Array.from({ length: NUM_ROWS }, () =>
    Array.from({ length: NUM_COLUMNS }, emptyCell),
  );

  const byCategory = new Map((result?.rows ?? []).map(r => [r.category, r]));

  CATEGORIES.forEach((cat, row) => {
    const src = byCategory.get(cat);
    if (!src || !Array.isArray(src.cells)) return;

    for (let col = 0; col < NUM_COLUMNS; col++) {
      const c = src.cells[col];
      if (!c) continue;

      if (c.scratched) {
        cells[row][col] = { value: 0, rawText: 'scratched', dirty: false, zero: true };
      } else if (Number.isInteger(c.value)) {
        cells[row][col] = {
          value: c.value,
          rawText: String(c.value),
          dirty: c.confidence === 'low', // surfaced as a yellow "ambiguous" flag
          zero: false,
        };
      }
      // else: leave as empty cell (value null)
    }
  });

  return cells;
}

/**
 * Per-category Øjne (row sum) reading, for the live checksum in the review screen.
 * @returns {{ [category: string]: number|null }}
 */
export function resultToRowSums(result) {
  const byCategory = new Map((result?.rows ?? []).map(r => [r.category, r]));
  return Object.fromEntries(
    CATEGORIES.map(cat => {
      const o = byCategory.get(cat)?.ojne;
      return [cat, Number.isInteger(o) ? o : null];
    }),
  );
}
