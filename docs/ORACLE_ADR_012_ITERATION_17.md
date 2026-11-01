# ADR-012 — Oracle iteration 17: exact extension and action-level testing
**Date:** 2026-11-01. **Status:** Research, NOT approved for live deployment.

## Unchanged North Star
Maximize expected FINAL Big Points with globally optimal, adaptive decisions across all 28 turns, and rank all legal actions. <=7 turns uses exact Bellman, never silent estimated fallback. 8–28 remains unresolved, especially 20–28. Continuation may switch freely among all seven categories. See ORACLE_NORTH_STAR.md, ADR-007, ADR-010, ADR-011.

## Implemented
1. Interruptible Node Worker for optional exact 8/9-turn Bellman full-action ranking, with explicit timeout, state-budget status, and root caching. Only completed results can authorize an exact approved action.
2. Existing v6 fitted adaptive policy used provisionally for 8–28 turns; every actual future turn reconsiders all seven categories and <=7 is handled by exact Bellman. The fitted guide itself does NOT evaluate the entire early horizon with a strict exact-seven boundary.
3. Offline paired full-prefix action evaluation: a forced legal action, seven-category adaptive continuation, then exact W*(s7) at the last seven turns. Independent pilot and confirmation seeds. These results are policy-conditional, NOT global Q*.

## Pre-existing exact-reference fixtures
- 8 turns, 11 cases: v6 provisional correct 9/11; 1.5-second budget solved exact 3/11, correcting no errors; 5-second budget solved 10/11, correcting one action (case holdout-8-06, hold 000010 to optimal hold 000200, regret avoided 0.0262836 expected Big Points). One error (holdout-8-08) remained provisional.
- 9 turns, 5 cases: research 9-second budget solved all 5 cases exactly (1.41–2.68 seconds), all provisional choices were already correct. Selected cases, not representative of all possible states.

## New locked 24 paired complete games
- V17 strict exact7 mean 8.250; V16 strict exact7 mean 7.542; original V6 fitted mean 8.208 Big Points.
- Paired V17−V16 = +0.708 (approximate t95% [-0.227,+1.644]); V17−V6 = +0.042 (approximate t95% [-0.154,+0.238]); NO statistically proven improvement.
- 479 actual exact-seven decisions, zero budget failures. Node full-game average 1.09 seconds and p95 2.02 seconds (NOT per-recommendation or iPhone timings).

## Opening action studies
- Full House vs keep two sixes at 3-3-3-6-6: estimated difference +0.370 BP, approximate t95% [-1.246,+1.987].
- Full House vs keep three threes at 3-3-3-5-5: difference +0.605 BP, approximate t95% [-1.201,+2.411].
- Each has pilot n=4 and independent confirmation n=12 per action. Both inconclusive. Rigorous distribution-free simultaneous intervals much wider. ZERO globally certified opening actions.
- An original larger 12+48 plan timed out; the smaller plan was recorded and locked before successful evaluation. ~29 seconds per two-action study in local Node: unsuitable live.

## Decision
Do NOT deploy. New code, predeclared datasets, reproducible regression tests and exact-reference comparisons delivered as standalone iteration-17 ZIP in Balut project. The key practical gain is expanded exact correctness in some 8–9-turn states, NOT improved 20–28-turn play.
Next: offline/native and persistent exact 8–12-turn tables; substantive improvement of all-seven-category adaptive policy; variance-reduced early action comparisons with exact7 boundary; independent locked testing of actual decision regret and mobile performance. The target and all evidence status distinctions are non-negotiable.