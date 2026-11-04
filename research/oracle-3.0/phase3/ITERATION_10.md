# Iteration 10 — exact turn solver with learned continuation (2026-11-04)

## Verified prerequisite and important negative finding
GitHub Actions [41848732603](https://github.com/anders-hess/balut-game/actions/runs/41848732603) passed all iteration-9 steps. On 24 test games (672 correlated turn observations), the neural continuation estimator **did not beat** the stronger turn-conditioned baseline: neural MAE **2.50737 BP**, turn-conditioned MAE **2.49781 BP**, paired improvement **-0.00956 BP** with game-bootstrap 95% CI **[-0.25850, 0.23443]**. The earlier neural improvement versus a global constant was real but not sufficient evidence of useful state-conditioned learning. The previously inspected test set is diagnostic only.

## New implementation
- `phase3/expectimax.mjs`: exact enumeration of legal score and hold actions, exact multinomial chance outcomes, two-reroll Bellman recursion, memoization keyed by sorted dice and rolls left. At score boundaries it uses `currentBigPoints + neuralPredictedRemainingBP`; for the final score it uses the exact terminal score, not neural prediction.
- `phase3/test.mjs`: distribution normalization, zero-reroll brute terminal action, last-turn exactness, legal action, and immutability checks.
- `phase3/smoke.mjs`: two unseen-seed full games comparing neural expectimax with cached production BPIV; writes JSON including elapsed time and BP differences. **Two games are not evidence of improvement**.
- GitHub Actions runs all tests, 120-game data collection, neural training, paired gate, and phase3 smoke, archiving JSON. No production changes.

## Reproduction
```bash
node research/oracle-3.0/phase3/test.mjs
node research/oracle-3.0/phase2/collect.mjs 120 100000000 oracle3-trajectories
node research/oracle-3.0/phase2/validate-dataset.mjs oracle3-trajectories
node research/oracle-3.0/phase2/train.mjs oracle3-trajectories oracle3-neural
node research/oracle-3.0/phase2/evaluate-paired.mjs oracle3-trajectories oracle3-neural
node research/oracle-3.0/phase3/smoke.mjs oracle3-neural.weights.json
```

## Verification gate
The new CI run is pending. Local checkout is blocked by DNS resolution of github.com in the container; **do not claim phase3 tests or smoke passed** before CI success. Exact within-turn recursion does NOT imply globally optimal policy: continuation is approximate and its added value is unproven. Next: inspect CI, diagnose any failures, evaluate neural versus turn-conditioned continuation in policy rollouts on truly unseen seed range, then only pursue policy iteration if policy-level evidence warrants it. Do not deploy.
