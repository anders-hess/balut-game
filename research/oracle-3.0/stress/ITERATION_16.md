# Iteration 16 — threshold and zero-score coverage stress (4 Nov 2026)

## Motivation
Iteration 15's verified 120 independent legal games achieved mean small points
104–184 before the final three turns; zero of those 120 game scorecards had
crossed any upper-category threshold. Its neural model had locked-test mean
native-Q regret 0.0001999 BP versus independent myopic 0.0000303 BP. These
trivial states do not test learning hard Big Points trade-offs.

## Experiment
Generate **120 newly seeded independent constructed scorecards** with
`stress-sampler.mjs`, using only valid 5-die results and the independent
Balut rules in `phase1/simulator.mjs`. Four precommitted scenarios:
near-threshold, mixed strong/zero, randomized mixed, combination-heavy.
Each complete game is 28 legal score assignments. At last 3, 2 and 1
remaining turns, take a pre-action legal scorecard and a physically possible
5-die roll. Last-three-turn root has one reroll; later roots zero rerolls.
Each root obtains full Oracle 2.0 finite-horizon Float64 Bellman Q* for all
legal actions. No old advisor, old training weights or old production
scorecard trajectories. All constructed roll sequences are **possible** but
NOT representative of their natural probability. Do not interpret results
as population performance or expected final BP.

Seeds 970600000–970600119, 72 train/24 validation/24 untouched test games.
Report threshold crossing coverage, near-tied action Q, zero-score
alternatives, and game-clustered 95% bootstrap CI for the regret of a
simple **independent mathematical immediate-score baseline**. This baseline
is a diagnostic, not a production-Oracle imitation. This iteration is a
data-coverage feasibility study, NOT a trained model or full-game head-to-head.

## Reproduce
```bash
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
node research/oracle-3.0/pure/guard.mjs
node research/oracle-3.0/stress/evaluate.mjs
```
GitHub Actions: `.github/workflows/oracle3-stress.yml`; generated artifacts:
`oracle3-stress-summary.json` and `oracle3-stress-results.json`.
No performance/proof claims until successful native run.
