# Iteration 9 — stronger value gate, paired by game (2026-11-04)

**Base:** phase2-scale120-holdout branch. **New:** phase2-paired-stage-gate branch. No production changes.

## Verified previous iteration (CI run 41838554386)
- 120 complete cached-production Oracle games, 3,360 validated turn samples; 72/24/24 train/validation/test split; mean final Big Points 8.88333, SD 3.26732, approximate 95% CI [8.29874,9.46793], collection 504.994 seconds.
- Neural value 59→32→1: holdout RMSE 3.22959 BP, MAE 2.50737; constant baseline RMSE 4.74224, MAE 3.94834. Endgame RMSE 2.0641 vs constant 5.4171. **Predictive result only**. The model was validation-selected at epoch 1; this small dataset is not sufficient to assert learned playing improvement.
- CI successful; weights and JSON metrics in Actions artifacts. Original metrics contain stale text saying 30 games; actual split and collection confirm 120.

## This iteration
- Added `evaluate-paired.mjs`, a stronger turn-conditioned mean-continuation baseline fitted **only on 72 training games**, not a naive constant baseline.
- Compare neural model and turn-conditioned baseline on the **same 24 test games**, aggregate per-game absolute error and squared error, and compute paired game-level normal and deterministic 10,000-replicate cluster-bootstrap CIs. This avoids treating 672 correlated turns as independent games.
- CI will rerun deterministic collection/training and archive paired metrics. Reproduce from repository root:
  `node research/oracle-3.0/phase2/collect.mjs 120 100000000 oracle3-trajectories`
  `node research/oracle-3.0/phase2/train.mjs oracle3-trajectories oracle3-neural`
  `node research/oracle-3.0/phase2/evaluate-paired.mjs oracle3-trajectories oracle3-neural`

## Gate and limitations
Do **not** claim a neural improvement until the new CI run passes and the paired 95% CI is inspected. Even a positive CI would only show **value prediction**, not better Big Points under a new policy. The 24-game test set has already been inspected in prior iterations; treat this as a diagnostic, and reserve a new unseen seed block for the future policy comparison. Next: implement model-conditioned exact within-turn expectimax with careful legal action parity and evaluate against Oracle 1.0, without altering production.
