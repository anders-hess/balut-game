// ─── Normal CDF ─────────────────────────────────────────────────────────────
// Abramowitz & Stegun rational approximation — max absolute error 7.5×10⁻⁸.

export function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422820 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

// ─── Dice multiset distributions ────────────────────────────────────────────
// buildDist(k) returns all distinct sorted multisets for k dice with their
// multinomial probabilities.  Reduces 6^k ordered outcomes to at most C(k+5,5)
// distinct multisets (252 for k=5, 21 for k=2, etc.).

const FACT = [1, 1, 2, 6, 24, 120];

function buildDist(k) {
  if (k === 0) return [{ values: [], prob: 1 }];
  const total = 6 ** k;
  const out = [];
  const recurse = (rem, start, curr) => {
    if (rem === 0) {
      const counts = {};
      for (const v of curr) counts[v] = (counts[v] || 0) + 1;
      let mult = FACT[k];
      for (const c of Object.values(counts)) mult /= FACT[c];
      out.push({ values: [...curr], prob: mult / total });
      return;
    }
    for (let v = start; v <= 6; v++) { curr.push(v); recurse(rem - 1, v, curr); curr.pop(); }
  };
  recurse(k, 1, []);
  return out;
}

// Pre-computed distributions for 0–5 dice (indexed by number of dice to roll).
export const DIST = Array.from({ length: 6 }, (_, k) => buildDist(k));

// ─── Hold-subset enumeration ─────────────────────────────────────────────────
// Returns all distinct sorted subsets of `dice` (including empty set, excluding
// holding all 5 dice since that is equivalent to scoring now).

export function uniqueSubsets(dice) {
  const seen = new Set();
  const out = [];
  for (let mask = 0; mask < (1 << dice.length); mask++) {
    const held = [];
    for (let i = 0; i < dice.length; i++) if (mask & (1 << i)) held.push(dice[i]);
    held.sort((a, b) => a - b);
    const key = held.join(',');
    if (!seen.has(key)) { seen.add(key); out.push(held); }
  }
  return out;
}
