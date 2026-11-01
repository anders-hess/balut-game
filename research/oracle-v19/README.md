# Oracle 2.0 / Iteration 19 — New 10–12-turn exact decision probes

**Status:** Research only. The reproducible source and raw 36-case fixture file are bundled in the project attachment `Balut_Oracle_2_Iteration_19_Benchmark.zip`; this README is for cross-turn persistence.

## Unchanged requirements
- Maximize optimal-adaptive EXPECTED FINAL Big Points across all 28 turns.
- Exact Bellman at <=7 remaining turns with no silent fallback.
- Future early-game planning may choose ALL SEVEN categories.
- Main unresolved challenge: correctly rank actions at 8–28 turns, especially 20–28, within practical device latency.
- Do not replace live production Oracle without explicit approval.

## New benchmark (12 fresh reproducible complete games)
- 36 legal and distinct root scorecards: 12 each at 10, 11, 12 remaining turns.
- Root exact solver: unchanged v18 optimized V4 Bellman; sparse terminal-roll root when r=0.
- **Four** new 10-turn roots finished exact: r=2 in 19.28 seconds (343,449 Bellman states); r=0 in 8.84, 16.73, 6.43 seconds (148,139 / 271,344 / 126,899 states).
- V6 lookahead0 provisional top action matched exact on **4/4** of these new roots; tiny, nonrepresentative sample and no measured correction of opening choices.
- A new 11-turn r=0 case and a new 12-turn r=0 case both hit an explicit 10-second subprocess deadline; **not** counted exact and NOT considered failed decisions.
- Existing v18 exact-table, v17, v16 regression tests and new 36-position legality test pass.
- This is a performance/accuracy benchmark, NOT a demonstrably stronger 20–28-turn Oracle policy.

## Reproduction
Use the Balut project artifact `Balut_Oracle_2_Iteration_19_Benchmark.zip`, which bundles the full unchanged v18 research code plus `Oracle_18/iteration19` scripts and sample data. No production dependencies are modified.

## Overnight work status
The user's request for automated overnight follow-on iterations was **not scheduled**: automation creation returned `Your current plan allows only 5 scheduled tasks`. Existing tasks were not modified. This branch preserves concrete state for future continuation.

## Highest-priority follow-on experiments
1. Offline/native exact solving with reusable SUBSTATE caching and representative 8–12-turn memory/latency profiling.
2. Candidate-action evaluation with a truly seven-category-adaptive continuation and exact 7-turn Bellman boundary. Track decision regret and top-choice correctness on unseen independent exact positions.
3. Cache and prioritize exact results by real decision impact, not by universal board coverage; a given root need not be solvable under an arbitrary live deadline.
4. Real mobile benchmarks and explicit proof/status distinction.

This branch is NOT a production patch. See main-branch docs ORACLE_NORTH_STAR.md and ADR-010/011/013.