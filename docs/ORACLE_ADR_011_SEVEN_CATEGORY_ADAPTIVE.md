# ADR-011 — Seven-category adaptive continuation with strict exact 7-turn tail

**Date:** 2026-11-01
**Status:** ACCEPTED AS RESEARCH ARCHITECTURE, NOT AN APPROVED PRODUCTION ORACLE.
**References:** [North Star](ORACLE_NORTH_STAR.md), [Decision correctness](ORACLE_DECISION_QUALITY_ADR_007.md), [Exact-tail scope](ORACLE_ADR_010_EXACT_TAIL_EARLY_GAME.md).

## Binding objective
Maximize expected **final Big Points** over 28 turns with **globally optimal, fully adaptive decisions** on every future roll. Main unresolved scope remains **8–28 turns remaining**, particularly 20–28. The exact finite-horizon Bellman reference remains authoritative wherever it finishes. No approximation should be presented as globally optimal.

## New architectural decision
Any practical approximation must model a **fully legal future policy that can choose ALL SEVEN scoring categories** after seeing each dice result, not a fixed future category schedule. All 1–7-turn recommendations must use **exact Bellman**. On a computing-budget failure, return an explicit failure without silently substituting an estimated decision.

Iteration 16 proves technical feasibility of this design in a standalone research prototype:
- Base policy pi0 is a valid, fixed category-order policy with **exact expected terminal Big Point value** based on independent category-targeted dice distributions.
- A one-turn exact Bellman policy-improvement operator chooses all legal scores/holds, using pi0's exact continuation value as a **lower bound**. At every following dice decision, the resulting policy pi1 recomputes the choice among all seven categories. Standard finite-horizon policy improvement gives V(pi1) >= V(pi0); this **does not prove global optimality**.
- At seven remaining turns, exact Bellman takes over; budget failure returns no recommendation.
- Policy-conditional action evaluation simulates pi1 adaptively in 8–28-turn prefixes and substitutes **exact W*(s7)** at the seven-turn boundary. These Monte Carlo values are not global Q*(s,a), because pi1 is potentially suboptimal earlier.

## Validation and limits
- Mathematically based policy improvement was positive on **48/48** previously encountered states across 8/12/16/20/24/28 remaining turns (one-step gain +0.0878 to +0.8236 expected Big Points over pi0).
- **72 paired exploratory full games**, deliberately using heuristic tails for the policy comparison: pi0 −0.514, pi1 **8.514**, v6 **8.778** Big Points average. pi1-v6 difference −0.264 (approximate 95% CI [−0.878,+0.350]); **not** better than v6.
- **64 new, prelocked paired complete games with strict exact 7-turn tail**: pi1+exact tail **8.406**, v6 **8.750**. Paired difference −0.344 (approximate 95% t CI [−1.051,+0.363]). **64/64** games completed without exact-budget failure. 1,304 actual exact decision calls. Whole-game local Node runtime mean 0.565 s, p95 1.601 s; **not** per-request or iPhone runtime.
- **Two prelocked opening action studies (64 paired rollouts each)** replan all seven categories until optimal exact seven-turn boundary:
  - 3-3-3-6-6: hold two sixes vs record Full House: Q(policy+exact7) difference −0.300 BP, approximate simultaneous 95% interval [−0.892,+0.292], inconclusive.
  - 3-3-3-5-5: hold three threes vs record Full House: −0.020 BP, interval [−0.597,+0.558], inconclusive.
  - These DO NOT prove either opening choice optimal or establish an exact full ranking.
- Previously independently exact seven-turn fixture reproduces Bellman best value 14.5206111761. Explicit max-state=1 test returns no fallback action.
- 252 opening roll configurations compared with v6: 2 first-choice disagreements; agreement is **not** evidence of optimality.
- Float64 exact arithmetic is combinatorial exact within numeric precision, not formally certified interval arithmetic. Statistical t-based intervals are approximate and policy-conditional.

**Decision:** Keep the exact-tail router, seven-category-adaptive policy interface, and action-level exact-tail offline evaluator; do **not** deploy v16. The new policy is demonstrably legal and feasible but **does not outperform v6 on independent complete-game tests**.

## v17 priorities
1. **Optimize the adaptive 8–28-turn decision model**, not merely a fixed policy's value. Generate Q labels by re-planning across all seven categories with **exact seven-turn boundary**; use independent held-out complete-game validation and optimize actual decision regret.
2. Apply **variance reduction** (common random streams, exact current-turn chance integration, control variates) and reusable cached exact tail values to make the above action comparisons affordable.
3. Explore offline/native/persistent exact coverage for 8–11 remaining turns where viable, while preserving the strict seven-turn exact guarantee.
4. Validate across 1–7, 8–19, 20–28 turns and on mobile hardware; distinguish provisional, policy-conditional, mathematically certified and exact decisions.
5. Only approve production replacement after demonstrated improvement in verified action quality, with explicit user review. Better predicted final score or a higher simulated average alone is not a proof of Q* correctness.

**Persistent decision:** Every future Oracle proposal must preserve full seven-category adaptation in its continuation strategy, exact 1–7 turn handling, and the optimal-adaptive Big Points mathematical target.
