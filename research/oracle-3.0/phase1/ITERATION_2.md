# Oracle 3.0 iteration 2 — production baseline adapter (2026-11-04)

Branch: research/oracle-3.0-phase1-production-baseline-2026-11-04. Base: research/oracle-3.0-phase1-simulator-2026-11-04.

## Implemented
- `production-baseline.mjs` imports the **actual production** `src/logic/oracle/index.js` `recommend` function. It converts the top-ranked SCORE_NOW/REROLL to the phase-1 headless simulator's action format.
- Exhaustive differential check for all 252 five-dice multisets × 7 categories (1,764 score checks) against `src/logic/scoring.js`, plus 28 reachable scorecard states (112 checks), and deterministic complete-game replay (2 checks). Total expected: **1,878 assertions** if successful.
- Runs actual full games with production policy; reports final Big Points mean, sample SD, approximate 95% CI, bonuses, decisions, wall time and RSS.

## Run
```sh
node research/oracle-3.0/phase1/test.mjs
node research/oracle-3.0/phase1/production-baseline.mjs 20 20261104
# Increase to 1000 or 100000 only after timing and resource assessment.
```

## Execution status
**NOT EXECUTED in this iteration.** GitHub connector permits reading/writing source but the current execution container cannot reach github.com (`git ls-remote` returned `Could not resolve host: github.com`). No local repository checkout or GitHub Actions workflow was available. Consequently **no parity pass, no production baseline mean, no latency measurement, and no AI improvement are claimed**. Source and reproduction instructions are committed; actual execution remains the immediate next gate.

## Important caveats
- Existing phase-1 simulator deliberately maps invalid patterns to zero as allowed scratches; parity audit compares against production `calculateScore(...) ?? 0`.
- No train/test leakage or neural learning in this iteration.
- Before claiming baseline, run full parity and at least a smoke set of real Oracle games, then increase evaluation with held-out seeds and CIs.
