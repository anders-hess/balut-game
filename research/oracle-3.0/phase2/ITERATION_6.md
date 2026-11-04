# Iteration 6 — Repair and validation of trajectory dataset

Previous phase-2 CI failed at `assert.ok(empty.every(x=>x===0))` in `test.mjs`: the empty scorecard has **-2 Big Points** under the production terminal bonus rules. This was an incorrect test assumption, not proof of a simulator/scoring bug. Fixed the assertion to expect `-2/20` in feature index 58 and use floating-point tolerance for terminal BP.

Added `validate-dataset.mjs` to check every row of collected JSONL: 59 finite features, 28 turns per seed, no duplicate/missing turn, seed partition boundaries, terminal residual zero, target consistency, current-score/residual arithmetic, and row count. CI now fails if collection output fails validation, and archives the dataset/metrics.

Reproduce in checkout:
```
node research/oracle-3.0/phase2/test.mjs
node research/oracle-3.0/phase2/collect.mjs 30 100000000 oracle3-trajectories
node research/oracle-3.0/phase2/validate-dataset.mjs oracle3-trajectories
```

**Status at commit:** GitHub Actions queued/running; no verified 30-game dataset yet, no neural training, no statistical improvement claim. Inspect the latest CI run, its artifacts and full data validation before proceeding to supervised learning. Main, live Oracle and Oracle 2.0 unchanged.
