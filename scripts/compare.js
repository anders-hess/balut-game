// Before/after BPIV comparison for Oracle changes:
//   Item 1 — Turn-aware sum baselines
//   Item 2 — Calibrated ATTEMPT_FRACTION
//   Item 3 — Choice K≥2 deterministic convolution (K-1 oracle + 1 forced)
//
// Run before AND after implementing the changes to see the delta.

import { bpivScoreNow } from '../src/logic/oracle/bpiv.js';
import { recommend }     from '../src/logic/oracle/index.js';

const EMPTY = {
  fours:     [null,null,null,null], fives:     [null,null,null,null],
  sixes:     [null,null,null,null], straight:  [null,null,null,null],
  fullHouse: [null,null,null,null], choice:    [null,null,null,null],
  balut:     [null,null,null,null],
};

// Late-game scorecard: 5 cells remaining (one per category), turnsRemaining=5
const SC_LATE5 = {
  fours:     [12, 12, 12, null],
  fives:     [25, 25, 25, null],
  sixes:     [24, 24, 24, null],
  straight:  [15, 20, 15, 20],
  fullHouse: [30, 28, 25, 32],
  choice:    [26, 27, 28, null],
  balut:     [45, 45, 45, null],
};
// filled=23, turnsRemaining=5

// Mid-game: 14 cells remaining (half of all cells), turnsRemaining=14
const SC_MID14 = {
  fours:     [12, 12, null, null],
  fives:     [25, 25, null, null],
  sixes:     [24, 24, null, null],
  straight:  [15, 20, null, null],
  fullHouse: [30, 28, null, null],
  choice:    [26, 27, null, null],
  balut:     [45, 45, null, null],
};
// filled=14, turnsRemaining=14

// FH 3/4 filled
const SC_FH34 = { ...EMPTY, fullHouse: [32, 28, 25, null] };
// filled=3, turnsRemaining=25

// Straight 1/4 filled
const SC_STR14 = { ...EMPTY, straight: [15, null, null, null] };
// filled=1, turnsRemaining=27

// Choice 1 col filled (K=3 remaining after scoring another)
const SC_CH1 = { ...EMPTY, choice: [20, null, null, null] };
// filled=1, turnsRemaining=27

// Choice 2 cols filled (K=2 remaining after scoring another)
const SC_CH2 = { ...EMPTY, choice: [20, 22, null, null] };
// filled=2, turnsRemaining=26

