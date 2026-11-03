# Balut Oracle 2.0: measurable feasibility plan

**Date:** 2026-11-03. **Locked objective:** global optimal-adaptive expected *final Big Points*, every present legal score/hold choice, all seven categories, 28 turns. A better score forecast or narrower uncertified interval does not meet the target.

## Gate 1 — Exact Bellman scaling (THIS ITERATION, v46)

- Correct all category rules, including low Straight 15 and high Straight 20; test the new compression against the previous C++20 exact Bellman on every immediate legal score and nonredundant hold action for several 1–5-turn states.
- Prove an exact reduced state for the **remaining incremental reward** (not merely equal terminal Big Points) by potential shaping, dead categorical bonuses, dead future Small Point bonus and irrecoverably broken Straight/Full House bonuses.
- Measure baseline and new state count, run time and RAM on easy and hard 1–9-turn positions with explicit resource limits and no fallback. Include an especially hard 7-turn bonus-active card.
- **Pass:** reference equality, strict resource error instead of estimation and demonstrated state-space saving; this does *not* imply 20–28-turn feasibility.
- **Known blocker:** the 1–7-turn always-exact requirement remains unmet wherever explicit budgets are exhausted or time out. Full correctness cannot be claimed from a partial subset of 7-turn states.

## Gate 2 — Proof engine with full-game valid tight action bounds (NEXT)

- Recover the v31 seven-category quota-constrained Bellman upper bound from the stored research package and integrate its genuine per-action bounds with the v46 exact continuation engine. Ensure each upper bound contains global Q* under the true terminal reward.
- Propagate every current score and hold/reroll action using outward-rounded integer/fixed-point bounds. Refine the *largest overlapping rival upper*, not only score actions.
- Re-run the 92 frozen 10–14-turn exact Q comparisons and the unchanged 36 actual 20–28-turn roots, report valid numeric margins, pruned rival actions, the gap to strict top-choice certificate and CPU/RSS.
- **Pass for substantive progress:** at least some *nontrivial* rival actions removed at 20–28 turns, or a strong reduction in the cost to do so at fixed bounds. Mere smaller mean U is not enough.

## Gate 3 — First-round global certificate feasibility (AFTER GATE 2)

- Preselect a normal first-round dice roll and a real/locked scorecard; preserve positive category choices and all possible hold alternatives. Set explicit CPU, memory, precision and reproducibility budgets *before* evaluating.
- Use decision-directed AND/OR, exact tails and admissible dual penalties. Improve legal-policy lower and penalized-information upper only if mathematically valid for **all seven categories** and the nonlinear total Big Points reward.
- Require `L(a*) > max_{b!=a*} U(b)` with outward/integer precision, independent checker, all action identities and all source/budget metadata. Otherwise record **0 certified top actions**.

## Go/no-go criteria

- Track per-horizon exact coverage (not just a few easy instances), p50/p95/worst runtime/RSS, reuse of solved states and certification coverage.
- If Gate 2 still prunes zero ordinary early rivals, prioritize a genuinely stronger dual/information-relaxation upper rather than another small category-bonus tweak.
- If Gate 3 remains inconclusive, retain the mathematical north star but separately evaluate a near-optimal engineering product under a different, explicitly named objective. Never call it globally optimal.
- Research only; do not touch main/live without approval.