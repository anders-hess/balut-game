import { describe, it, expect } from 'vitest';
import { selectTop5Outcomes, describeResult } from '../outcomes.js';
import { bpivRerollAllHolds as bpivRoll } from '../recursion.js';

const emptySc = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

describe('describeResult', () => {
  it('names fours/fives/sixes by count', () => {
    expect(describeResult('fours', 0)).toBe('No 4s');
    expect(describeResult('fours', 8)).toBe('Two 4s');
    expect(describeResult('fours', 12)).toBe('Three 4s');
    expect(describeResult('fours', 16)).toBe('Four 4s');
    expect(describeResult('fives', 15)).toBe('Three 5s');
    expect(describeResult('sixes', 18)).toBe('Three 6s');
    expect(describeResult('sixes', 24)).toBe('Four 6s');
  });

  it('names straight by low/high', () => {
    expect(describeResult('straight', 15)).toBe('Low Straight');
    expect(describeResult('straight', 20)).toBe('High Straight');
  });

  it('names fullHouse, choice, and balut', () => {
    expect(describeResult('fullHouse', 28)).toBe('Full House');
    expect(describeResult('choice', 27)).toBe('Choice');
    expect(describeResult('balut', 40)).toBe('Balut (4s)');   // 5×4+20=40
    expect(describeResult('balut', 50)).toBe('Balut (6s)');   // 5×6+20=50
    expect(describeResult('balut', 0)).toBe('Missed Balut');
  });
});

describe('selectTop5Outcomes', () => {
  it('returns at most 5 entries (grouped, no Other row)', () => {
    const results = bpivRoll([4, 4, 4, 1, 2], 1, emptySc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    const tooltip = selectTop5Outcomes(hold444.rawOutcomes, emptySc);
    expect(tooltip.length).toBeGreaterThan(0);
    expect(tooltip.length).toBeLessThanOrEqual(5);
  });

  it('probabilities in all rows are positive', () => {
    const results = bpivRoll([4, 4, 4, 1, 2], 1, emptySc);
    const hold444 = results.find(r => r.held.join(',') === '4,4,4');
    const tooltip = selectTop5Outcomes(hold444.rawOutcomes, emptySc);
    for (const row of tooltip) {
      expect(row.probability).toBeGreaterThan(0);
    }
  });

  it('each entry has description (string), probability, and downstreamBpiv', () => {
    const results = bpivRoll([1, 2, 3, 4, 5], 1, emptySc);
    const tooltip = selectTop5Outcomes(results[0].rawOutcomes, emptySc);
    for (const row of tooltip) {
      expect(typeof row.description).toBe('string');
      expect(typeof row.probability).toBe('number');
      expect(typeof row.downstreamBpiv).toBe('number');
    }
  });

  it('groups all choice outcomes into one "Choice" row', () => {
    // Rerolling all 5 dice will produce many choice scores, but all should group
    const results = bpivRoll([1, 1, 1, 1, 1], 1, emptySc);
    const rerollAll = results.find(r => r.held.length === 0);
    const tooltip = selectTop5Outcomes(rerollAll.rawOutcomes, emptySc);
    const choiceRows = tooltip.filter(r => r.description === 'Choice');
    expect(choiceRows.length).toBeLessThanOrEqual(1);
  });

  it('Balut appears as a top outcome when holding four 4s', () => {
    const results = bpivRoll([4, 4, 4, 4, 1], 1, emptySc);
    const hold4444 = results.find(r => r.held.join(',') === '4,4,4,4');
    const tooltip = selectTop5Outcomes(hold4444.rawOutcomes, emptySc);
    const hasBalut = tooltip.some(r => r.description.startsWith('Balut'));
    expect(hasBalut).toBe(true);
  });
});
