# Oracle 3.0 iteration 12 — cumulative integration of Oracle 2.0 exact endgame (4 Nov 2026)

## Why this replaces more blind neural training

Verified iteration-11 prospective comparison (CI 41867806939, 12 independent seeded
games) was negative: production 8.0833 final BP vs neural 0.9167 (paired mean
-7.1667 BP, normal 95% CI [-8.9203,-5.4130]); a turn-conditioned continuation
also scored only 0.5833 BP. This is enough to stop claiming that predicting a
policy's final BP is a good proxy for Bellman-optimal continuation, not enough
to extrapolate an effect size.

This iteration reuses the mathematical engine from Oracle 2.0 as an independent
supervisor of Oracle 3.0 instead of reimplementing its dynamic programming.

## Pinned provenance

Unchanged source is copied from
research/oracle-v57-real-terminal-ceiling-2026-11-04:
research/oracle-v46/exact_reachable.cpp
at GitHub blob SHA 4ce623ed663edffc4b1c9291f975aba778622227.
The immutable copy is oracle2-exact-v46.cpp in this folder. No Oracle 2.0 or
main files were modified. The v46 exact Bellman kernel is used because v57's
additional global upper bound still does NOT prove early-game top actions.
Both modules share the nonlinear Big Points game definition.

A separate oracle2-state.cpp compilation unit includes the unchanged kernel,
renames its command-line main and adds exact pre-first-roll state evaluation.
The original at-roll C++ command-line reference remains unchanged.

## Semantic bridge

The Markov quotient inputs are:
- Seven remaining category entry counts (k[7]).
- Four accumulated threshold-category Small Points: fours/fives/sixes/choice (p[4]).
- Counts of already positive Straight, Full House and Balut entries.
- Accumulated total Small Points (including scratches scored as zero).

These fields preserve the all-four-positive bonuses, category sum thresholds,
per-Balut awards and nonlinear global Small Points bonus. Column identities
are deliberately excluded from the Bellman quotient: they do not change
future category availability or total reward. Input uses the actual shared
production-parity simulator. No ML model can override a successful exact Q.

Two DISTINCT targets:
- state-boundary optimal target: optimal expected FINAL BP before the next
  initial roll; continuation label = that value minus current Big Points.
- current-roll action-Q: expected FINAL BP conditional on visible dice and
  reroll budget, for EVERY legal score/hold action.

Mixing these targets without conditioning would be a correctness bug.
The exact native solver returns EXACT_FLOAT64, not a formal exact rational
certificate. Resource limit/timeout errors are explicit; no estimate is
represented as solved.

## Executable work and tests

Run FROM repository root on Node 22+, g++ C++20 (Linux recommended):

    g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
    g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-state.cpp -o research/oracle-3.0/oracle2/oracle2-state
    node research/oracle-3.0/oracle2/test.mjs
    node research/oracle-3.0/oracle2/evaluate.mjs
    node research/oracle-3.0/oracle2/benchmark.mjs 4

Test gates:
- terminal scorecard vs native state value (both include negative/positive bonus);
- all legal present action Q and best-choice agreement in 12 last-turn JS/native
  examples (four last categories, reroll budget 0/1/2);
- two multi-category nonlinear bonus/endgame examples;
- explicit state-budget failure and malformed scorecard rejection.
- real cached-production natural late-game states with independent holdout seeds
  900020000..900020002, per-action native Q/regret, pre-roll optimal value
  labels, and separate resource coverage counters.
- optional actual hybrid policy: exact native optimal choices on last two
  turns, cached production elsewhere, explicit fallback telemetry, four seeded
  full games 900030000..900030003, preliminary paired 95% normal CI.

Workflow: .github/workflows/oracle3-oracle2-integration.yml; artifacts include
full reference labels, test outputs, hybrid game rows, and JSON summary.
CI is the execution system. This document and code being committed DOES NOT
mean it has passed; use the completed workflow status before claiming results.

## Limitations and next gate

Do NOT infer that a model improves FINAL BP from lower prediction MAE or
good late-game Q alone. Do NOT call the hybrid globally optimal over all 28
turns. Oracle 2.0 early-game v51-v57 upper bounds remain useful for optional
valid search/pruning, but do not yet certify early choices. Next steps:
1. Validate native Q and action parity, inspect failure/coverage by horizon.
2. Produce larger disjoint endgame supervision dataset with action-Q labels
   and optimal continuation targets, including solvable hard cross-category
   states and repeated freeze/regression tests.
3. Train an action-aware continuation or Q-residual estimator with exact
   endgame targets, then apply approximate policy iteration only if the
   stronger gate passes.
4. Run independent, large, seed-locked head-to-head final-BP validation with
   a game-cluster confidence interval and time/RSS measurements; no
   performance improvement claim until that gate passes.
