// Prompt + structured-output schema for the Gemini vision scorecard reader.
// Shared by the serverless function (api/scan.js), the bench harness, and the
// Vite dev middleware — keep it free of React / import.meta so every caller works.

import { CATEGORIES } from '../../logic/gameConstants.js';

// Default free-tier vision model. Override per-environment with GEMINI_MODEL.
export const DEFAULT_MODEL = 'gemini-2.5-flash';

// The card rows top→bottom, by their handwritten label, mapped to our categories.
// (4 = Fours, 5 = Fives, 6 = Sixes, S = Straight, H = Hus/Full House, C = Choice, B = Balut)
export const EXTRACTION_PROMPT = `You are reading a photograph of a handwritten Balut score card.

The card has a grid. Down the LEFT side, rows are labelled (top to bottom):
  4, 5, 6, S, H, C, B
These map to the categories: fours, fives, sixes, straight, fullHouse, choice, balut.

Each row has, from left to right:
  - exactly FOUR score columns (one per round) — the numbers you must read.
  - then an "Øjne" column = the SUM of that row's four score cells.
  - then a "Point" column (big points) — IGNORE this.
There are also legend/notes columns on the right (e.g. "min. 52 = 2p") — IGNORE all of those.

Read ONLY the four score columns plus the Øjne (row-sum) column, for all 7 rows.
There are EXACTLY four score cells per row — never read the Øjne (sum) value as a fifth
score cell, and never let a row have more than four cells.

Each category only allows specific legal values — use these to disambiguate hard-to-read
digits (e.g. a fives cell can only be a multiple of 5), but never invent a value you don't see:
  - 4 (fours):     0, 4, 8, 12, 16, or 20            (multiples of 4)
  - 5 (fives):     0, 5, 10, 15, 20, or 25           (multiples of 5)
  - 6 (sixes):     0, 6, 12, 18, 24, or 30           (multiples of 6)
  - S (straight):  0, 15, or 20 only
  - H (fullHouse): 0, or a full-house total (three of a kind + a pair), e.g. 7,8,9,11,…,28 — never 10 or 25
  - C (choice):    0, or 5 through 30
  - B (balut):     0, 25, 30, 35, 40, 45, or 50

Rules for reading each of the four score cells:
  - If the cell is blank / not played, return value null and scratched false.
  - If the cell is crossed out, struck through, or contains a slash "/", backslash, dash "-", or "x"
    (meaning the player scratched/skipped it), return value 0 and scratched true.
  - If a number was corrected or written over, return the player's FINAL intended value.
  - Otherwise return the handwritten integer you see.
  - Set confidence to "low" when the digit is hard to read or you are guessing between options,
    otherwise "high".

Use the Øjne (row sum) as a cross-check: the four score cells in a row should add up to the
Øjne value. If your reading does not add up, re-examine the digits — but still report what you
actually see (do not silently "fix" a cell to force the sum).

The photo may be rotated, tilted, or skewed in any direction — read it regardless of orientation.

Return the seven rows in this exact category order: ${CATEGORIES.join(', ')}.
Also return the Øjne value for each row (null if you cannot read it).`;

// Gemini structured-output schema (OpenAPI subset: UPPERCASE types, "nullable").
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    rows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: [...CATEGORIES] },
          cells: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                value:      { type: 'INTEGER', nullable: true },
                scratched:  { type: 'BOOLEAN' },
                confidence: { type: 'STRING', enum: ['high', 'low'] },
              },
              required: ['value', 'scratched', 'confidence'],
              propertyOrdering: ['value', 'scratched', 'confidence'],
            },
          },
          ojne: { type: 'INTEGER', nullable: true },
        },
        required: ['category', 'cells', 'ojne'],
        propertyOrdering: ['category', 'cells', 'ojne'],
      },
    },
  },
  required: ['rows'],
  propertyOrdering: ['rows'],
};
