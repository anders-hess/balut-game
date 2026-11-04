# Oracle 3.0 iteration 15 — pure mathematical Bellman teacher + independent AI

**4 November 2026, architecture-reset iteration.** Strictly separate branch:
\`research/oracle-3.0-phase5-pure-math-bellman-ai-2026-11-04\`.
Cumulative from committed iteration 14 but only mathematical components are used.
The forbidden production Oracle/BPIV models from iterations 1–14 are HISTORICAL
NEGATIVE EVIDENCE, **not** components of this implementation.

## Nonnegotiable architecture

No production Oracle policy, BPIV, oracle1 model, recommended action,
baseline score prior, scorecard distribution or fallback in this research
model, data collection, training or inference. Zero imports from
\`src/logic/oracle/\` or prior production-guided \`phase2\`/\`phase3\`.
The new \`pure/guard.mjs\` recursively scans the active dependency graph and
fails CI on forbidden imports, policy symbols, unsafe paths or third-party
dependencies. The simulator in \`phase1/simulator.mjs\` implements **Balut
scoring and legal transitions**, not advisor decisions, and is mathematically
independent of production recommendations.

Reused proven independent math modules:
- \`oracle2/oracle2-exact-v46.cpp\` immutable Oracle 2.0 exact finite horizon
  C++ DP; source Git blob \`4ce623ed663edffc4b1c9291f975aba778622227\`.
- \`oracle2/oracle2-state.cpp\` pre-first-roll Bellman value.
- \`oracle2/adapter.mjs\` state/action encoding of pure scoring semantics.
- \`oracle2/features.mjs\`: the 17-dimensional mathematically sufficient
  scorecard quotient for the native solver.
- \`oracle2/train-supervised.mjs\` and \`oracle2/model.mjs\`: reusable,
  independently verified TRAIN-only neural/linear/stage regression math;
  the trained parameters come ENTIRELY from the NEW samples in this run.
  No old trained weights or prior datasets are loaded.

## Pure data generator and exact teacher

**120 independent newly seeded games, 950100000–950100119** (chosen before
any evaluation). Every 3rd game uses independent stochastic mathematical
"uniform", "scoreaware", or legal forced-scratch sampling; all seven
categories and all 28 filled slots are checked. These sampling policies
are **not** AI targets and do not come from any production oracle.

Every game produces exactly four 1–3-remaining-turn Q roots:
- Three REAL observed decisions after legal full-game roll histories, one
  each at 3, 2, 1 remaining turns.
- A fourth deliberately possible dice-roll coverage root at three remaining
  turns, with one reroll. It is not probability weighted.
- An exact Oracle 2.0 pre-first-roll V* for each of the three distinct
  scorecard states, and native complete per-action Q* for all four roots.
- Both V* continuation and Q* are expected **final Big Points** under
  an optimal policy for the remaining finite horizon. Continuation target
  is \`V*(card)-currentBP(card)\`; at present-roll time Q*(a) is conditional
  on the observed dice and remaining rerolls.
- All rare zero-scoring alternatives and category changes are represented.
- Native cap 250k states per query, timeout 12s; failures explicit.

Train/validation/test split by **whole new game** only:
- train 72 seeds 950100000–071 (216 unique boundary V* states)
- validation 24 seeds 950100072–095 (72 boundary states)
- test 24 seeds 950100096–119 (72 boundary states)

Q root counts are 288/96/96 (total 480), while boundary samples are
216/72/72 (total 360). Check exact coverage before claiming anything.

## Neural math student and exact chance optimisation

- Train all new weights from scratch with stage-conditional mean, 17-feature
  regularized linear regression and a small 17→20→1 tanh neural network.
  Training targets are **native optimal mathematical V* continuation**, not
  any advisor's score or policy. Training-only normalization.
- Implement independently generated multinomial dice probabilities for
  0–5 dice (exact combinatorics, Float64 expectation) and mathematically
  complete present-turn Bellman/expectimax over every legal hold/score.
  No production probability module. Unit test each distribution's total
  probability/expected face count and **complete final-turn per-action Q
  parity** with unchanged Oracle 2.0 native Bellman.
- Select the student option [myopic mathematical continuation,
  stage-average, linear, neural] by **validation mean exact-Q regret**
  against native Bellman. Freeze selected choice in JSON BEFORE evaluating
  the locked test. Training hyperparameters for linear/neural are themselves
  selected only from the validation pre-roll RMSE; this can overfit and
  must be disclosed, not optimized on the test.
- Held-out metrics by 24 independent games: exact current-roll Q regret,
  95% seed/game-cluster bootstrap interval, optimal-action agreement,
  V* continuation MAE/RMSE, runtime and parent RSS; break down by
  uniform/score-aware/scratch, number of turns and natural/counterfactual
  dice states. No selected post-hoc test tuning.
- \`pure/policy.mjs\` deliberately **throws** for >3 remaining turns:
  no silent extrapolation, no production fallback. For <=3 remaining turns,
  a numerically exact native Bellman policy is available (subject to
  explicit resource cap). The learned version is always marked approximate.

## Proof language and deployment safety

"EXACT_FLOAT64" means the finite-horizon DP/search was completed in
floating-point arithmetic for the provided 1–3-turn state. It is not a
formal rational or interval-arithmetic proof of 28-turn global optimality.
Rigorous mathematical proof of a specific optimal action would need a
bound on floating-point and search errors, e.g. outward-rounded interval
Bellman or exact-rational probability/score propagation.

**No fully playable Oracle 3.0 for the early 28 turns is claimed this
iteration.** We have a mathematical teacher and a small, generalization-
tested student over *solved endgames*. Next iterations should expand the
certified horizon and improve independent self-play/policy iteration while
covering scratch, threshold crossings and low action gaps. Avoid all
imitation or use of production Oracle. A separate old production Oracle
comparison may only be an external post-freeze report, never an input.

## Reproduce (from repo root, Node 22+, g++ C++20)

\`\`\`bash
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-state.cpp -o research/oracle-3.0/oracle2/oracle2-state
node research/oracle-3.0/pure/guard.mjs
node research/oracle-3.0/pure/test.mjs
node research/oracle-3.0/pure/collect.mjs 120 950100000 oracle3-math-pure
node research/oracle-3.0/pure/audit.mjs oracle3-math-pure
node research/oracle-3.0/oracle2/train-supervised.mjs oracle3-math-pure oracle3-math-pure
node research/oracle-3.0/pure/evaluate.mjs oracle3-math-pure
node research/oracle-3.0/pure/test-policy.mjs oracle3-math-pure
\`\`\`

Generated JSON: \`oracle3-math-pure.json\` full native labels/traces;
\`oracle3-math-pure.collection.json\` full collection stats;
\`oracle3-math-pure.weights.json\` model trained from clean samples;
\`oracle3-math-pure.train.json\` training and val RMSE;
\`oracle3-math-pure.frozen-selection.json\` **validation-only** chosen
student; \`oracle3-math-pure.pure-summary.json\` with locked heldout Q;
\`oracle3-math-pure.pure-test.json\` including individual decisions.
CI archives all and the code in a separate research branch; actual
numeric results are not claimed until a SUCCESSFUL run.
