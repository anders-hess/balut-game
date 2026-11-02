# ADR-019 — Reset Oracle research to mathematically verified all-28-turn decisions
**Date:** 2026-11-02. **Status:** PROPOSED RESEARCH DIRECTION; no production change.
**Controlling target:** ORACLE_NORTH_STAR.md. Objective: for every current five-dice observation at any of the 28 turns, select and rank all legal actions by true expected FINAL Big Points under globally optimal adaptive future decisions. Every future turn may select among all seven categories. <=7 remaining turns uses exact Bellman without silent approximate fallback.

## Reason for the pivot
V23/V24 policy training empirically increased realized Big Points, but cannot establish that individual early action rankings coincide with globally optimal Q*. V24 exact 8/9-turn top-choice accuracy did not improve on independent reference. V10–V15 interval development certified **zero** of 252 opening dice states and produced very wide root ranges. Further model training or marginal bound tightening is not evidence of the desired mathematical property.

## Mathematical proof objective
For every legal root action a, maintain valid action-specific bounds L(s,a) <= Q*(s,a) <= U(s,a). A root action a* is mathematically certified optimal only when L(s,a*) > max_{b != a*} U(s,b), with explicit treatment of ties and rounding error. An upper bound on possible regret is max(0,max_b U(s,b)-L(s,a_selected)); use this and exact-regret tests as primary metrics. Full action ranking requires separate pairwise proofs. Strict exact real-arithmetic claims require directed rounding, rational or justified error envelopes and independent certificate verification; ordinary Float64 values alone are not a machine-checked proof.

## Two complementary solver tracks
1. **Exact structured solver:** preserve exact multinomial dice/holds dynamics. Investigate stronger quotient-state compression, threshold/dominance equivalences, symbolic dynamic programming (e.g. algebraic decision diagrams), category-factor / bonus-coupling elimination, and memory-conscious out-of-core backward induction. Quantify reachable canonical state counts and memory/time across 10–14 turns. Existing sixfold C++ speedup is useful but alone cannot remove exponential growth.
2. **Proof-directed AND/OR solver:** use valid lower bounds from exactly evaluated executable policies, valid upper bounds from explicit relaxations or Bellman-consistent value majorants, cached exact seven-turn terminal states, and selective expansion of competing current actions. Propagate full chance outcomes with their known multinomial probabilities. Expand successor nodes by their expected contribution to narrowing the root action gap; prune only with valid upper/lower dominance. Incorporate admissible information-relaxation dual or factored abstractions if proved safe. V24 is only a heuristic for expansion order, not a proof.

## Critical numerical and statistical distinction
- A feasible policy's *true exactly calculated* expected return is a deterministic lower bound. Its Monte Carlo average is NOT one, unless converted to a one-sided statistical confidence statement with stated coverage and seed assumptions.
- A statistical win-rate improvement is NOT a proof of globally optimal current decisions.
- Never mark `approvedAction` as optimal based solely on fitted Q values or paired rollout preference.

## Feasibility gates
**Gate A (reproduce):** implement one common reference and independent validator; exact Q and per-action bounds for 8–12-turn locked cases (including known V6/V24 errors). No missing legal actions or numerical containment violations.
**Gate B (structural compression):** measure reachable state growth with horizons 10,11,12,13,14 under equal compute and RAM budgets, contrasting original C++ with new exact/symbolic approaches. Report total states, wall clock, memory and whether the proposed method has real scaling benefit. No extrapolated opening feasibility claimed as observed.
**Gate C (decision proof):** prioritize independent action-specific root certificates: prove at least some top choices at a horizon not already solved by baseline (target progressively 12,16,20,28 turns), or obtain demonstrably smaller rigorously verified maximum regret at the opening. If no progress, publish honest gap and pivot methods rather than adding another model.
**Gate D (product):** >= proof or exact action ranking on encountered state within target live latency via verified precomputation/remote service where available; browser/device testing; on timeout report not certified. A strictly exact all-state 28-turn guarantee is a research feasibility question, not a promised deliverable.

## Research pointers
- Glenn, *An Optimal Strategy for Yahtzee*, exact finite-horizon dynamic programming: https://gunpowder.cs.loyola.edu/~jglenn/research/yahtzee.html
- McMahan et al., *Bounded Real-Time Dynamic Programming*: https://doi.org/10.1145/1102351.1102423
- Hoey et al., *Optimal and Approximate Stochastic Planning using Decision Diagrams*: https://www.cs.ubc.ca/tr/2000/tr-2000-05
- Brown et al., *Information Relaxations and Duality in Stochastic Dynamic Programs*: https://doi.org/10.1287/opre.1090.0796
- NIST DLMF, interval arithmetic: https://dlmf.nist.gov/3.1

## Acceptance
Do not automatically deploy or modify the live game. No new model iteration should be promoted on improved total mean score alone. Priority is provable action correctness and a credible path (or a rigorously demonstrated infeasibility limit) toward the exact all-28-turn original objective.