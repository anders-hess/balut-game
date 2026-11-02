# ADR-014 — Compiled native exact Bellman accelerator (Oracle iteration 20)
**Date:** 2026-11-02. **Status:** ACCEPTED AS RESEARCH INFRASTRUCTURE, NOT PRODUCTION APPROVED.
**References:** ORACLE_NORTH_STAR.md, ORACLE_ADR_010_EXACT_TAIL_EARLY_GAME.md, ORACLE_ADR_011_SEVEN_CATEGORY_ADAPTIVE.md, ORACLE_ADR_013_EXACT_SCORECARD_TABLES.md.

## Unchanged objective
All legal actions must be compared using expected FINAL Big Points with optimal adaptive continuation through all 28 turns. Exactly solve <=7 remaining turns. Research is primarily about correct choices with 8–28 turns remaining, especially 20–28. Never present a heuristic policy as globally optimal.

## Engineering decision
Accept a **compiled native C++20 exact Bellman engine for research, offline precomputation and possible server use**. Reproduce precisely the 252 unordered dice outcomes, 210 useful held configurations, 3-roll Bellman recurrence, exact category scoring, optimal adaptive continuation and canonical state quotient already established in V18 JS. Native engine can output ALL root action Q* values, or all 252 dice × 3 cast-stage Q* values for one scorecard as a compact cached policy table. Each table applies only to the exact sufficient-statistics scorecard state for which it was computed.

An experimental JavaScript numeric state-key did not improve speed and is NOT adopted; JS runtime time was 9.20s with string keys versus 10.03s with numeric keys on a common test root. The expensive work is high-volume dice chance transitions, not state-key formatting.

## Measured v20 evidence
- **Independent exact C++ vs original JS**: 38 root tests, including 36 short-horizon roots and 2 ten-turn roots; all root action values agreed within 1e-9.
- Two full previously uncomputed ten-turn scorecards: 23,268 reconstructed actions over 252×3 dice/cast contexts matched independently computed full JavaScript V18 tables; observed maximum value difference 0.
- Full scorecard A: JS **11.714s** vs native **2.079s** (5.63x); scorecard B: JS **17.810s** vs native **2.746s** (6.49x) in same Linux/container environment.
- **Eight additional independently generated v19 ten-turn root positions** (r=0) were solved exact with native in 1.43–9.29s (mean 3.14s). A preexisting V6 provisional policy was optimal in 6/8 and WRONG in 2/8. Corrected case new-10-7 Fives→Sixes, regret avoided **0.15999557** expected Big Points; new-10-8 Choice→Full House, regret avoided **0.20587345**. Both corrected cases were independently evaluated with unchanged original JS V18: all root action values matched.
- Four complete ten-turn board policy tables saved (~39,028 bytes combined), supporting **4×252×3=3,024** dice/reroll contexts, NOT 3,024 independent scorecards. Independent full-table cross-check was completed for two of those boards; remaining two were independently root-cross-checked.
- V20 new correctness tests check_native_v20, check_v20, check_v19 passed. Full inherited suite was not completed within execution budget. JS/C++ use double precision and are not formally machine-certified interval arithmetic.
- Testing 11-turn native exact with excessively large resource budget encountered an operational limit; no new 11- or 12-turn complete exact guarantee. Native binary not suitable directly for iPhone browser.

## Critical caveat about test roots
The v19 cases have SCORECARDS observed in 12 seeded complete games, but some dice were taken from a game's FIRST roll then analyzed as legal HYPOTHETICAL last-roll (r=0) decisions. They are mathematically valid decision states but not necessarily actually observed last-roll decisions.

## Development decisions
1. Develop native/offline Bellman source as a safe, bounded, reusable service; validate every output against JS on representative root and full tables.
2. Design shared substate caches and persistent exact offline computation with explicit CPU/memory budgets; prioritize realistic independent states rather than repeating known fixtures.
3. Main product problem remains 20–28-turn action correctness with all seven categories adaptive and exact 7-turn tail. V20 is computational acceleration, not a solved global opening strategy.
4. Evaluate corrected top choices, known regret, certified action fraction and device/server latency per horizon. Upper-bound reductions and average score forecast accuracy alone are not release metrics.
5. Do not modify live code or deploy native engine without user approval.

**Reproducibility:** Research code, C++ source, all tests, four native scorecard tables, and original V18/V19 engine in conversation attachment `Balut_Oracle_2_Iteration_20_Native_Exact.zip`; work branch `research/oracle-overnight-2026-11-01` stores progress and links.