function row(label, bpiv, extra = '') {
  const sign = bpiv > 0 ? '+' : '';
  return `  ${label.padEnd(52)}  ${sign}${bpiv.toFixed(4)}${extra}`;
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(' BPIV Comparison — capture before AND after Oracle model changes');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── Item 1: Turn-aware sum baselines ────────────────────────────────────────
// Expected changes: late-game below-baseline scores flip positive
// (baseline shrinks from flat 25.06 to ~16.8 at t=5; 10.50→7.05 for fours)
console.log('── Item 1: Turn-aware sum baselines ──────────────────────────────\n');
console.log('  Scenario                                               BPIV');
console.log('  ' + '─'.repeat(60));

const r1a = bpivScoreNow('fours',  [4,4,1,1,1], EMPTY);        // fours=8,  t=28
const r1b = bpivScoreNow('fours',  [4,4,1,1,1], SC_LATE5);     // fours=8,  t=5
const r1c = bpivScoreNow('fours',  [4,4,4,1,1], SC_LATE5);     // fours=12, t=5
const r1d = bpivScoreNow('choice', [5,4,4,3,3], EMPTY);        // choice=19, t=28
const r1e = bpivScoreNow('choice', [5,4,4,3,3], SC_LATE5);     // choice=19, t=5
const r1f = bpivScoreNow('choice', [5,5,4,4,4], SC_LATE5);     // choice=22, t=5
const r1g = bpivScoreNow('sixes',  [6,6,1,1,1], SC_LATE5);     // sixes=12,  t=5
const r1h = bpivScoreNow('fours',  [4,4,1,1,1], SC_MID14);     // fours=8,  t=14

console.log(row('fours=8,  t=28 (empty)    [expect: negative]',    r1a.bpiv));
console.log(row('fours=8,  t=5             [Item1→ sign flip]',    r1b.bpiv));
console.log(row('fours=12, t=5             [expect: positive]',    r1c.bpiv));
console.log(row('choice=19, t=28 (empty)   [expect: negative]',   r1d.bpiv));
console.log(row('choice=19, t=5            [Item1→ sign flip]',   r1e.bpiv));
console.log(row('choice=22, t=5            [Item1→ sign flip]',   r1f.bpiv));
console.log(row('sixes=12,  t=5            [Item1→ sign flip]',   r1g.bpiv));
console.log(row('fours=8,  t=14 (mid-game) [Item1→ smaller neg]', r1h.bpiv));

// ─── Item 2: ATTEMPT_FRACTION calibration ────────────────────────────────────
// Expected changes: if calibrated af < 0.35 for FH, the BPIV premium for
// scoring FH early (when turnsRemaining is still large) will decrease.
// If af > current, early FH scoring BPIV increases.
console.log('\n── Item 2: ATTEMPT_FRACTION calibration ──────────────────────────\n');
console.log('  Scenario                                               BPIV');
console.log('  ' + '─'.repeat(60));

const r2a = bpivScoreNow('fullHouse', [4,4,4,3,3], SC_FH34, 25);  // FH 3/4, tR=25
const r2b = bpivScoreNow('fullHouse', [4,4,4,3,3], SC_FH34, 10);  // FH 3/4, tR=10
const r2c = bpivScoreNow('fullHouse', [4,4,4,3,3], SC_FH34,  5);  // FH 3/4, tR=5
const r2d = bpivScoreNow('fullHouse', [4,4,4,3,3], EMPTY,   28);  // FH 0/4, tR=28
const r2e = bpivScoreNow('fullHouse', [4,4,4,3,3], EMPTY,   14);  // FH 0/4, tR=14
const r2f = bpivScoreNow('straight',  [1,2,3,4,5], SC_STR14,20);  // Str 1/4, tR=20
const r2g = bpivScoreNow('straight',  [1,2,3,4,5], SC_STR14, 8);  // Str 1/4, tR=8
const r2h = bpivScoreNow('balut',  [4,4,4,4,4], EMPTY,     28);   // Balut,  tR=28
const r2i = bpivScoreNow('balut',  [4,4,4,4,4], EMPTY,     10);   // Balut,  tR=10

console.log(row('fullHouse valid, FH 3/4, tR=25',  r2a.bpiv));
console.log(row('fullHouse valid, FH 3/4, tR=10',  r2b.bpiv));
console.log(row('fullHouse valid, FH 3/4, tR=5 ',  r2c.bpiv));
console.log(row('fullHouse valid, FH 0/4, tR=28',  r2d.bpiv));
console.log(row('fullHouse valid, FH 0/4, tR=14',  r2e.bpiv));
console.log(row('straight  valid, Str 1/4, tR=20', r2f.bpiv));
console.log(row('straight  valid, Str 1/4, tR=8 ', r2g.bpiv));
console.log(row('balut  (5×4s),   Bal 0/4, tR=28', r2h.bpiv));
console.log(row('balut  (5×4s),   Bal 0/4, tR=10', r2i.bpiv));

// ─── Item 3: Choice K≥2 deterministic convolution ────────────────────────────
// Expected changes: K=2+ cases will have different (more accurate) P(threshold).
// K=1 case should be unchanged (already uses forced PMF only).
console.log('\n── Item 3: Choice K≥2 deterministic convolution ──────────────────\n');
console.log('  Scenario                                               BPIV');
console.log('  ' + '─'.repeat(60));

const r3a = bpivScoreNow('choice', [6,5,5,5,4], EMPTY);     // choice=25, K=3 (empty)
const r3b = bpivScoreNow('choice', [5,4,4,4,4], EMPTY);     // choice=21, K=3 (empty)
const r3c = bpivScoreNow('choice', [6,6,5,5,5], SC_CH1);    // choice=27, K=2
const r3d = bpivScoreNow('choice', [5,4,4,4,3], SC_CH1);    // choice=20, K=2
const r3e = bpivScoreNow('choice', [6,6,6,5,5], SC_CH2);    // choice=28, K=1 (last)
const r3f = bpivScoreNow('choice', [5,4,4,3,3], SC_CH2);    // choice=19, K=1 (last)
// P(threshold) comparison at identical current sum
const r3g = bpivScoreNow('choice', [6,6,6,6,5], EMPTY);     // choice=29, K=3
const r3h = bpivScoreNow('choice', [6,6,6,6,5], SC_CH1);    // choice=29, K=2
const r3i = bpivScoreNow('choice', [6,6,6,6,5], SC_CH2);    // choice=29, K=1

console.log(row('choice=25, K=3 remaining (empty)',  r3a.bpiv, '  ← above baseline'));
console.log(row('choice=21, K=3 remaining (empty)',  r3b.bpiv, '  ← below baseline'));
console.log(row('choice=27, K=2 remaining (1 col)',  r3c.bpiv, '  ← K=2 affected'));
console.log(row('choice=20, K=2 remaining (1 col)',  r3d.bpiv, '  ← K=2 affected'));
console.log(row('choice=28, K=1 remaining (2 cols)', r3e.bpiv, '  ← K=1 unchanged'));
console.log(row('choice=19, K=1 remaining (2 cols)', r3f.bpiv, '  ← K=1 unchanged'));
console.log('  ─ Same score (29) at different K:');
console.log(row('choice=29, K=3', r3g.bpiv));
console.log(row('choice=29, K=2', r3h.bpiv));
console.log(row('choice=29, K=1', r3i.bpiv));

console.log('\n══════════════════════════════════════════════════════════════════\n');
