# Oracle 2.0 — Iteration 24 completed checkpoint
**2026-11-02; RESEARCH ONLY; no production deployment.** Full package has been delivered to Balut project's conversation as `Balut_Oracle_2_Iteration_24_ExactTail_Policy_Improvement.zip`; SHA256 `4ab2873776b4454ad540975cdbe001ad27160e09fc6386f1f5352f1ad24b6a4a` (5.1 MB ZIP). Extracted ZIP tests and aggregate rerun PASS.

**Core exact-Bellman advance:** Generate 750 legal V23-policy early prefixes, score with **native exact W*(s7)** after 21 turns rather than sampled approximate full-game return. 15,750 labeled preturn states, 600/150 train/validation by whole game. All 750 tails solved exact. Fits a 110-tree correction that estimates V23-prefix + exact-seven continuation, NOT globally optimal 28-turn V*. Three exact W7 values match independently unchanged JS Bellman at 1e-9.

**Lock SHA:** `7ce2e607b07c17b3b2c2c74782dfb1ed764dfb0326537519198ec9a29081f863` made before fitting and tests. Evaluator plays **all 21 early turns adaptively over all seven categories**, then analytically integrates the optimal last seven with one exact W7 computation per policy. E[final return under prefix+exact7]=E[W*(S7)]; removes tail sampling variance by Rao–Blackwellization.

**Primary 200 fresh independent paired lookahead0 prefixes:** V6 8.4978, V23 8.5776, V24 **9.0866** expected final BP; V24−V23 **+0.5090** t95% **[+0.1599,+0.8581]**, p=0.0045 (Holm-adjusted for two planned comparisons p=0.0090).
**Secondary 100 different lookahead1 prefixes:** V6 8.5107, V23 9.2718, V24 **9.3403**, V24−V23 **+0.0685** t95% **[−0.3918,+0.5288]**, p=0.7684 (INCONCLUSIVE).
**Independent reference exact regrets:** 28 known 7–9 turn roots: V23 top correctness 23/28 with lookahead0 vs V24 21/28; lookahead1 both 23/28. On 16 roots at 8–9 turns, v24 lookahead1 13/16 vs v23 14/16. **No stronger mathematically correct top-action coverage** and **no globally optimal opening certified**.
**252 first-roll histograms:** only 6 provisional top-choice differences from v23 lookahead1 (fair mass 1.8%); agreement is not evidence of optimality. Node cold start lookahead1 ~76.6ms V24 vs 69.4ms V23 (8 runs, not iPhone).

**Accepted ADR:** https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_018_EXACT_TAIL_POLICY_ITERATION.md . V24 remains experimental, no live changes. For next iteration, repeat policy improvement using V24-on-policy exact W7 training and target actual early action ranking/regret and cost. Do not overclaim optimality; fitted value predicts a legal suboptimal policy.

Reproduce from ZIP root: `cd Oracle_24_bundle/Oracle_24 && npm test && python src/aggregate_evaluation_v24.py`. Data, model, full raw results, and reference original code are included.