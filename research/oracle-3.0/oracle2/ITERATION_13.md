# Oracle 3.0 — iteration 13: Oracle 2.0 exact labels → supervised value + held-out Q regret

**4 November 2026. Research only. Parent:** 
\`research/oracle-3.0-phase4-oracle2-exact-supervision-2026-11-04\`.
This branch is cumulative; main, production Oracle and every Oracle 2.0 branch remain unchanged.

## Scientific rationale

The earlier Oracle 3.0 model regressed the realized final score of **production Oracle**
(\`V^production\`) and performed poorly as a greedy lookahead oracle. The previous
12-game diagnostic showed a -7.167 BP neural-vs-production mean (nominal
95% CI [-8.920,-5.413]). Forecasting that fixed policy's expected return
is **not equivalent** to the optimized Bellman value \`V*(s)\`.

Iteration 12 imported an **identical** copy of Oracle 2.0 v46 exact reachable
Bellman (upstream Git blob SHA \`4ce623ed663edffc4b1c9291f975aba778622227\`).
GitHub Actions 41878240921 verified 12 one-turn parity roots/260 actions,
9/9 extra late roots, 186 extra Q values and 4 hybrid full games (no gain;
4 ties). This iteration scales actual exact optimal Bellman supervision.

## Research protocol, fixed BEFORE evaluating test scores

Collect **60 new complete games** using frozen cached-production policy, seeds
\`910100000..910100059\`. For each game record PRE-FIRST-ROLL card states
with 3, 2 and 1 turns remaining, and the observed initial roll. This gives
**180 attempted endgame states**, of which:

- **36 games / 108 states** train, seed \`910100000..910100035\`;
- **12 games / 36 states** validation, seed \`910100036..910100047\`;
- **12 games / 36 states** locked test, seed \`910100048..910100059\`.

Actual solved-state counts may be lower because the native exact solver is
bounded; unsolved attempts are *not* imputed. State cap 250,000 and 12 s
timeout per native call. Record source, coverage, wall time, native state
counts and explicit failures. At least 70% total exact-label coverage
is an initial execution gate; it is not a statistically adequate success
criterion.

**Two different supervised targets:** pre-roll \`V*(card) - currentBig(card)\`
for the next-turn value network, and complete present-roll action
\`Q*(card,dice,rollsRemaining,action)\` references for validation.
Never train state-value on present-roll Q, or subtract current BP twice.
These Bellman expectations optimize final BP over all *remaining* turns,
but are only tractable for the stated 1–3-turn tail.

## State encoder + competing models

17 features reproduce the sufficent Oracle 2.0 Markov quotient:
7 remaining category counts; four threshold sums;
Straight/Full House positive counts; Balut count;
total Small Points; current Big Points and remaining-turn count.
All features and training-only normalization are frozen.

Three models compete on **validation RMSE**, not test:
1. Train-only horizon-conditional mean value;
2. Train-only regularized linear model (same 17 features);
3. Small 17→20→1 tanh network trained with deterministic SGD,
   L2 penalty, validation early-stopping.

The **best validation** model is frozen. The other models remain honest
ablations. No test score can select model, epochs or architecture.
The test set is strictly whole-game disjoint. No late-game learner
is allowed to extrapolate to >3 remaining turns.

## Held-out evaluation and truth levels

On locked test games:
- pre-roll optimal-remaining-BP MAE and RMSE by method + game-cluster CI;
- decision ranking from exact current-turn 3.0 expectimax with each
  model's estimated *next* state value;
- exact Q regret against the identical 2.0 at-roll Bellman reference
  for the **chosen action**; compare to frozen production Oracle;
- stage-specific Q regrets (1/2/3 turns), exact-action agreements,
  reference coverage and 4,000 game-cluster bootstrap samples.

Do **not** call better test Q regret a proven higher full-game final BP.
No full-game head-to-head trial of the newly trained model is conducted
this iteration. The 12 test games are too few for robust generalization.

Oracle 2.0 v46 is EXACT_FLOAT64 within the requested explicit limits
(not rational certification of global 28-turn Bellman optimality).

## Repro from repository root

Requires Node 22 and \`g++ -O3 -std=c++20\`. First build exact native binaries:

\`\`\`bash
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-state.cpp -o research/oracle-3.0/oracle2/oracle2-state
node research/oracle-3.0/oracle2/test.mjs
node research/oracle-3.0/oracle2/test-exact-learning.mjs
node research/oracle-3.0/oracle2/collect-supervised.mjs 60 910100000 oracle3-phase4-supervised
node research/oracle-3.0/oracle2/train-supervised.mjs oracle3-phase4-supervised oracle3-phase4-supervised
node research/oracle-3.0/oracle2/evaluate-supervised.mjs oracle3-phase4-supervised oracle3-phase4-supervised
\`\`\`

Results: \`oracle3-phase4-supervised.collection.json\`,
\`oracle3-phase4-supervised.json\` (full roots and truth Q maps),
\`oracle3-phase4-supervised.weights.json\` (inference weights),
\`oracle3-phase4-supervised.train.json\`,
\`oracle3-phase4-supervised.evaluation.json\` and
\`oracle3-phase4-supervised.heldout-details.json\`. CI archives these and
logs. Source, unit tests, and a committed JSON experiment contract are
committed **before** evaluation. Numerical results may only be committed
and claimed after the actual CI run succeeds.

**Next priority:** if held-out Q regret supports a useful new value
approximation, expand state distribution via approximate policy iteration
(including scratching and across-category switching) and run a locked
final-BP head-to-head against Oracle 1.0 at substantially larger n and
with a valid paired/game-cluster uncertainty calculation.
