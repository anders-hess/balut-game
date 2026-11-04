# Oracle 3.0 — North Star and execution contract

Research tracker: https://github.com/anders-hess/balut-game/issues/2

**Goal:** Learn a policy maximizing expected FINAL Big Points across all 28 turns and seven categories, conditioned on the observed scorecard, dice and remaining rerolls. Do not claim global optimality without a separate proof.

**First architecture:** deterministic seeded rules-parity simulator; exact one-turn chance/hold expectimax; small neural value function over the next-turn scorecard; iterative policy improvement; exact endgame Bellman labels when feasible.

**Primary success metric:** holdout mean final Big Points improvement versus frozen production Oracle, with confidence intervals. Secondary: endgame Q regret, distribution by stage, bonus frequency, p95 latency, runtime and peak memory. A model trained on Oracle trajectories is not better merely because it mimics Oracle.

**Work gates:** (1) rules parity + baseline; (2) neural model out-of-sample; (3) exact expectimax + neural value; (4) policy iteration + ablations; (5) locked large benchmark. Each gate requires committed runnable source, tests, result JSON, reproducible commands, and an honest pass/fail. If a gate fails, diagnose rather than invent progress.

**Safety:** isolated research branches only; never modify main, live production, or Oracle 2.0. No deployment or merge without explicit user approval. Record code and limitations in issue #2.
