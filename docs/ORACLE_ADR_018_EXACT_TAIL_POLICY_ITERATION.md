# ADR-018 — Exact-Bellman seven-turn boundary as on-policy training and evaluation target (Oracle iteration 24)
**Date:** 2026-11-02. **Status:** ACCEPTED RESEARCH METHOD, NOT APPROVED FOR LIVE DEPLOYMENT.
**Binding references:** ORACLE_NORTH_STAR.md, ADR-007, ADR-010, ADR-011, ADR-017.

## Unchanged mathematical objective
Maximize expected FINAL Big Points by globally optimal adaptive play throughout all 28 turns, including ability to switch among ALL SEVEN scoring categories at each future decision. Mandatory exact Bellman with <=7 remaining; research target remains correct 8–28-turn decisions, especially 20–28. An improved policy is NOT proof of globally optimal root Q*.

## Accepted new research architecture
Use an **exact Bellman W*(s7)** label, not a noisy sampled final score, to train and evaluate an adaptive early-policy prefix:
- Generate actual legal first 21 turns using V23's fully seven-category-adaptive lookahead0 policy; take the resulting scorecard S7 with exactly seven turns remaining.
- Compute W*(S7) by native C++ all-252-first-dice 3-roll Bellman. New research CLI option r=4 is solely an exact pre-turn-value query. It is cross-validated against unchanged JavaScript V4 Bellman.
- For each previous state in the V23 trajectory, learn the conditional expectation of this value, which targets the real value of V23-prefix + globally exact seven-turn tail, *NOT* V*(s28). The new V24 continues to choose all current scores/holds via exact dice multinomial chance integration but uses this learned approximate future value.
- To evaluate any given 21-turn prefix strategy pi, use paired simulated S7 states and W*(S7), not the sampled last-seven outcome. E[R under pi+exact7] = E[W*(S7)]. By the law of total variance this Rao–Blackwellization reduces variance relative to sampling its 7-turn tail, conditional on valid independent fair-dice assumptions.

## Training and verification
- 750 newly seeded V23 full-game traces (distinct from model evaluation), 15,750 observations at 21 early state stages; 600/150 split by entire game. All 750 W*(S7) native computations completed exact, without fallback. Three regularized small-tree variants compared on grouped validation only; 7-leaf/110-iteration chosen.
- Prediction residual RMSE (V23 baseline vs W7 target) 1.9747 -> V24 1.9487 BP; prediction improvement alone is not the success metric.
- Three native preturn W*(s7) values independently matched unchanged JS Bellman within 1e-9, JS serialization/parity and zero-correction V23 identity tested, exact <=7-turn decision router preserved. Full extracted ZIP npm tests passed.
- Prelocked statistical test protocol SHA256 7ce2e607b07c17b3b2c2c74782dfb1ed764dfb0326537519198ec9a29081f863, with fixed policy model and independent seeds. No selective study exclusions; 900 exact W7 evaluations.

## Actual policy-quality results
**Primary:** 200 fresh paired 21-turn prefixes with lookahead0 and exact seven-turn W7 terminal: expected final BP V6 8.4978, V23 8.5776, V24 **9.0866**. V24–V23 **+0.5090 BP**, paired t95% **[+0.1599,+0.8581]**, two-sided p=0.00448, paired bootstrap95 [+0.1566,+0.8604], Holm adjusted p=0.00895 across two predeclared V24/V23 studies.
**Secondary:** 100 further independent paired prefixes with lookahead1: V6 8.5107, V23 9.2718, V24 **9.3403**. V24–V23 **+0.0685 BP**, paired t95% **[−0.3918,+0.5288]**, p=0.7684, **INCONCLUSIVE**. V24 and V23 both outperform V6 in these independent policy-conditional evaluations.
**Exact action correctness:** In 28 existing exact 7–9-turn fixtures, V24 lookahead0 21/28 correct vs V23 23/28, V24 lookahead1 23/28 vs V23 23/28. Among 16 more relevant exact 8–9-turn cases V24 lookahead1 13/16 vs V23 14/16. V24's regret is a little lower but **no improved exact top-choice coverage**; retain mandatory exact <=7 and optional exact 8–12 over the fitted guide.
**Opening action changes:** Among 252 distinct dice histograms, V24 lookahead1 top provisional action changes from V23 on 6 (fair probability 1.80%); not certified optimal. No global opening optimality proof or complete early action ranking.
**Performance:** 200*3=600 native W7 lookups ~143.7sec, 100*3=300 ~303.7sec in local research container; one call per game/policy instead of thousands of exact individual last-seven decision calls. Cold first opening Node timing for V24 lookahead1 ~76.6ms vs V23 ~69.4ms (8 measurements; NOT iPhone).

## Decision and controls
Accept the new exact-tail-labeled and Rao–Blackwellized methodology as a **real improvement in research and statistically supported early-policy quality at lookahead0**. Do NOT claim globally optimal 20–28-turn choices or proof of stronger lookahead1 improvement. Approximate t CIs depend on the idealized independent dice model, while deterministic PRNG seeds and Float64 implementations are not formal coverage proofs. No production modifications.
Next iteration: repeat policy iteration using V24 policy distribution and exact W7 boundary; prioritize **action-directed** planning/decision regret, independent exact 8–12-turn references and strict mobile latency. Never let improvement in mean game returns substitute for exact global action-certification.

**Reproducible source:** Balut ChatGPT project artifact Balut_Oracle_2_Iteration_24_ExactTail_Policy_Improvement.zip, SHA256 4ab2873776b4454ad540975cdbe001ad27160e09fc6386f1f5352f1ad24b6a4a. All raw training rows, locked evaluation results, native code, Python fitted model, JS runtime, exact JS reference and technical Danish report included. Extracted archive tests and aggregate rerun verified.