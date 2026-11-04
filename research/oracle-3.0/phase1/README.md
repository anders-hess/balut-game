# Oracle 3.0 Phase 1 — seeded simulator smoke test

This iteration establishes a **standalone**, headless, deterministic 28-turn simulator matching the *documented* scoring and placement rules in main/src/logic/scoring.js, including high scores placed right-to-left, all seven categories, positive/zero scoring and nonlinear terminal bonus. No production files changed.

Run from repo root:
```bash
node research/oracle-3.0/phase1/test.mjs
node research/oracle-3.0/phase1/simulator.mjs 1000 1234
```

Locally executed with Node v22.16.0: tests passed; 1,000 full games, seed 1234, mean **0.192 final Big Points**; sample SD 2.24548, unpaired normal-approx 95% CI [0.05282, 0.33118], 70,135 decisions, 1,034 ms wall-clock. See smoke_1000_seed1234.json.

**CRITICAL LIMITATION:** The smoke policy is a deliberately weak greedy rule, **NOT the current production Oracle**. Therefore this is NOT an Oracle 1.0 baseline, nor evidence of Oracle 3.0 improvement. This phase is incomplete. Rules were transcribed from production code and spot-tested, not yet independently cross-checked via importing the original modules. No neural model has been trained.

**Next:** Integrate the actual production Oracle recommendation function in the simulator, account for its top-five and BPIV filtering semantics, measure runtime and baseline on at least 1,000 seeded games before scaling. Add differential parity tests against main's scoring functions and check all scorecard placements, especially high scores. Use independent held-out seeds for later AI evaluation.
