# ADR-007 — Decision correctness, not bound tightening (Oracle 2.0)
**Date:** 2026-11-01
**Status:** ACCEPTED — clarifies ADR-001, does not replace it.
**Related:** [Oracle North Star](ORACLE_NORTH_STAR.md) and [research issue #1](https://github.com/anders-hess/balut-game/issues/1).

## Decision
The primary success criterion for Oracle is **the correctness of its recommendation**—the action that maximizes expected FINAL Big Points when all future choices are made adaptively and optimally—at **every roll of all 28 turns**, especially **20–28 turns remaining**.

A smaller admissible upper bound, better predicted end score, higher average simulated game score, or closer imitation of another model is **not** independently a success. Those are tools and diagnostics, not the objective.

## Allowed evidence categories
1. **Exact Bellman:** proven optimal-action values (within explicit numerical tolerance).
2. **Mathematically certified:** valid Q* lower/upper bounds separate the recommended action from all other legal actions.
3. **PAC global certificate:** for a candidate preselected independently, a rigorously computed lower statistical confidence bound for a **legal continuation policy's** Q^policy(s,a) exceeds the mathematically valid upper bound for **every other** action's optimal Q*(s,b). Since Q^policy ≤ Q*, this supports a *global* action conclusion with stated statistical confidence and assumptions. It is NOT a deterministic proof. Research intervals at 95% are not production-quality 99% validation.
4. **Policy-conditional evidence:** fixed-sample, independent, appropriately multiplicity-adjusted paired comparisons support one action under ONE specific future policy. This does NOT establish optimality when future decisions can improve.
5. **Inconclusive:** do not label a recommendation optimal, or silently substitute a different target; show uncertainty.

Full ranking correctness must be measured/certified **separately** from correctness of the highest-ranked action.

## Statistical protocol
- Fixed legal policy, independent pilot selection and confirmation datasets; predetermined sample counts or valid confidence-sequence alpha-spending for repeated looks.
- Account for multiple legal actions with familywise control. Use pathwise proven rewards limits; paired common-random-number trajectories reduce variance.
- Report intervals, sample counts, seed method, computation time, effective sample unit (whole game), coverage assumptions and limitation from using a suboptimal continuation policy.
- Never interpret Q^policy as Q* or claim a model's agreement with itself is exact validation.

## Iteration 13 research finding
Prototype introduced separate exact / mathematical certification / PAC / policy-conditional / inconclusive statuses; an action-level paired full-game simulator and independent fixed-sample confidence checks. At the first roll [3,3,3,6,6] (18 actions) and conflict [3,3,3,5,5] (3 investigated alternatives) results were **inconclusive**. A two-turn Balut/Choice fixture agreed with exact Bellman and passed both math and PAC tests. These do **not** prove early-game optimality or 99% global accuracy. V13 is not deployed; source and locked tests are available in ChatGPT's Balut project artifact.

## Next priorities
Work directly toward globally justified action selection, not standalone bound shrinkage: (i) widen exact/offline Bellman coverage, (ii) improve admissible action-value intervals and feasible adaptive policy to make global certification possible, (iii) variance reduction by exact current-turn integration / control variates, (iv) independent action-level evaluations including full opening states, and (v) mobile/server performance analysis.

**Change control:** Revisit the global mathematical objective or acceptable proof level only with explicit user approval.