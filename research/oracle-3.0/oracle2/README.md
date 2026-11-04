# Iteration 12 — Oracle 2.0 exact Bellman supervision integrated into Oracle 3.0

**Research only.** Parent: `research/oracle-3.0-phase3-negative-smoke-diagnostics-2026-11-04`. No changes to `main`, production Oracle, or Oracle 2.0 research.

## Why this iteration

The verified 12-game phase-3 diagnostic (GitHub Actions [41867806939](https://github.com/anders-hess/balut-game/actions/runs/41867806939)) gave **8.083 BP production**, **0.917 BP neural expectimax**, **0.583 BP stage expectimax**. Neural-minus-production paired delta **−7.167 BP** (normal 95% CI **[−8.920, −5.413]**, n=12). This strongly argues against scaling neural training before verifying the action values.

## What was implemented

1. Vendored **byte-for-byte Oracle 2.0 v46 `exact_reachable.cpp`**, upstream Git blob SHA `4ce623ed663edffc4b1c9291f975aba778622227`, under `research/oracle-3.0/oracle2/oracle2-exact-v46.cpp`.
2. Added a **pre-first-roll exact Bellman state driver** (no changes to solver internals), plus a JS adapter converting all 7 categories, remaining quotas, threshold totals, positive Straight/Full House counts, Balut count and total Small Points into Oracle 2.0's compressed state. Action keys use the solver's 6-face dice histograms.
3. Added **differential parity tests**: 4 categories × 3 reroll budgets in the final turn, two multi-category nonlinear cases, completed-game Big Points, legal action-Q consistency and an explicit low-cap resource failure.
4. Added **exact Q and state-value label generation** from 3 seeded, full, real production-Oracle trajectories in the final 3 turns (9 roots attempted), recording solved/unsolved separately, exact per-action Q values, production/naive policy regrets, Bellman states, wall time and resource errors.
5. Added a **research-only hybrid policy** that uses the exact 2.0 Bellman action in the last 2 turns if solved, otherwise the existing production policy. Fallbacks and time are recorded, never disguised as exact.
6. Added a 4-game prospective smoke comparison (exploratory only), CI compilation, tests and artifact archiving.

## Reproduce (from repository root, Ubuntu runner with g++ and Node 22)

```bash
g++ -std=c++20 -O2 -DNDEBUG research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
g++ -std=c++20 -O2 -DNDEBUG research/oracle-3.0/oracle2/oracle2-state.cpp -o research/oracle-3.0/oracle2/oracle2-state
node research/oracle-3.0/oracle2/test.mjs
node research/oracle-3.0/oracle2/evaluate.mjs
node research/oracle-3.0/oracle2/benchmark.mjs 4
```

Outputs: `oracle3-phase4-exact-reference.json`, `oracle3-phase4-exact-summary.json`, `oracle3-phase4-hybrid.json`. GitHub Actions archives all JSON artifacts; generated numerical results are **not claimed verified until the CI job completes**. Native binaries are build outputs and are not committed.

## Methodological limitations

- Oracle 2.0 v46 solves finite-horizon Bellman values using **Float64**, subject to explicit state and time caps; it does **not** certify 20–28 turns or formal rational global optimality.
- 3 trajectory seeds and 4 hybrid games cannot demonstrate a population performance gain. The 4-game paired normal interval is descriptive only.
- Scorecard-to-state mapping uses only categories/total/positive counts, which must be checked by differential parity tests.
- The current neural model estimates `V^production`, not `V^*`. **Do not** treat its forecasts as exact Q labels or claim improved policy.
- Same seed across different policies does not imply identical dice events after policies choose different rerolls. A future robust head-to-head should use counter-based random streams per decision/chance node.
- Parent-process RSS omits peak memory of native child solver processes.

## Next gate

Wait for CI. Fix any exact-parity or runtime failure, then curate a larger solved-label dataset split by *whole games*, and compare neural Q rankings / per-action regret to Oracle 2.0 exact Q on held-out roots. Only then consider approximate policy iteration. Finally require statistically credible final Big Points improvements vs production with pre-registered seeds, confidence intervals and runtime budget.
