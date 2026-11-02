# ADR-017 — Oracle v23: empirically trained seven-category continuation and locked performance tests
**Date:** 2026-11-02. **Status:** ACCEPTED RESEARCH RESULT; NOT APPROVED FOR LIVE ORACLE.
**Binding:** North Star global optimal-adaptive expected final Big Points over 28 turns; ADR-010 exact <=7 remaining; ADR-011 all seven future category choices; ADR-016 proof-level separation.

## Method
- Preserve exact current-turn multinomial Bellman optimization (252 distinct 5-dice histograms / up to 3 rolls), with all seven categories reconsidered at each future decision.
- Replace fitted v6 residual's early-state value bias by a second regularized 120-tree model trained on actual terminal Big Points from 1,400 complete **legal V6 lookahead0-policy** games. 39,200 pre-turn scorecard observations; split 1,120/280 by GAME. 56 feature values including category quotas, threshold progress, intact categories and existing V6 forecast. This is a learned **policy-conditional value**, NOT globally optimal V*(s).
- Portable JSON tree model and native JS predictor match sklearn on seven independent numerical cases to 1e-8. A learned value guides legal action selection; even if the resulting policy scores better, that is no mathematical proof of optimal individual early choices.
- Exact-first router: 1–7 turns ALWAYS exact Bellman (no estimated fallback); 8–12 optional exact C++ under time/state cap; 13–28 learned but explicitly 'estimated_uncertified' and approvedAction=null. Strict complete-game research evaluations hand off at seven turns on every decision.

## Locked experimental evidence
- Heldout **score-prediction** RMSE reduced from 3.881 to 2.396 expected Big Points on 280 group-held-out training-game trajectories. Diagnostic only, not proof of action correctness.
- Separate 144-game tuning chose correction weight 1.0 among 0,0.3,0.65,1.0, then FIXED before new seeds. Locked protocol SHA256 1a249ebd2c9c28e0a65033713888b329c02245614a79a9f5ae4cceeacc037b34.
- **1,000 prelocked independent paired complete games**, V6 lookahead0 8.217 vs V23 lookahead0 8.484 final Big Points, difference **+0.267**, paired Student t95% CI **[+0.053,+0.481]**; paired bootstrap [0.048,0.482]. Runs were split into separate fixed-seed batches after long-running Node process/GC stalls, with no seed omissions.
- **120 different prelocked independent paired games**, V6 lookahead1 8.875 vs V23 lookahead1 9.525, difference **+0.650**, paired t95% **[+0.060,+1.240]** and bootstrap [0.058,1.242]. This is a secondary comparison; familywise simultaneous two-sided 95% control across both tests would weaken this latter positive claim to borderline.
- **80 third, independent paired strict-tail games** using exact Bellman at EVERY decision with <=7 remaining: V6 8.900 vs V23 9.425, difference **+0.525**, paired t95% **[-0.220,+1.270]**, **NOT statistically decisive**. All 80 games completed, no fallback and **10,498 exact tail calls** combined. First 40 used reference JS exact; a slow/exhausted JS batch forced a documented **execution-engine-only change** to previously independently verified native C++ exact for last 40, with identical locked game seeds.
- Known independent exact action fixtures 7–9 turns: V6 lookahead0 correct 21/28; V23 lookahead0 23/28; average Bellman regret 0.011812 -> 0.007550 BP. Strong V6 lookahead1 correct 23/28; V23 lookahead1 also 23/28, near-identical regret 0.006333 vs 0.006542; no increase in certified coverage and NO new exact 20–28-turn reference.
- 252 possible opening dice histograms: lookahead1 first recommended action changes on 26, total fair probability 6.687%; changed choices alone do NOT prove correct opening selections.
- Cold first roll [3,3,3,6,6] with lookahead1 local Node: V6 53.6ms vs V23 76.7ms; not tested on iPhone.

## Decision
Accept v23 as a **meaningful, statistically supported better adaptive POLICY** versus v6 in the two independent full-game heuristic-tail evaluations; do NOT equate this with a proof of globally optimal Q*. It is not yet proven superior when exact seven-turn tail is enforced. Do NOT deploy without stronger strict-tail holdout, exact early action accuracy and device runtime evidence.

## Next research
Iteration 24: generate trajectories with the new V23 policy, use exact W*(s) at the seven-turn boundary to evaluate corrected 8–28-turn Bellman targets, and repeat genuine policy improvement with locked independent full-game comparisons. Selective native exact offline 8–12 cache acts as reference but does not substitute a full 28-turn proof. Ensure all legal actions and proof status remain visible.

**Artifact:** Tested standalone source, 19 MB raw training dataset, JSON model, locked raw evaluations, independent exact reference and report in Balut ChatGPT project file `Balut_Oracle_2_Iteration_23_Learned_Adaptive.zip`, SHA256 `9fea283ddf9c3bbd10710ec126d144f89797745ea45509b2dbbabb6090ec20ef`. Tests passed after independent archive extraction; no live changes.