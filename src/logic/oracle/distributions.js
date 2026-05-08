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

// ─── Two-regime mixture model for Choice ─────────────────────────────────────
// Each future choice column is modelled as one of two regimes:
//   HIGH (prob q):    Oracle-timed fill, score ≥ 25 (Oracle-directed PMF ≥25)
//   LOW  (prob 1−q):  Forced fill, isolated keep-≥4 simulation (mean 23.13)
//
// CHOICE_MIXED_CDF[K] = CDF of the sum of K mixture columns,
// computed as a binomial-weighted sum over all (j high, K−j low) splits.

// Forced-choice PMF: isolated keep-≥4, 3 rolls, must score (100 000 trials, mean 23.13).
const FORCED_CHOICE_PMF = {
  7: 0.000020, 8: 0.000010, 9: 0.000030, 10: 0.000070, 11: 0.000150, 12: 0.000580,
  13: 0.001350, 14: 0.002570, 15: 0.004900, 16: 0.009740, 17: 0.017780, 18: 0.028800,
  19: 0.045760, 20: 0.066000, 21: 0.089970, 22: 0.114240, 23: 0.132500, 24: 0.141750,
  25: 0.130280, 26: 0.103420, 27: 0.065300, 28: 0.031980, 29: 0.010520, 30: 0.002280,
};

// q = P(Oracle-directed choice score ≥ 25)
const _q = Object.entries(RAW_PMF.choice)
  .filter(([v]) => Number(v) >= 25)
  .reduce((s, [, p]) => s + p, 0);

// PMF_HIGH = Oracle-directed choice restricted to scores ≥ 25, renormalised.
const _pmfHighRaw = Object.fromEntries(
  Object.entries(RAW_PMF.choice)
    .filter(([v]) => Number(v) >= 25)
    .map(([v, p]) => [v, p / _q]),
);

function _binomCoeff(n, k) {
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
  return c;
}

function _pmfPowers(pmfDense, maxK) {
  const powers = [[1]];
  for (let k = 1; k <= maxK; k++) powers.push(convolve(powers[k - 1], pmfDense));
  return powers;
}

const _pmfHighDense = toDense(_pmfHighRaw);
const _pmfLowDense  = toDense(FORCED_CHOICE_PMF);
const _highPow = _pmfPowers(_pmfHighDense, 4);
const _lowPow  = _pmfPowers(_pmfLowDense,  4);

export const CHOICE_MIXED_CDF = {};
for (let K = 1; K <= 4; K++) {
  let mixedPMF = [];
  for (let j = 0; j <= K; j++) {
    const weight = _binomCoeff(K, j) * _q ** j * (1 - _q) ** (K - j);
    if (weight < 1e-15) continue;
    const pmfJKj = convolve(_highPow[j], _lowPow[K - j]);
    while (mixedPMF.length < pmfJKj.length) mixedPMF.push(0);
    for (let x = 0; x < pmfJKj.length; x++) mixedPMF[x] += weight * pmfJKj[x];
  }
  CHOICE_MIXED_CDF[K] = toCDF(mixedPMF);
}
