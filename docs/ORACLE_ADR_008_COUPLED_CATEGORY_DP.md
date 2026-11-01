# ADR-008 — Coupled category pattern DP and decision-focused next step
**Date:** 2026-11-01
**Status:** ACCEPTED as research architecture (NOT production implementation).
**Supersedes:** nothing. Continues [North Star](ORACLE_NORTH_STAR.md) and [ADR-007](ORACLE_DECISION_QUALITY_ADR_007.md).

## Decision
Keep expected **final Big Points under optimal adaptive continuation** as the sole mathematical target at every turn, especially 20–28 turns remaining. Do not reward iterations for tightening upper bounds alone.

Adopt **exact relaxed multi-category pattern databases** as a proof-preserving component. First group: Straight + Full House + Balut. An abstract game gives these three categories the same 28 future dice opportunities and mandatory score quotas, while assignments to the other four categories are allowed as PASS. It exactly enumerates five-dice chance outcomes and holds/rerolls. Every legal full Balut policy projects to this abstract game, so the abstract optimal reward is an admissible **upper bound for this group's Big Points**. Add independently admissible upper bounds for the disjoint other category rewards and Small Point bonus; take min with the existing v12 Lagrangian upper.

## Benchmarks (exploratory, standalone research prototype)
- Initial state global optimal-value upper: **22.6624 -> 21.8299** Big Points (no optimal policy value obtained).
- Three-category group upper: independent single-category sum **9.3805** vs exact relaxed pattern **7.7988**.
- 56 scorecard states sampled from complete simulated games, 8 each at 28/24/20/16/12/8/4 remaining turns: 41 stricter global uppers; correlated exploratory sample.
- All 252 unique opening dice histograms: all **5,880** legal action intervals narrower; mean per-action width reduction **1.2024** Big Points. **Zero** top-choice optimality certificates, zero additional actions ruled out.
- Exact regression: all **224** action-value intervals on 13 short-horizon fixtures contain their exact Bellman values; six strictly improved; 25 successor-state upper checks passed on 18 further short-horizon scorecards.
- Timings are Node on local hardware with persistent caches, **not** iPhone/Safari measurements. Ordinary Float64 proof margins are not formal outward-rounded interval arithmetic.
- Reproducible source/tests/fixture package is a downloadable attachment in the Balut ChatGPT project (Iteration 14); not merged/deployed to live code.

## Next engineering priorities (in order)
1. Build **a strong, legal category-adaptive continuation policy** and evaluate or conservatively lower-bound its expected real final Big Points. This should tighten root **action-specific lower bounds** and improve practical choice quality. Policy rollouts evaluate Q^policy, NOT Q*.
2. Implement **action-directed bounded real-time Bellman search**: exact chance integration at the current roll, persistent Bellman cache, refinement selected by root action ambiguity and expected reach/gap; stop only with valid top-choice dominance or explicit budget.
3. Extend multi-category pattern abstractions or vary partition groups only where they help **action separation**, with disjoint-reward accounting and proven admissibility.
4. Expand offline exact reference coverage through profiling and optionally native/WASM implementation; test 7–11 turns. Do not assume whole-game 28-turn exact feasibility.
5. Preserve the exact/certified/bounded/policy-conditional status taxonomy and test top-choice and full-ranking guarantees separately.

**Go/no-go:** Next iteration must report change in certified top-choice coverage and accuracy on locked exact test cases, including hard conflicting-category choices, not merely a lower upper bound. No production rollout without explicit approval.