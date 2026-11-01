# ADR-009 — Feasible adaptive-category block lower bound and unapproved early actions

**Date:** 2026-11-01
**Status:** ACCEPTED AS RESEARCH APPROACH; **NOT PRODUCTION APPROVED**.
**References:** [ORACLE_NORTH_STAR.md](ORACLE_NORTH_STAR.md), [ADR-007](ORACLE_DECISION_QUALITY_ADR_007.md), [ADR-008](ORACLE_ADR_008_COUPLED_CATEGORY_DP.md).

## The unchanged objective
Find and rank all legal actions by expected FINAL Big Points with globally optimal adaptive continuation through all 28 Balut turns. Particularly prioritize correctness with 20–28 turns remaining. An improved bound or a better legal partial policy is not proof of the globally best action.

## Technical decision
Adopt a constructive, mathematically admissible LOWER bound: Reserve exactly the remaining Straight, Full House and Balut score slots as a fixed block. Within that reserved block, use a complete finite-horizon 252-histogram, two-reroll Bellman solver to adaptively choose which of the three categories to score after observing each dice outcome, and to optimize holds. No PASS is allowed in the group block. Allocate the other four categories to their remaining fixed quota blocks, using either (a) a feasible threshold-optimal policy with conservative current-bonus floor, or (b) feasible max-small policies whose exact other-category small point distribution is convolved to conservatively lower-bound the final bonus.

Every such continuation is legal in the FULL Balut game, but the policy is not optimal across all seven categories. Its value is a mathematically valid lower bound. We take a max with earlier legitimate policies, and propagate through all current turn score/reroll actions via exact multinomial Bellman operations. Keep previous rigorous v14 upper unchanged.

## Quantitative v15 findings (not a proof of correct new early actions)
- For empty initial scorecard, threshold-oriented independent policy lower −1.0015 -> new group-adaptive policy lower +1.2356 expected Big Points (+2.2371).
- At 252 distinct first-roll histograms: all 5,880 legal action lower bounds increased; mean increase 1.9794 expected Big Points; mean certified worst-case regret bound 22.2266 -> 20.2368.
- 93/252 provisional top-choice actions changed. 0/252 opening top choices certified as globally optimal. Thus none of those changes can be touted as improved recommendation correctness.
- Across 18 exact endgame cases: 331/331 action intervals contained the exact Bellman action values; both v14 and v15 provisional top choices matched exact in 18/18; certified choice count was 7/18 for both.
- On 56 correlated previously reached scorecards, v15 achieved stronger feasible-policy lower bounds in all 8 cases at 28, 24 and 20 turns remaining (other phases mostly improved); NOT representative accuracy evidence.
- Extra full future turn Bellman expansion on example opening took ~7.1 seconds in local Node and did not certify its top choice. No iPhone benchmark, no formal floating-point interval arithmetic.

## Accepted engineering standards
1. Clearly separate approvedAction (exact/certified only) from provisionalAction when status=bounded_only.
2. Provisional rankings cannot be described as mathematically or statistically proven correct; preserve all action identities.
3. Keep reference exact Bellman solver authoritative and compare actions (not merely expected score predictions), with independent locked testcases.
4. The statistically estimated value of a specific feasible policy is not the unknown globally optimal value.
5. Do NOT integrate or replace the live Oracle with v15.

## Next priorities
- Break category-block restriction: develop an explicitly legal full-seven-category adaptive policy with conservative value evaluation, while not treating that policy as globally optimal.
- Offline exact coverage: improve state quotient / native compiled engine / persistent value-table computation; quantify 7–11-turn feasibility, costs and memory.
- Action-directed depth/lookahead and hybrid exact refinements to improve proven choice separation; do not optimize global bound tightness in isolation.
- Rigorous numerical safety margins/outward rounding before certification claims. All 28 turns remain in scope.

Approval threshold remains: evidence of improved correct top-choice rate and/or more certified actions under the same declared compute budget; no automatic go-live.
