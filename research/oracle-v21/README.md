# Oracle 2.0 — Iteration 21: Persistent exact Bellman substate cache

**Date:** 2026-11-02. Research-only; NO production code or strategy change. See [ADR-015](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_015_PERSISTENT_BELLMAN_SUBSTATES.md). Full C++ v21 source, unchanged v20 reference, tests, independently generated v19 cases, offline native memo snapshot, raw benchmark results and full Danish report are in the Balut ChatGPT project artifact **`Balut_Oracle_2_Iteration_21_Persistent_Exact.zip`** (2,061,367 bytes; SHA256 `22989d178d90e849604f271a01c003478e5a7a175a8b33cae1cb7a6e624cb236`).

## What changed
- Native C++ exact Bellman engine accepts repeated full-action queries in a single `--serve` process; all completed canonical W(s) memo entries are shared.
- `--save` and `--load` snapshot complete memo entries with version, checksum, atomic file rename. Trusted locally generated matching-build caches ONLY.
- Explicit per-query state budget and resident memory limit; no substitution of approximations after errors.
- All seven categories and current/future rerolls remain mathematically exact; original 28-turn optimal adaptive final Big Point objective unchanged.

## Benchmarks
- Legal nine-turn successor after a ten-turn root: cold 1,615–1,780 ms / 109,070 W states; warm ~0.04ms / ZERO new states. Loading a saved snapshot in a new process: ~0.05ms for the decision, excluding file loading.
- Two-reroll query on same ten-turn board after last-roll root: cold 3,629ms / 257,521 states, warm 1,048ms / 60,516 new states.
- Different independent ten-turn boards: only 595 states saved out of ~197k; not a universal cache solution.
- Two independent root comparisons against unmodified native V20, 480 fully tabulated score/hold Q values, corrupted-cache rejection and explicit budget-failure tests passed. Native snapshot 3,152,112 bytes (197,005 memo entries).

## Limitations and next action
**NO new 20–28-turn globally optimal action established; no superior early policy demonstrated.** Linux/container native measurements only; Float64 not machine-verified. The next experiment MUST focus on decision-level all-seven-category adaptive search with exact 7-turn terminal boundary and locked regret tests. Merely improving hit rate is insufficient for approval. There is no deployment.

Reproduction: extract the ZIP and run g++ commands and three Python test scripts from `oracle_v21/README.md`. The ZIP contains all actual source files; this GitHub document is a persistent checkpoint/index.