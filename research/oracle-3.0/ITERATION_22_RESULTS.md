# Oracle 3.0 — iteration 22 verified result, 4 November 2026

**GitHub Actions SUCCESS:** https://github.com/anders-hess/balut-game/actions/runs/41915546340

**Raw scorecard witnesses, full exact Q maps, model actions and JSON:** https://github.com/anders-hess/balut-game/actions/runs/41915546340/artifacts/13363463814

## Experiment

48 deterministic, disjoint, independently constructed legal 26-turn scorecards, seeds 991000000–991000047. Each has only Fours and Straight remaining; current Small Points range 350 to 546, and each card is tested at two legal dice/reroll states. All 96 roots and all 2,168 legal score/hold action Q-values were calculated using **exact BigInt rational two-turn Bellman**, and all Q-values passed the separate unchanged Oracle 2.0 Float64 differential check. 90/96 roots have nonzero action-value spread. Zero forbidden production-advisor imports across 28 math-only modules.

Frozen mathematically trained iteration16 neural/linear/stage continuations are assessed; NO new training, tuning, or existing production Oracle policy is used. Exact within-turn multinomial expectation and native mathematical scoring are shared across all student comparisons. Original student weights were frozen BEFORE these new card seeds were created.

| Candidate | Mathematically optimal actions | Exact Q-regret BP per position |
|---|---:|---:|
| Pure mathematical myopic | 80/96 | 0.0189759750 |
| Math-trained stage model | 80/96 | 0.0189759750 |
| Math-trained linear model | 81/96 | 0.0174174662 |
| Frozen math-trained neural | **82/96** | **0.0155657071** |

Neural minus myopic mean paired Q-regret −0.00341027 BP; 95% independent-scorecard cluster bootstrap **[−0.01030694, +0.00313190]**, including zero. Approx 18% lower empirical mean conditional Q regret for these 96 designed decision positions, **NOT a statistically demonstrated superiority**. In particular the neural still chooses 14 provably suboptimal actions. Mean neural within-turn inference 52.1ms/position, myopic 50.0ms. Exact proofs plus evaluation 108.3 seconds, Node parent peak RSS 132 MB (native subprocess memory excluded).

Crucial limitations: scorecards and dice are deliberately reward/threshold-rich **positive-probability but NOT natural-game-frequency-weighted**. These are two correlated roll roots on each of 48 independent scorecards; confidence interval clusters accordingly. Exact proof covers only TWO remaining turns including 1/2 current rerolls, not 3–28 turns. No realized 28-turn full-game Big Points comparison or improvement claim. Code has tests, not formal theorem-prover verification.

**Recommended next iteration**: train a new AI action-Q learner on completely separate fresh mathematically certified Q labels; split whole scorecards into train/validation/test and measure action regret and optimal agreement on untouched certified game-state seeds, including scratch/zero, threshold crossings, multi-category cases. To grow the certificate horizon, focus on 3-turn rational/interval Bellman with state compression and sound pruning. NEVER use the prior production Oracle for any component.

Results machine-readable: `research/oracle-3.0/iteration22-verified-results.json`.
