import { bpivScoreNow } from '../src/logic/oracle/bpiv.js';
import { recommend }     from '../src/logic/oracle/index.js';

const empty = {
  fours:     [null, null, null, null],
  fives:     [null, null, null, null],
  sixes:     [null, null, null, null],
  straight:  [null, null, null, null],
  fullHouse: [null, null, null, null],
  choice:    [null, null, null, null],
  balut:     [null, null, null, null],
};

let allPass = true;
function check(label, actual, expected, op = '>=') {
  const pass = op === '>='  ? actual >= expected
             : op === '<='  ? actual <= expected
             : op === '<'   ? actual < expected
             : op === '>'   ? actual > expected
             : op === '==='  ? actual === expected
             : false;
  const mark = pass ? '✓ PASS' : '✗ FAIL';
  if (!pass) allPass = false;
  console.log(`  ${mark}  ${label}: ${typeof actual === 'number' ? actual.toFixed(4) : actual}`);
}

// ── Scenario 1: Fives=15 (empty Fives) vs Choice=24 (choice col1=23) ─────────
// Fives should win by ≥ 0.02 BPIV.
{
  const sc = { ...empty, choice: [23, null, null, null] };
  const rFives  = bpivScoreNow('fives',  [5, 5, 5, 1, 1], sc); // fives=15
  const rChoice = bpivScoreNow('choice', [5, 5, 5, 5, 4], sc); // choice=24
  console.log('\nScenario 1 — Fives=15 vs Choice=24 (choice col1=23)');
  console.log(`  fives  BPIV: ${rFives.bpiv.toFixed(4)}`);
  console.log(`  choice BPIV: ${rChoice.bpiv.toFixed(4)}`);
  check('fives BPIV > choice BPIV by ≥ 0.02', rFives.bpiv - rChoice.bpiv, 0.02);
}

// ── Scenario 2: Choice=28 vs FullHouse=28 (empty scorecard) ──────────────────
// Both should be positive.
{
  const dice = [6, 6, 6, 5, 5]; // choice=28, fullHouse=28
  const rChoice = bpivScoreNow('choice',    dice, empty);
  const rFH     = bpivScoreNow('fullHouse', dice, empty);
  console.log('\nScenario 2 — Choice=28 vs FullHouse=28 (empty)');
  console.log(`  choice    BPIV: ${rChoice.bpiv.toFixed(4)}`);
  console.log(`  fullHouse BPIV: ${rFH.bpiv.toFixed(4)}`);
  check('choice BPIV > 0', rChoice.bpiv, 0, '>');
  check('fullHouse BPIV > 0', rFH.bpiv, 0, '>');
}

// ── Scenario 3a: [6,6,6,6,5] empty — sixes BPIV is positive (24 > expected 15.4) ──
// Note: choice (score=29, mean=23.63, low variance) has higher BPIV than sixes
// on an empty scorecard — Oracle correctly prefers choice because the choice
// threshold (100) is easier to achieve (4×25=100) than sixes (4×14.4=57.6<78).
{
  const rSixes  = bpivScoreNow('sixes',  [6, 6, 6, 6, 5], empty); // 24
  const rChoice = bpivScoreNow('choice', [6, 6, 6, 6, 5], empty); // 29
  console.log('\nScenario 3a — [6,6,6,6,5] empty scorecard');
  console.log(`  sixes  BPIV: ${rSixes.bpiv.toFixed(4)}  choice BPIV: ${rChoice.bpiv.toFixed(4)}`);
  check('sixes BPIV > 0 (24 well above expected 15.4)', rSixes.bpiv, 0, '>');
  console.log('  (choice wins overall — correct: choice threshold more achievable with low variance PMF)');
}

// ── Scenario 3b: [6,6,6,6,5] sixes 3/4 filled crossing threshold ──────────────
// Sixes at currentSum=55; scoring 24 → 79 ≥ 78 (threshold crossed).
// Sixes must beat choice despite choice score also being above average.
{
  const sc = { ...empty, sixes: [20, 18, 17, null] }; // currentSum=55
  const dice = [6, 6, 6, 6, 5]; // sixes=24 → 79 crosses threshold; choice=29
  const rSixes  = bpivScoreNow('sixes',  dice, sc);
  const rChoice = bpivScoreNow('choice', dice, sc);
  console.log('\nScenario 3b — [6,6,6,6,5] sixes currentSum=55 (last column, crossing 78)');
  console.log(`  sixes  BPIV: ${rSixes.bpiv.toFixed(4)}  choice BPIV: ${rChoice.bpiv.toFixed(4)}`);
  check('sixes BPIV > choice BPIV when threshold crossed', rSixes.bpiv, rChoice.bpiv, '>');
  check('sixes BPIV > 1.5 (threshold crossing = ~2 big pts)', rSixes.bpiv, 1.5, '>');
}

// ── Scenario 4: [4,4,4,2,1] FullHouse 3/4 filled — REROLL top, score 0 < -1 ──
{
  const sc = { ...empty, fullHouse: [32, 28, 25, null] };
  const r   = recommend({ currentDice: [4, 4, 4, 2, 1], rollsRemaining: 1, scorecard: sc });
  const rFH = bpivScoreNow('fullHouse', [4, 4, 4, 2, 1], sc); // scores 0
  console.log('\nScenario 4 — [4,4,4,2,1] FH 3/4 filled, rollsRemaining=1');
  console.log(`  rank-1: ${r.actions[0].type}  score-FH=0 BPIV: ${rFH.bpiv.toFixed(4)}`);
  check('top action is REROLL', r.actions[0].type, 'REROLL', '===');
  check('scoring 0 in FH BPIV < -1', rFH.bpiv, -1, '<');
}

console.log(`\n${allPass ? '✓ All scenarios passed' : '✗ Some scenarios FAILED'}\n`);
process.exit(allPass ? 0 : 1);
