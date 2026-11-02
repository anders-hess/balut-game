# ADR-016 — Iteration 22: Exact-first routing, statistically honest early decision audit

**Date:** 2026-11-02
**Status:** ACCEPTED RESEARCH GATE, NOT PRODUCTION DEPLOYMENT.
**References:** ORACLE_NORTH_STAR.md, ADR-007, ADR-010, ADR-011, ADR-014, ADR-015.

## Mathematical objective unchanged
Always seek the action maximizing expected FINAL Big Points under globally optimal adaptive continuation across 28 turns. All seven categories are available throughout future play. <=7 turns must be solved exactly, with NO silent fallback. Main open problem is action correctness at 8–28, especially 20–28.

## Implemented and tested
1. **DecisionOracleV22 (research/server Node):** <=7 exact JS Bellman only; 8–12 attempt verified native exact C++ v21 with state and wall-time cap; 13–28 clearly labeled v6 fitted provisional guide. An exact result returns complete legal action ranking; on any overrun/failure, `approvedAction=null`. Explicit timeout tests and a known 10-turn corrected case (`new-10-7` chooses Sixes, Q*=7.725152334056454 BP) passed. Not a live browser integration.
2. **Paired all-seven-adaptive early action audit:** forced root action, future V6 lookahead0 legal policy recomputes among all 7 categories at every dice decision, then **exact W*(scorecard)** when 7 turns remain. Paired common random numbers; fixed pilot/confirmation split; no early global optimality claim.
3. **Mathematically centered first stochastic event control variate:** under fair dice, E[H(d')-E(H(d')|forced action)] = 0, with inner expected H integrated across the exact dice multinomial distribution. Select control coefficient beta ONLY on pilot data, never confirmation. Both score and hold first chance transitions independently tested; Hoeffding distribution-free conservative intervals also reported (subject to ideal independent rolls and safe numerical bounds).

## Pre-locked opening audit
Protocol SHA256: `4a04356636a37db882fe92b52634191d8a97b252bbdc96238a43626ab38d3f8a`. Two opening contrasts, each 10 pilot +32 independent confirmation pairs, 2 actual follow-on paths per pair: 168 total paths, ~101.5s local Node, each with real exact 7-turn boundary.

- At dice 3-3-3-6-6, Full House minus hold two 6s: raw paired mean +0.0730 BP (normal approx95 [-0.739,+0.885]); adjusted +0.3194 ([-0.551,+1.190]). **Adjusted SE WORSENED +7.14%.** Pilot beta -4.0 did not generalize.
- At dice 3-3-3-5-5, Full House minus hold three 3s: raw +0.6361 ([-0.197,+1.469]); adjusted +0.6205 ([-0.180,+1.421]). Adjusted SE improved only 3.82%.
- Both rigorous distribution-free control-corrected intervals include zero (roughly [-21.52,+22.16] and [-17.13,+18.38]); **neither choice is statistically established under even this limited policy comparison**, and certainly no globally optimal opening decision is proved.
- Sample streams are seeded deterministic PRNG; distribution-free coverage is conditional on true independent uniform dice and numerical accuracy, not mechanically guaranteed by seeded PRNG.
- These are **two-action** studies, NOT full rankings across all legal current actions.

## Decision
**Keep only the honest exact-first routing and the optional research audit. REJECT automatic first-chance control variates as a replacement for paired rollout.** Pilot overfit and minuscule benefit do not justify time cost. No claim of improved early optimal action rate; no site changes. Source, full raw runs and exact/timeout tests: `Balut_Oracle_2_Iteration_22_Decision_Audit.zip` in Balut ChatGPT project, archive SHA256 `81bee06d88fdbe34357f56726db4f07353c669de9ec0e4063f1d9fc8c08b8213`; extracted ZIP `npm test` passed.

## Next priority
Develop a genuinely **stronger early-game all-seven-category adaptive continuation policy** through offline policy evaluation, exact-seven boundary and repeated policy improvement / lookahead; validate on new held-out whole games and 8–12-turn independent exact regret. Avoid more small upper-bound tweaks or first-roll variance tricks. Keep fitted policy values distinguished from optimal action Q*. Practical runtime/mobile integration remains a separate gate.
