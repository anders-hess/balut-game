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
  it('flags out-of-range as invalid (red), dirty token as ambiguous, missing as empty', () => {
    const cells = mapOcrToGrid(ocr([
      { text: '99', row: 0, col: 0 }, // fours max 20 → invalid
      { text: 'l2', row: 1, col: 1 }, // stray letter → ambiguous, value 2
    ]), W, H, 'landscape');

    const sc = cellsToScorecard(cells);
    expect(sc.fives[1]).toBe(2); // 'l2' parsed to 2

    const flagged = buildFlaggedCells(cells, isInvalid);
    expect(flagged['fours:0'].reason).toBe('invalid');
    expect(flagged['fives:1'].reason).toBe('ambiguous');
    expect(flagged['fours:1'].reason).toBe('empty'); // never filled
  });
});
