# ADR-013 — Exact scorecard turn-table reuse (iteration 18)
**Date:** 2026-11-01. **Status:** ACCEPTED FOR RESEARCH; NOT DEPLOYED.
**Binding documents:** ORACLE_NORTH_STAR.md, ADR-007, ADR-010, ADR-011.

## Objective remains unchanged
Globally maximize expected FINAL Big Points under fully adaptive optimal play across 28 turns. All seven category choices remain available in future decisions. 1–7 remaining turns: exact Bellman, no silent fallback. 8–28 remain unresolved, especially 20–28.

## Engineering decision
Cache a COMPLETE EXACT SCORECARD TURN TABLE, not only the answer to one observed dice roll. For fixed compressed scorecard s, exact computeTurn(s) already computes every category and hold action across 252 distinct unordered five-die histograms and 0/1/2 rerolls. Store compact category/small-point action values and two 210-element hold-value arrays. One offline scorecard solve thus covers 252 × 3 = 756 distinct roll contexts for that scorecard. The next scored state requires a different scorecard table.

Experimental router priority: exact Bellman for 1–7 turns; precomputed exact table if available; optional bounded-time exact persistent Worker at 8/9 turns; explicitly provisional non-certified ranking if that fails. The expensive guide must not be computed before a feasible exact attempt. Persistent Worker reuses Bellman memo results; restart when memory budget is exhausted. Check archive source fingerprint and SHA256. Hash is integrity control, not proof of mathematical correctness of an untrusted archive.

## Measured v18 research results (known fixtures)
- 16 PREEXISTING independently exact-solved scorecards (11 at 8 turns; 5 at 9). Exact whole-turn tables generated in ~30.09s + ~9.53s local Node; 110,608 + 50,250 = 160,858 bytes.
- 16 × 252 × 3 = 12,096 supported dice/reroll contexts. Automated validity checks over 12,096 lookups and 195,972 resulting action values passed. Six extra full root action comparisons (two dice histograms by three reroll counts) against independent exact V4 also passed. All 16 original root action rankings match existing exact reference.
- 48 loaded table lookups: mean 0.0447ms, maximum 0.489ms local Node, excluding file load. NOT tested on iPhone.
- In these 16 known root fixtures v6 guide top action correct 14/16, exact scorecard archive 16/16. Corrects holdout-8-06 (0.0262836 expected BP regret) and holdout-8-08 (0.0020401 expected BP regret); sum 0.02832 expected BP across this known set. This is NOT generalization evidence.
- 5s exact Worker research budget solved 10/11 of selected 8-turn roots, 5/5 of selected 9-turn roots. Existing exact offline table also resolves the one Worker timeout.
- Exact score-only r=0 optimization speedup 1.09–1.46×, median 1.11×, on 5 selected roots. Memory pressure on persistent workers caused GC thrashing; a ~50k-state rollover policy avoids that during tested batches.

## Decision and limitations
Keep as a mathematically exact, reuse-oriented research subsystem, not a production Oracle. No 20–28-turn optimal opening decision has been established; 16 boards are not broad coverage. Values are Float64, not formally outward-rounded; no mobile performance tests. An upper-bound reduction or score prediction accuracy is not the goal.

## Next iteration
Prioritize batched 8–11-turn scorecard tables from realistic independent full games, actual scorecard coverage vs time/storage, server/binary format study; then a globally correctly targeted all-seven adaptive early-horizon planner with exact seven-turn boundary, evaluated on locked action-regret cases. Never silently label a fitted early guide exact.

No changes to live site or runtime code without explicit approval.