import { recommend } from '../src/logic/oracle/index.js';
import { calculateScore, isGameOver, nextColumn } from '../src/logic/scoring.js';
import { createInitialScorecard } from '../src/logic/gameState.js';
import { CATEGORIES } from '../src/logic/gameConstants.js';
import {
  EXPECTED_SCORE_PER_COLUMN,
  VARIANCE_PER_COLUMN,
  P_COMPLETE_IN_3_ROLLS,
} from '../src/logic/oracle/constants.js';

// ─── Dice helpers ─────────────────────────────────────────────────────────────

function roll() { return Math.floor(Math.random() * 6) + 1; }
function rollN(n) { return Array.from({ length: n }, roll); }

// Apply a hold (multiset of values) to current dice, rerolling unmatched dice.
function applyHold(current, held) {
  const remaining = [...held];
  return current.map(d => {
    const i = remaining.indexOf(d);
    if (i !== -1) { remaining.splice(i, 1); return d; }
    return roll();
  });
}

// ─── Oracle-directed hold (middle ground) ────────────────────────────────────
// For each reroll step, calls the fast Oracle (rollsRemaining=0 → no recursive
// lookahead) to identify the best category to score in RIGHT NOW, then applies
// the category-specific hold strategy targeting that category.
//
// This correctly targets face-value categories (fours/fives/sixes) instead of
// the generic "keep ≥5" heuristic, while staying far faster than full recursion.

function oracleDirectedHold(dice, scorecard) {
  const { actions } = recommend({ currentDice: dice, rollsRemaining: 0, scorecard });
  const top = actions.find(a => a.type === 'SCORE_NOW');
  if (!top) return bestStraightHold(dice); // fallback (shouldn't occur mid-game)

  switch (top.category) {
    case 'fours':     return dice.filter(d => d === 4);
    case 'fives':     return dice.filter(d => d === 5);
    case 'sixes':     return dice.filter(d => d === 6);
    case 'choice':    return dice.filter(d => d >= 4);
    case 'straight':  return holdStraight(dice);
    case 'fullHouse': return holdFullHouse(dice);
    case 'balut':     return holdBalut(dice);
    default:          return dice.filter(d => d >= 4);
  }
}

function bestStraightHold(dice) {
  const low  = [1, 2, 3, 4, 5];
  const high = [2, 3, 4, 5, 6];
  const lowHeld  = [], highHeld = [];
  const lowSeen  = new Set(), highSeen = new Set();
  for (const d of dice) {
    if (low.includes(d)  && !lowSeen.has(d))  { lowSeen.add(d);  lowHeld.push(d); }
    if (high.includes(d) && !highSeen.has(d)) { highSeen.add(d); highHeld.push(d); }
  }
  return lowHeld.length >= highHeld.length ? lowHeld : highHeld;
}

// ─── Part 1: Oracle-directed full-game simulation ────────────────────────────
// Rerolls use oracleDirectedHold (fast Oracle at rollsRemaining=0 to pick
// target category, then category-specific hold); final score uses the same
// fast Oracle path. No recursive lookahead anywhere.

function simulateGame() {
  const scorecard = createInitialScorecard();
  const categoryScores = Object.fromEntries(CATEGORIES.map(c => [c, []]));

  while (!isGameOver(scorecard)) {
    let dice = rollN(5);

    // Two Oracle-directed rerolls (fast path: rollsRemaining=0, no recursion)
    for (let r = 0; r < 2; r++) {
      const held = oracleDirectedHold(dice, scorecard);
      dice = applyHold(dice, held);
    }

    // Oracle scores at rollsRemaining=0 → only SCORE_NOW actions returned (no recursion)
    const { actions } = recommend({ currentDice: dice, rollsRemaining: 0, scorecard });
    const top = actions.find(a => a.type === 'SCORE_NOW');
    if (!top) break; // shouldn't happen (game not over)

    const col = nextColumn(scorecard, top.category);
    if (col === -1) break;
    const score = calculateScore(top.category, dice) ?? 0;
    scorecard[top.category][col] = score;
    categoryScores[top.category].push(score);
  }

  return categoryScores;
}

function runGameSimulation(numGames) {
  const allScores = Object.fromEntries(CATEGORIES.map(c => [c, []]));
  const interval = Math.max(1, Math.floor(numGames / 10));

  for (let g = 0; g < numGames; g++) {
    if ((g + 1) % interval === 0) console.log(`  game ${g + 1}/${numGames}`);
    const gs = simulateGame();
    for (const cat of CATEGORIES) allScores[cat].push(...gs[cat]);
  }

  const results = {};
  for (const cat of CATEGORIES) {
    const scores = allScores[cat];
    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n;

    // Frequency histogram: count occurrences of each distinct score value
    const freq = {};
    for (const s of scores) freq[s] = (freq[s] || 0) + 1;
    // Normalise to probabilities
    const pmf = Object.fromEntries(
      Object.entries(freq)
        .map(([v, c]) => [Number(v), c / n])
        .sort((a, b) => a[0] - b[0])
    );

    results[cat] = { mean, variance, n, pmf };
  }
  return results;
}

// ─── Part 2: Isolated P_COMPLETE_IN_3_ROLLS ──────────────────────────────────

function holdStraight(dice) { return bestStraightHold(dice); }

function holdFullHouse(dice) {
  const counts = {};
  for (const d of dice) counts[d] = (counts[d] || 0) + 1;
  const entries = Object.entries(counts).map(([v, c]) => [Number(v), c]).sort((a, b) => b[1] - a[1]);
  const triplet = entries.find(([, c]) => c >= 3);
  const pairs   = entries.filter(([, c]) => c === 2);
  if (triplet && pairs.length > 0) return dice;
  if (triplet) { const v = triplet[0]; return dice.filter(d => d === v).slice(0, 3); }
  if (pairs.length >= 2) { const vs = new Set(pairs.map(([v]) => v)); return dice.filter(d => vs.has(d)); }
  if (pairs.length === 1) { const v = pairs[0][0]; return dice.filter(d => d === v); }
  return [];
}

