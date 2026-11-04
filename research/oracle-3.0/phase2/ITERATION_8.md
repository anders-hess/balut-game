# Oracle 3.0 — iteration 8: larger value-model holdout

## Verified result from iteration 7
GitHub Actions [41830317010](https://github.com/anders-hess/balut-game/actions/runs/41830317010) **SUCCESS**. Neural MLP (59→32→1) trained on 18 complete games and validated/tested on 6/6 disjoint games. On the six held-out games (168 correlated turn rows): constant baseline RMSE **4.45513 BP**, neural RMSE **3.32784 BP** (difference **1.12729 BP**). Validation RMSE 3.90240 vs neural 2.48483. Training wall 222 ms; collecting 30 actual Oracle games took 124.317 seconds. This is a positive *prediction* result only; six games are far too few to establish generalization, and the model has not been used as a policy.

## Iteration 8
- Collect **120 complete games**, 3,360 turn-boundary rows; 72/24/24 whole-game train/validation/test split (no within-game leakage).
- Add **game-level mean MAE** and nominal 95% CI computed across independent games, plus opening/midgame/endgame holdout RMSE and MAE. Keep row-level RMSE for continuity but do not mistake 672 holdout rows for 672 independent samples.
- Save trajectory JSONL, model weights and metrics as GitHub Actions artifacts. Existing rule parity and cached-production policy parity tests remain in CI.

## Reproduction
```bash
node research/oracle-3.0/phase2/test.mjs
node research/oracle-3.0/phase2/collect.mjs 120 100000000 oracle3-trajectories
node research/oracle-3.0/phase2/validate-dataset.mjs oracle3-trajectories
node research/oracle-3.0/phase2/train.mjs oracle3-trajectories oracle3-neural
```

## Interpretation and gate
120 games is still small. Even if held-out RMSE improves, **no new action-selection policy and no final Big Points improvement have been established**. The next step is a value-guided exact within-turn expectimax with a frozen trained model and matched-seed end-to-end evaluation; do not train on the test seeds. If the larger holdout regresses, investigate model instability and data before policy integration. Never merge research to main.
