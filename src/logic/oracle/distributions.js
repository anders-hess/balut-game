// ─── Discrete score distributions for sum-type categories ────────────────────
// Per-column score PMFs from Oracle-directed Monte Carlo (10,000 games).
// Used by pThreshold to replace the normal-distribution approximation with an
// exact discrete convolution CDF, giving accurate big-point probabilities at
// all game stages without requiring continuous-distribution assumptions.

// Iteration 2 — 10 000 Oracle-directed games with updated constants.
const RAW_PMF = {
  fours:    { 0: 0.003425, 4: 0.069000, 8: 0.398775, 12: 0.357175, 16: 0.171525, 20: 0.000100 },
  fives:    { 0: 0.001450, 5: 0.082400, 10: 0.403375, 15: 0.338175, 20: 0.174050, 25: 0.000550 },
  sixes:    { 0: 0.002450, 6: 0.174450, 12: 0.406775, 18: 0.285800, 24: 0.129850, 30: 0.000675 },
  choice:   {
    11: 0.000025, 13: 0.000250, 14: 0.000225, 15: 0.000575, 16: 0.001975,
    17: 0.002750, 18: 0.003900, 19: 0.004775, 20: 0.005900, 21: 0.019225,
    22: 0.033750, 23: 0.115800, 24: 0.187175, 25: 0.205700, 26: 0.182225,
    27: 0.128725, 28: 0.074450, 29: 0.032450, 30: 0.000125,
  },
};

// Convert sparse {score: prob} map to a dense array indexed 0..maxScore.
function toDense(obj) {
  const maxScore = Math.max(...Object.keys(obj).map(Number));
  const arr = new Array(maxScore + 1).fill(0);
  for (const [k, v] of Object.entries(obj)) arr[Number(k)] = v;
  return arr;
}

// Discrete convolution: P(A+B = k) = Σ P(A=i)·P(B=k-i)
function convolve(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}

// CDF: cdf[x] = P(sum ≤ x)
function toCDF(pmf) {
  const cdf = new Array(pmf.length);
  let acc = 0;
  for (let i = 0; i < pmf.length; i++) {
    acc += pmf[i];
    cdf[i] = Math.min(acc, 1); // clamp floating-point drift
  }
  return cdf;
}

// SUM_CDF[cat][K] = CDF of the sum of K independent columns, K ∈ {1,2,3,4}.
// Computed once at module load time.
//
// Usage: P(sum of K columns ≥ needed) = 1 − SUM_CDF[cat][K][needed − 1]
export const SUM_CDF = {};

for (const cat of Object.keys(RAW_PMF)) {
  const base = toDense(RAW_PMF[cat]);
  SUM_CDF[cat] = {};
  let pmfK = base;
  for (let K = 1; K <= 4; K++) {
    if (K > 1) pmfK = convolve(pmfK, base);
    SUM_CDF[cat][K] = toCDF(pmfK);
  }
}

// ─── Two-regime choice model: K−1 Oracle-directed + 1 forced column ──────────
// The Oracle scores choice selectively: the first K−1 fills happen on good turns
// (score drawn from the full Oracle-directed PMF), but the final fill is forced
// (must score regardless of dice quality → isolated keep-≥4 simulation).
//
// This directly corrects the previous pure-mixture model where every column was
// treated as an i.i.d. blend — the final column always incurs a forced-fill penalty.
//
// CHOICE_MIXED_CDF[K] = CDF of sum of (K−1 oracle + 1 forced) future columns.
//   K=1: just the forced PMF         (one column, must score)
//   K=2: conv(oracle, forced)
//   K=3: conv(oracle², forced)
//   K=4: conv(oracle³, forced)

// Forced-choice PMF: isolated keep-≥4, 3 rolls, must score (100 000 trials, mean 23.13).
const FORCED_CHOICE_PMF = {
  8: 0.000010, 9: 0.000030, 10: 0.000060, 11: 0.000210, 12: 0.000720,
  13: 0.001100, 14: 0.002390, 15: 0.005070, 16: 0.009700, 17: 0.016820,
  18: 0.028730, 19: 0.044940, 20: 0.066180, 21: 0.091720, 22: 0.115960,
  23: 0.131690, 24: 0.140760, 25: 0.131020, 26: 0.103190, 27: 0.065190,
  28: 0.031440, 29: 0.010760, 30: 0.002310,
};

const _oracleDense = toDense(RAW_PMF.choice);
const _forcedDense = toDense(FORCED_CHOICE_PMF);

// Precompute oracle^0 .. oracle^3
const _oraclePow = [[1]]; // oracle^0: delta at 0
for (let k = 1; k <= 3; k++) _oraclePow.push(convolve(_oraclePow[k - 1], _oracleDense));

export const CHOICE_MIXED_CDF = {};
for (let K = 1; K <= 4; K++) {
  // K-1 oracle-directed columns + 1 forced column
  const pmfK = convolve(_oraclePow[K - 1], _forcedDense);
  CHOICE_MIXED_CDF[K] = toCDF(pmfK);
}
