# Oracle 3.0 — Iteration 7: first neural value model

## Verified prior gate
GitHub Actions [run 41822199876](https://github.com/anders-hess/balut-game/actions/runs/41822199876) succeeded. The CI log confirms **30 real complete games**, **840 turn-boundary rows**, **59 features**, training seed range **100000000–100000029**, and mean final Big Points **8.0** under cached production-equivalent Oracle. This is a tiny dataset and NOT a reliable baseline for performance comparisons.

## New implementation
`phase2/train.mjs`: dependency-free, deterministic MLP 59→32 tanh→1, trained to predict **remaining final Big Points** from turn-boundary scorecard features. Training examples are separated by **whole game**, not rows: 18 train, 6 validation, 6 locked test. Standardization statistics are computed on train rows only. Early stopping uses validation RMSE. Evaluation compares the model against the constant training-target mean on all three splits; report held-out RMSE/MAE and whether the model is actually better. Writes metrics JSON and weights JSON. No claim of policy improvement.

CI automatically reruns the existing scoring parity, cached-policy parity, data generation and validation before training, then uploads neural metrics and weights.

## Reproduction
```bash
node research/oracle-3.0/phase2/test.mjs
node research/oracle-3.0/phase2/collect.mjs 30 100000000 oracle3-trajectories
node research/oracle-3.0/phase2/validate-dataset.mjs oracle3-trajectories
node research/oracle-3.0/phase2/train.mjs oracle3-trajectories oracle3-neural
```

## Honest limitations
- Thirty games / six holdout games are far too small to establish a useful learned value function.
- Multiple turn rows per game are correlated, so the effective independent sample size is games, not 840.
- This learns a continuation value **under production Oracle**, not an optimal policy. No measured improvement in final Big Points.
- This branch must not be merged to production; next phase requires larger independent training/validation/test sets and a frozen policy baseline.
- New CI run must finish before claiming a trained model or test results.
