# Iteration 11 — diagnose negative phase-3 policy smoke (2026-11-04)

## Verified prior run
GitHub Actions [41858658574](https://github.com/anders-hess/balut-game/actions/runs/41858658574) **success**, including phase-3 unit tests and actual two-game rollout. Despite passing code tests, the neural expectimax candidate scored **-2 and 0 BP**, versus production **12 and 6 BP**, paired deltas **-14, -6 BP** (mean **-10 BP**). Candidate took **3465.5 and 3463.2 ms** vs production **3014.2 and 2917.3 ms**. **n=2 cannot establish policy regression statistically**, but the negative diagnostic is important; do not call the policy improved.

The phase-2 stronger predictor gate remains negative: neural MAE 2.50737 vs turn-conditioned 2.49781, game-bootstrap 95% CI for neural MAE advantage [-0.25850, 0.23443] BP, 24 games. The neural value is not ready for deployment.

## New work
`diagnose.mjs` performs **12 new complete games** on seed range 900010000–900010011 with three policies: cached production Oracle BPIV, exact within-turn expectimax with **training-only turn-conditioned** continuation, and exact within-turn expectimax with neural continuation. Reports full game Big Points, bonus, time, paired mean deltas and approximate 95% intervals, process RSS. No training or model selection uses these seeds. This ablation isolates whether failure is due to neural continuation or the generic expectimax objective/policy.

CI uploads `oracle3-phase3-diagnostic.json` as an artifact. Reproduce from repository root after preparing phase2 artifacts:

```bash
node research/oracle-3.0/phase3/test.mjs
node research/oracle-3.0/phase2/collect.mjs 120 100000000 oracle3-trajectories
node research/oracle-3.0/phase2/validate-dataset.mjs oracle3-trajectories
node research/oracle-3.0/phase2/train.mjs oracle3-trajectories oracle3-neural
node research/oracle-3.0/phase3/diagnose.mjs
```

## Decision gate
Do not claim better expected final BP from this small diagnostic. If both stage and neural expectimax lose, investigate Bellman value definition, terminal bonus handling and policy distribution shift before further neural scaling. If only neural loses, prioritize improved value labels and calibration. For any eventual positive candidate, require prospective large paired full-game evaluation with valid CI, plus exact endgame regret checks. No main/live/Oracle 2.0 changes.
