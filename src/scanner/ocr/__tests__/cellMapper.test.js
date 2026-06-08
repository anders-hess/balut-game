import { describe, it, expect } from 'vitest';
import { mapOcrToGrid, cellsToScorecard, buildFlaggedCells } from '../cellMapper.js';
import { isInvalid } from '../../validators.js';
import { CATEGORIES, NUM_COLUMNS } from '../../../logic/gameConstants.js';

const NUM_ROWS = CATEGORIES.length; // 7
const W = NUM_COLUMNS * 100;        // 4 cols → cellW = 100
const H = NUM_ROWS * 100;           // 7 rows → cellH = 100

// Build an OCR.space-shaped response from words placed at raw (row,col) cells.
function ocr(words) {
  return {
    ParsedResults: [{
      TextOverlay: {
        Lines: [{
          Words: words.map(({ text, row, col }) => ({
            WordText: text,
            Left: col * 100 + 45, Top: row * 100 + 45, Width: 10, Height: 10,
          })),
        }],
      },
    }],
  };
}

describe('mapOcrToGrid orientation', () => {
  it('landscape: raw (row,col) maps directly to (category,player)', () => {
    const cells = mapOcrToGrid(ocr([{ text: '12', row: 0, col: 0 }]), W, H, 'landscape');
    expect(cellsToScorecard(cells).fours[0]).toBe(12);
  });

  it('portrait-r: category axis is reversed (top row → last category)', () => {
    const cells = mapOcrToGrid(ocr([
      { text: '5', row: 0, col: 0 }, // top → balut
      { text: '6', row: NUM_ROWS - 1, col: 0 }, // bottom → fours
    ]), W, H, 'portrait-r');
    const sc = cellsToScorecard(cells);
    expect(sc.balut[0]).toBe(5);
    expect(sc.fours[0]).toBe(6);
  });

  it('portrait-l: player axis is reversed (left col → last player)', () => {
    const cells = mapOcrToGrid(ocr([
      { text: '7', row: 0, col: 0 }, // left → player #4 (index 3)
    ]), W, H, 'portrait-l');
    expect(cellsToScorecard(cells).fours[NUM_COLUMNS - 1]).toBe(7);
  });
});

describe('zero markers', () => {
  it('reads "-" and "x" as a deliberate 0', () => {
    const cells = mapOcrToGrid(ocr([
      { text: '-', row: 0, col: 0 },
      { text: 'x', row: 1, col: 1 },
    ]), W, H, 'landscape');
    const sc = cellsToScorecard(cells);
    expect(sc.fours[0]).toBe(0);
    expect(sc.fives[1]).toBe(0);
  });

  it('a real number overrides a zero-marker in the same cell', () => {
    const cells = mapOcrToGrid(ocr([
      { text: '-', row: 0, col: 0 },
      { text: '8', row: 0, col: 0 },
    ]), W, H, 'landscape');
    expect(cellsToScorecard(cells).fours[0]).toBe(8);
  });
});

describe('buildFlaggedCells', () => {
  it('flags illegal value as invalid (red), legal-but-dirty token as ambiguous, missing as empty', () => {
    const cells = mapOcrToGrid(ocr([
      { text: '99',  row: 0, col: 0 }, // illegal for fours → invalid
      { text: 'l15', row: 1, col: 1 }, // stray letter, but 15 is legal for fives → ambiguous
    ]), W, H, 'landscape');

    const sc = cellsToScorecard(cells);
    expect(sc.fives[1]).toBe(15); // 'l15' parsed to 15

    const flagged = buildFlaggedCells(cells, isInvalid);
    expect(flagged['fours:0'].reason).toBe('invalid');
    expect(flagged['fives:1'].reason).toBe('ambiguous');
    expect(flagged['fours:1'].reason).toBe('empty'); // never filled
  });
});

describe('isInvalid — true per-category legality', () => {
  it('accepts only legal small-point scores (0 always allowed)', () => {
    const legal = {
      fours:     [0, 4, 8, 12, 16, 20],
      fives:     [0, 5, 10, 15, 20, 25],
      sixes:     [0, 6, 12, 18, 24, 30],
      straight:  [0, 15, 20],
      fullHouse: [0, 7, 8, 9, 28],     // achievable 3a+2b sums
      choice:    [0, 5, 17, 30],
      balut:     [0, 25, 35, 50],
    };
    for (const [cat, values] of Object.entries(legal)) {
      for (const v of values) expect(isInvalid(cat, v), `${cat}=${v} should be legal`).toBe(false);
    }
  });

  it('rejects illegal scores', () => {
    const illegal = {
      fours:     [6, 17, 21],          // not a multiple of 4 / too big
      fives:     [2, 7, 26],
      sixes:     [5, 31],
      straight:  [10, 16, 21],         // only 15 or 20
      fullHouse: [5, 6, 10, 25, 29],   // 10 and 25 are not achievable full-house sums
      choice:    [4, 31],              // min 5, max 30
      balut:     [5, 20, 26, 55],      // only 25/30/35/40/45/50
    };
    for (const [cat, values] of Object.entries(illegal)) {
      for (const v of values) expect(isInvalid(cat, v), `${cat}=${v} should be illegal`).toBe(true);
    }
  });
});