function holdBalut(dice) {
  const counts = {};
  for (const d of dice) counts[d] = (counts[d] || 0) + 1;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  return dice.filter(d => d === Number(best[0]));
}

function simulatePComplete(category, numTrials) {
  const holdFn = { straight: holdStraight, fullHouse: holdFullHouse, balut: holdBalut }[category];
  let completions = 0;
  for (let t = 0; t < numTrials; t++) {
    let dice = rollN(5);
    for (let r = 0; r < 2; r++) dice = applyHold(dice, holdFn(dice));
    const score = calculateScore(category, dice);
    if (score !== null && score > 0) completions++;
  }
  return completions / numTrials;
}

// ─── Output ───────────────────────────────────────────────────────────────────

function fmt(n, d = 2) { return n.toFixed(d).padStart(8); }
function pctDelta(cur, emp) {
  const p = ((emp - cur) / Math.abs(cur)) * 100;
  return ((p >= 0 ? '+' : '') + p.toFixed(1) + '%').padStart(8);
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  console.log('  ' + 'category'.padEnd(12) + 'current'.padStart(9) + 'empirical'.padStart(10) + '  delta');
  console.log('  ' + '-'.repeat(43));
  for (const { cat, current, empirical } of rows) {
    console.log('  ' + cat.padEnd(12) + fmt(current) + fmt(empirical) + ' ' + pctDelta(current, empirical));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const NUM_GAMES  = 10_000;
const NUM_TRIALS = 100_000;

console.log(`\n=== Oracle Constants — Monte Carlo (${NUM_GAMES.toLocaleString()} games + ${NUM_TRIALS.toLocaleString()} P_complete trials) ===`);

console.log('\nRunning full-game simulation (Oracle-directed holds, Oracle scoring)...');
const t0 = Date.now();
const gameResults = runGameSimulation(NUM_GAMES);
console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

console.log('Running isolated P_complete simulation...');
const pComplete = {};
for (const cat of ['straight', 'fullHouse', 'balut']) {
  pComplete[cat] = simulatePComplete(cat, NUM_TRIALS);
}

printTable('EXPECTED_SCORE_PER_COLUMN', CATEGORIES.map(cat => ({
  cat, current: EXPECTED_SCORE_PER_COLUMN[cat], empirical: gameResults[cat].mean,
})));

printTable('VARIANCE_PER_COLUMN', CATEGORIES.map(cat => ({
  cat, current: VARIANCE_PER_COLUMN[cat], empirical: gameResults[cat].variance,
})));

printTable('P_COMPLETE_IN_3_ROLLS', ['straight', 'fullHouse', 'balut'].map(cat => ({
  cat, current: P_COMPLETE_IN_3_ROLLS[cat], empirical: pComplete[cat],
})));

// Ratio: full-game Oracle mean / constants.EXPECTED_SCORE_PER_COLUMN (should be ~1 after calibration)
const sumTypes = ['fours', 'fives', 'sixes', 'choice'];
printTable('Oracle mean / EXPECTED_SCORE_PER_COLUMN  (fixed-point check, target ≈ 1.0)', sumTypes.map(cat => ({
  cat, current: 1.0, empirical: gameResults[cat].mean / EXPECTED_SCORE_PER_COLUMN[cat],
})));

// ─── Score PMF output for distributions.js ───────────────────────────────────
const SUM_CATS = ['fours', 'fives', 'sixes', 'choice'];
console.log('\n// ─── Paste into distributions.js as SCORE_PMF ────────────────────────────');
console.log('const SCORE_PMF = {');
for (const cat of SUM_CATS) {
  const pmf = gameResults[cat].pmf;
  const entries = Object.entries(pmf).map(([v, p]) => `${v}: ${p.toFixed(6)}`).join(', ');
  console.log(`  ${cat.padEnd(10)}: { ${entries} },`);
}
console.log('};\n');

console.log('⚠  Review before updating constants.js — run npm.cmd run test first.');
console.log('   SPEC TEST 3 in integration.test.js is sensitive to fours/choice ordering.\n');

// ─── Forced-choice PMF (isolated: keep ≥4, 3 rolls, always score) ─────────────
// Models "must-score" choice: optimal hold strategy but no Oracle timing.
// Used as PMF_LOW in the two-regime mixture model in distributions.js.

console.log('Running isolated forced-choice simulation (keep ≥4, 3 rolls)...');
(function simulateForcedChoicePMF() {
  const N = 100_000;
  const freq = {};
  for (let t = 0; t < N; t++) {
    let dice = rollN(5);
    for (let r = 0; r < 2; r++) {
      const held = dice.filter(d => d >= 4);
      dice = applyHold(dice, held);
    }
    const score = calculateScore('choice', dice); // always valid
    freq[score] = (freq[score] || 0) + 1;
  }
  const mean = Object.entries(freq).reduce((s, [v, c]) => s + Number(v) * c, 0) / N;
  const pmf  = Object.fromEntries(
    Object.entries(freq).sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([v, c]) => [v, c / N])
  );
  const entries = Object.entries(pmf).map(([v, p]) => `${v}: ${p.toFixed(6)}`).join(', ');
  console.log(`  mean: ${mean.toFixed(2)}`);
  console.log('\n// ─── Paste into distributions.js as FORCED_CHOICE_PMF ────────────────────');
  console.log(`const FORCED_CHOICE_PMF = { ${entries} };`);
})();
