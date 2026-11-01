# The Oracle 2.0 — North Star & Architecture Decisions
**Adopted:** 2026-11-01. **Status:** Accepted, controlling reference for every future Oracle iteration. **Document:** ADR-001.

## 1. Non-negotiable mathematical objective
Maximize **expected final Big Points** across all 28 turns, assuming **optimal adaptive decisions after every possible future dice outcome**:
`V*(s)=max_π E[R_final|s,π]`; `Q*(s,a)=E[V*(s')|s,a]`.

The engine must evaluate **every legal hold/reroll/score action after every roll**, eventually ranking all of them by `Q*`. All game stages matter, with particular attention to **20–28 remaining turns** (early game). A good immediate score, a good heuristic policy, an estimate of another policy's performance, maximum win probability, or accurate predicted final score is **not** the objective.

All 7 category scoring rules, 4 cells each, 3 roll limit, scratches, Big Point thresholds, Balut points and Small Point bonus tiers must match `src/logic/scoring.js` and `src/logic/gameConstants.js`. Current 450+ bonus continues +1 per additional 50 Small Points.

## 2. Truth levels — NEVER conflate
- **EXACT:** complete finite-horizon Bellman calculation of every relevant future choice and outcome, with stated numeric tolerance.
- **CERTIFIED:** proven lower/upper action-value bounds such that a winning action is mathematically identified: `L(a*) > max_b!=a* U(b) + numerical_margin`. Certification of top choice does not imply certification of the full order.
- **BOUNDED:** proven intervals, but no action is certified optimal. Order shown based on a specified provisional criterion, **not** the certified ranking.
- **ESTIMATED:** policy rollout, heuristic or machine-learning forecast; must be labeled and is not a proof.

Monte Carlo estimates and heuristic values are NOT rigorous upper/lower bounds. Never silently swap an exact result for an estimated answer; explicitly indicate timeouts and uncertainty.

## 3. Agreed optimization-first architecture
1. One shared rule engine, compressed Markov state and multinomial dice transition tables.
2. Exact Bellman solver is the **single mathematical reference**. Use quotient-state compression, caching, offline/batched computation, persistent tables, and consider server-side resources.
3. Build an *anytime* proof engine: lower bound from a real feasible continuation strategy; upper bound from a mathematically valid relaxation; propagate both through all legal current-roll decisions; refine ambiguous action intervals.
4. Use learned/statistical models **only as search-order guides or candidate feasible policies**, or explicitly marked fallbacks. Never replace `V*` with `V^v6` or `V^v9` as if they were the mathematical target.
5. Optimize for increasing the fraction of **provably optimal decisions at all phases**, and for reducing certified gaps where proof is not possible, not merely for improving simulated average game score.
6. All actions and their identities must be preserved; partial proof of pairwise comparisons is not proof of full ranking.

## 4. Required tests in every iteration
- Rule/regression checks versus actual game and independent reference solver.
- Every reported action interval tested to contain exact action value where reference solving is feasible.
- Separate early (20–28), middle (11–19), and late (1–10) remaining-turn measurements, including hard cross-category conflicts.
- Distinguish certified top-choice, certified full-ranking, bounded-only, and estimated.
- Record latency, memory, state count, cache reuse, timeout cases, actual platform and numeric tolerances.
- No production Oracle replacement without explicit review and approval. No performance/quality claims beyond tested evidence.

## 5. Decisions and current work
| ID | Decision | Status |
|---|---|---|
| ADR-001 | Maximize optimal-adaptive expected final Big Points across entire game. | ACCEPTED |
| ADR-002 | Return from v6–v9 imitation/calibration to optimization-first exact Bellman and proof. | ACCEPTED |
| ADR-003 | Early 20–28 remaining turns are as important as endgame. | ACCEPTED |
| ADR-004 | Use rigorously justified action intervals; never claim unsupported exactness. | ACCEPTED |
| ADR-005 | Maintain this document as permanent north star and log further changes here. | ACCEPTED |
| ADR-006 | Start with a verified feasible-policy lower bound and physical-max upper bound, then tighten via better policies, information relaxation and selective search. | EXPERIMENTAL |

**Prototype v10 status:** Bellman-propagated action intervals tested against exact solver in 10 fixtures (199 actions); a 28-turn opening runs but initial intervals are too broad to certify optimal action. This is an honest baseline, not production ready.

**Next engineering priorities:** tighter lower bound via exactly evaluated adaptive legal continuation policy; upper bound using nonanticipative information relaxations and category/turn scarcity; shared persistent exact cache and offline backward DP; budget-aware refinement based on interval overlaps; early-game certification benchmark.

**Research:** J. Glenn, *An Optimal Strategy for Yahtzee* (2006), https://gunpowder.cs.loyola.edu/~jglenn/research/optimal_yahtzee.pdf ; Brown, Smith & Sun, *Information Relaxations and Duality in Stochastic Dynamic Programs* (2010), https://pubsonline.informs.org/doi/10.1287/opre.1090.0796 .

**Change control:** Every future Oracle iteration must explicitly state whether it preserves this mathematical objective, test gates and status taxonomy. Any change to the target requires an explicit user decision and a new ADR.