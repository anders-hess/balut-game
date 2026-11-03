# Oracle v36 — exact-integer stochastic first-use stopping relaxation

**Date:** 2026-11-03. **Research only.** **Status:** BOUNDED, not CERTIFIED. **Globally optimal ordinary nontrivial 20–28-turn root actions proved: ZERO.** No complete optimal 28-turn Oracle.

## New mathematical result

V34–v35 allowed the rival to choose the worst future first-category dice histogram z *as if future dice were known*. V36 enforces the stochastic information structure of that first future use, including fair dice, up to two rerolls per turn, and a hard deadline dictated by remaining category quotas.

Fix candidate present score c(x), virtual rival present score d(y), and any adaptive optimal future policy of the rival. A legal counterfactual scores c now, privately simulates the rival's current rerolls, follows the rival's virtual future policy, and replaces the rival's **first future c(z)** with d(z). All seven future categories can still be adaptively chosen. For each possible first-c histogram z, the v35 joint row-bonus and terminal-small-bonus calculation supplies an integer **pathwise lower** f(c,d,y,z) on final Big Points advantage A−B.

For d != c, the rival has k_c future c slots and T−1 future turns. Its **first future c** must occur within N=T−k_c turns to leave k_c−1 subsequent c scores. It cannot know future dice in advance. Relax its feasible set by allowing it to defer c at any roll regardless of other category quotas. This is a valid nonanticipative stochastic optimal-stopping **lower relaxation**.

Define q_t as minimum expected f at first-c scoring within t turns. At a current histogram h and zero rerolls, the rival chooses between f(h) and (if t>1) q_(t−1). With one or two rerolls, it also chooses the minimum fair-dice expectation over each legal nonempty reroll. Average the resulting two-reroll value over 252 first-roll histograms with exact multiplicities to obtain q_t. Therefore for **every** virtual rival future policy, E[A−B | d(y)] >= q_N. For d=c, use the original v35 no-future-swap pathwise lower.

Present-rival score/hold/reroll actions are then upper-bounded by the maximum of −q_N and its exact current-reroll Bellman propagation. If all rival upper bounds are strictly negative, present c is globally optimal. No such ordinary early root was found. This method cannot directly prove a present hold action is optimal.

## Integer certification

All stochastic calculations use signed int64 fixed-point scale 10^10 Big Points. Each legal hold transition has exact integer weights summing to 7776. Each minimum future expectation is rounded DOWN by floor integer division, each maximum current-rival expectation is rounded UP by ceiling integer division. Integer overflow is guarded by abs(payoff) × scale × 7776 < 2^62. Thus **all present action sign tests use rigorous one-sided integer arithmetic**, not Float64. Reference exact-Q values are Float64 regression fixtures, not part of the theoretical proof.

## Actually executed

| Measure | V34 | V36 |
|---|---:|---:|
| Mean worst-possible regret upper, 36 locked actually observed 20–28-turn roots, BP | 4.3241745931 | **4.2954037404** |
| Roots improved >0.000001 BP | — | 25/36 |
| Largest reduction, BP | — | 0.2316096151 |
| Present score rivals evaluated | — | 212 |
| Present legal hold rivals evaluated | — | 716 |
| Present actions eliminated | 0 | **0** |
| Certified normal early top actions | 0 | **0** |

All seven current score candidates (14 total) were separately evaluated against every legal current score and hold rival in two observed roots (28 and 20 remaining); **0 certificates**. The 36-root benchmark evaluates the preregistered V34 best immediate-score candidate at each root, so it does not exhaust all candidates at all 36. The 36 actual traces are a frozen convenience sample, not unbiased coverage of all states. Bounds are **not actual regret**.

## Verification and reproduction

- Independent enumeration of all 7776 ordered first rolls, 4116 legal hold states and 253848 nonzero weighted hold transitions.
- Independent arbitrary-precision Fraction one-turn stopping Bellman for a nonconstant payoff function: exact 1541771/1889568 BP, enclosed by the one-sided integer implementations. Additional multi-turn brackets and 15 constant-function tests.
- 7056 future-exchange cells checked against v35's unchanged valid pathwise lower; 3928 strictly improved.
- 408/408 action difference bounds versus five immutable 10–14-turn exact Bellman roots; minimum upper-minus-exact-reference slack 1.0058197027 BP, zero violations.
- Local Linux Python benchmark: 4-root batch ~7–14 s, 7-candidate 28-turn root ~24 s, peak RSS ~157 MB. No mobile performance claim.

The branch contains the new source, independent tests, 36-root frozen summary, and benchmark runner; it inherits v34/v35 sources and compressed frozen fixtures from its parent. Requires Python 3.11+, numpy and scipy. From repository root run:

    bash research/oracle-v36/run_checks.sh
    RUN_BENCH=1 bash research/oracle-v36/run_checks.sh

**GitHub copy not executed in GitHub CI**; equivalent local code and tests were run. The standalone ZIP attached in the Balut conversation contains the locally executed full code, tests and all frozen per-action output.

## Limitation and next iteration

No normal 20–28-turn global top decision was certified, and no current score or hold was pruned. The remaining 3–6 BP gaps persist because a rival can wait many turns to obtain adverse first-c dice. Further terminal deterministic refinements are unlikely to help. Next: a **resource-constrained stochastic stopping model that tracks all k_c category scores and at least one competing category quota**, or a valid information-relaxation martingale penalty; test against unchanged 408 exact-Q action references and 36 early roots. Never promote a tighter bound as optimality.

**No live app or main changes. No 1–7-turn exact Bellman fallback changed or introduced.**
