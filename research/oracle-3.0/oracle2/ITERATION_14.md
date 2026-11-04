# Oracle 3.0 — Iteration 14: Direct action-Q distillation from Oracle 2.0

**2026-11-04 — separate research branch, parent is verified iteration 13.**
North Star unchanged: maximize expected final Big Points, seven categories × four
boxes, every roll/hold/scratch/category switch. The 1–3 remaining turn exact
teacher is NOT a 28-turn globally optimal Oracle.

## Motivation
Iteration 13 trained a neural scorecard continuation V* approximation and
measured native EXACT_FLOAT64 action-Q regret on 36 held-out decision roots.
Neural mean Q regret 0.03330 BP versus frozen Oracle BPIV 0.03732 BP, but
paired game-bootstrap interval of the difference [-0.0200,+0.0141] contains
zero. Neural model was worse than the stage baseline on value holdout MAE
(0.717 vs 0.648 BP). Do not claim the V* model improved final-game points.

**New question:** learn the *relative exact Q of each legal action directly*.
Teacher uses all exact Oracle 2.0 at-roll Q (including holds and scratches),
rather than only one V*(scorecard) target per turn. Preserve current production
BPIV decision values as a feature and correction prior rather than starting
learning from scratch.

## Fixed design and dataset partitions
1. Reuse the immutable iteration-13 GitHub Actions artifact from run
   41881936877 (artifact name oracle3-phase4-exact-supervised):
   **60 games, 180 Q roots, 3,984 legal Q labels**. These are ALL training
   now. They were previously used partly for the prior *different* study's
   test, but none are used for this new study's validation/locked test.
2. Generate **96 NEW game trajectories**, seed 920200000–920200095:
   - **24 new train scratch games** seeds 000–023; these deliberately make
     legal score-zero entries on observed dice when available in turns 19,
     22 and 24 (zero-indexed turns 18,21,23).
   - **24 new validation games** seeds 024–047; 12 normal, 12 scratch.
   - **48 NEW locked test games** seeds 048–095; 24 normal, 24 scratch.
3. On each new whole game, collect four present-roll Bellman Q references:
   three actual observed decisions with 3/2/1 turns remaining and one
   *possible but deliberately non-randomly selected* dice configuration
   with 3 turns remaining and one reroll. Every scorecard is reached via
   actual legal turns. Native Oracle2 caps 250k memo states / 12 s per call.
4. **Exactly one original game belongs to one partition**; all rolls and
   adversarial variants from that game stay together. No Q labels or
   state features from the locked test are used for normalization,
   architecture choice, shrinkage alpha, or early stopping. All material
   seed and algorithm choices are precommitted.
5. A stronger frozen baseline is actual production Oracle BPIV. Its
   independent recursive multinomial per-action BPIV is also computed
   for *all* legal score/hold actions, not only the production top choice.
   The baseline is not exact over future turns.

## Q targets, action representation, student
At each observed scorecard, dice and reroll budget:
- Teacher Q*(a) is the full remaining finite-horizon Bellman expected
  **FINAL Big Points**, including nonlinear Small Points bonus and
  all categories, from unchanged Oracle 2.0 v46.
- Train a relative value advantage:
  \`qGap(a)=Q*(a)-max_b Q*(b)\` (<=0 BP).
- Compute \`bpivGap(a)=BPIV(a)-max_b BPIV(b)\` from frozen production.
- Fit **residual** \`(qGap(a)-bpivGap(a))/10\` using per-action features.
  Relative gaps preserve the ranking without leaking unknown qGap maxima
  into inference. Both exact values and BPIV are in Big Points units.
- 43-feature action representation: 17-dimensional Oracle2 quotient,
  six dice counts, rerolls left, score-vs-hold flag, seven-category
  one-hot, six held counts, small score, held count, immediate Big Point
  change, BPIV-gap prior, and score-zero/scratch indicator.
- Compare **four candidates**: frozen production; unmodified full-action
  BPIV; weighted/regularized linear BPIV-residual; and 43→24→1 tanh
  neural BPIV-residual. Linear and neural use deterministic SGD and
  training-only normalization.
- Select architecture, training epoch and correction shrinkage alpha
  (0.15, 0.3, 0.5, 0.75, 1) solely by **validation mean exact-Q regret**;
  ties resolve conservatively to the production policy.
- Include ALL action types, including zero-score category assignments and
  alternative rerolls; train with modest weighting toward Q-near-optimal
  actions and zero-score examples, not only chosen actions.

## Mandatory gates and locked test
- Native-vs-JS scoring tests, all-action root mapping and exact Q max.
- Independent dataset audit before training (keys, 43 features, no leakage).
- Report exact Q reference coverage by seed, stage and scratch subtype.
- Held-out 48 games: exact Q-regret mean, 95% seed-cluster bootstrap CI
  for paired regret vs production, optimal-action agreement, counts of
  scratch actions, 1/2/3 remaining turns, natural/scratch trajectories,
  observed vs counterfactual dice subsets. For counterfactual dice,
  report separately: these are not sampled from natural frequencies.
- Distinct **32 fresh full-game** seeded paired smoke, seed 940000000–031,
  same frozen production versus student ONLY in last three turns, using
  **counter-based per-turn/per-reroll chance streams** to couple dice
  legally even when hold patterns differ. Report final Big Points mean,
  game-bootstrap CI, variance, wins/losses, time, p95 student-late
  inference and process RSS. 32 games cannot establish general gain.
- Do NOT deploy/change production. A lower Q regret, including a
  significant one, does not itself prove a full-game final-BP gain.

## Reproduction (repo root)
Dependencies: Node.js 22+, g++ C++20. GitHub Actions directly downloads the
frozen iteration-13 data artifact; locally place that archive's
\`oracle3-phase4-supervised.json\` at \`oracle3-prior-artifact/\`.
Run:

\`\`\`bash
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
node research/oracle-3.0/oracle2/q-test.mjs
node research/oracle-3.0/oracle2/q-fresh.mjs 96 920200000 oracle3-q-fresh
node research/oracle-3.0/oracle2/q-prep.mjs oracle3-prior-artifact/oracle3-phase4-supervised.json oracle3-q-fresh.json oracle3-q
node research/oracle-3.0/oracle2/q-data-test.mjs oracle3-q
node research/oracle-3.0/oracle2/q-train.mjs oracle3-q
node research/oracle-3.0/oracle2/q-holdout.mjs oracle3-q
node research/oracle-3.0/oracle2/q-smoke.mjs oracle3-q 32
\`\`\`

All generated JSON/weights, coverage, limitations, timing and GitHub Actions
run URL are archived. Only verified CI artifacts can be reported as results.
The earlier 2.0 v46 kernel is immutable and source blob-pinned:
\`4ce623ed663edffc4b1c9291f975aba778622227\`.

**Next gate:** if Q regret improvement is credible on the frozen test and
32-game smoke is nonnegative, expand to more diverse policy-improvement
trajectories, improve runtime and run larger 28-turn full-game comparison.
If not, diagnose overfitting and use deeper exact-action imitation, not
unjustified claims of neural superiority.
