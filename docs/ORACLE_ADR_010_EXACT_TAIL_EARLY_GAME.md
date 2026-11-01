# ADR-010 — Exact tail and real-time optimization focus

**Date:** 2026-11-01
**Status:** ACCEPTED
**Related:** [North Star](ORACLE_NORTH_STAR.md), [Decision correctness](ORACLE_DECISION_QUALITY_ADR_007.md), [Adaptive bound](ORACLE_ADR_009_ADAPTIVE_POLICY_LOWER.md).

## Binding clarification
**Primary unresolved engineering task: deliver the best mathematically and statistically justified actions with 8–28 turns remaining under a practical LIVE response-time budget.** The main research focus is especially **20–28 remaining turns**, where future flexibility matters most.

**1–7 remaining turns:** Use the existing **exact Bellman solver** as the primary and authoritative decision engine. No separate fitted/Monte Carlo recommendation policy should replace it. Claims of *always* finishing live must still pass comprehensive runtime and memory tests on the real device; until then exactness is mathematically established for completed solves, not guaranteed performance across all conceivable states. Never silently convert exact to estimated on timeout.

**8–28 remaining turns:** The mathematical objective remains expected FINAL Big Points with globally optimal adaptive future play; no alternative utility. Exactness is preferred where attainable. Otherwise a carefully labeled bounded/statistical action comparison is allowed, with exact optimization of all reached 1–7-turn tails. Avoid using v6/v9 continuation scores as though optimal.

## Engineering implications
1. Treat the exact 7-turn Bellman value function as a **terminal boundary oracle** for longer-horizon search and for evaluating legal continuation policies when the trajectory reaches the last seven turns.
2. Prioritize **action ranking and decision regret** in 8–28 turns, particularly early game, subject to compute constraints. A tighter generic upper bound is not a release criterion.
3. Explore offline computation, persistent memoization, server/native/wasm speed, and selective Bellman search to extend the exact coverage to 8, 9, 10+ when feasible.
4. Develop adaptive seven-category policy/search for the opening/midgame, with rigorous separation of exact Q*, bounded Q*, and policy-conditional estimates.
5. Benchmarks must explicitly report accuracy, certified optimal action rate, worst-case regret bound, compute time and device memory by horizon bands **1–7, 8–19, 20–28**.
6. A current-turn algorithm that performs exact dice/hold optimization with approximate future value is **not globally exact**; its label must reflect the non-exact tail.
7. No change to production Oracle without explicit approval and quality gates.

## What this supersedes
This clarifies emphasis in iterations 10–15: do **not** spend the majority of effort polishing already-exact 1–7-turn recommendations or small generic changes in upper bounds. Engineering emphasis now belongs on correct **8–28-turn decisions** and scalable computation.

## Caution
Using the exact 7-turn boundary does not itself prove the policy is optimal for 8–28. The earlier decisions and their stochastic distribution still require optimal search or careful approximation and evaluation.
