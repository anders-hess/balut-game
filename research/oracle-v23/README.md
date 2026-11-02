# Oracle 2.0 — Iteration 23 checkpoint
**Date: 2026-11-02**. Research only, no production modifications.
Full runnable source (new JavaScript model/decision router, serialized sklearn-HistGB model, game-grouped training data, old exact references, tests, locked raw samples, Danish report) is attached to Balut project conversation as `Balut_Oracle_2_Iteration_23_Learned_Adaptive.zip`.
Archive SHA256: `9fea283ddf9c3bbd10710ec126d144f89797745ea45509b2dbbabb6090ec20ef` (3.5 MB ZIP). Entry: `Oracle_23_bundle/Oracle_23/README.md`. Extracted ZIP `npm test` passed.
Source/research architecture is fully explained in [ADR-017](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_017_LEARNED_POLICY_VALUE.md).

## Reproduced locked experiments
- 1,400 independent V6 lookahead0 full 28-turn games -> 39,200 state/terminal-return records (train/val 1,120/280 *by game*). Python residual HistGB model with 120×9-leaf, 56-feature vector: validation residual RMSE 3.881 → 2.396. Predicted residual is *policy-conditional*, NOT optimal Bellman.
- 144 independent tuning games fixed weight=1 prior to tests.
- 1,000 independent paired full games, both lookahead0: V6 8.217 vs new V23 8.484, delta +0.267 expected Big Points (paired t95% +0.053 to +0.481). Model's empirical payoff improves; NOT a proof of optimal early actions.
- 120 independent paired full games, stronger lookahead1: 8.875 vs 9.525, delta +0.650 (paired t95% +0.060 to +1.240). Secondary supportive result, marginal after multi-comparison adjustment.
- 80 independent paired complete games WITH STRICT Bellman exact <=7 remaining turns: 8.900 vs 9.425, +0.525 (95% -0.220 to +1.270), inconclusive. 10,498 exact decision calls, ZERO fallback. Exact JS for first 40 games, independently validated C++ exact for last 40 after resource-intensive JS process stalled; predetermined seeds unchanged.
- Independent exact 7–9-turn references: V23 lookahead0 correct 23/28 vs V6 lookahead0 21/28; V23 lookahead1 and V6 lookahead1 both 23/28; NO new globally certified choice with 20–28 turns remaining.
- 252 opening dice histogram enumeration: 26 top choices changed vs lookahead1 V6, ~6.687% natural probability. Cold first-roll local Node 76.7ms V23 vs 53.6ms V6. No iPhone validation.

**Technical status:** Research v23 Oracle routes <=7 to exact solver; optional exact native 8–12 with honest timeout; estimated v23 continuation 13–28 with `approvedAction=null`. It always permits all seven available future category choices. No production changes.

**Next:** more robust strict-exact7 statistical coverage, genuine iterative policy improvement using feedback from V23 and exact terminal Bellman, and new representative exact intermediate-action validation. No more work on generic upper-bound shrinking as a primary KPI.