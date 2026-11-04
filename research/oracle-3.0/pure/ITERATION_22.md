# Oracle 3.0 — iteration 22, multi-card exact-rational Q student evaluation

Date: 4 Nov 2026. Separate cumulative research branch, no changes to main/live/Oracle2.

## Binding purity

Never use the production Oracle, its action advisor, policy, simulation distribution, heuristics, learned weights or fallback in Oracle3. This protocol uses the independent pure math-only neural, linear and stage models TRAINED AND FROZEN in iteration16 and the independently implemented BigInt exact rational Bellman teacher from iteration20. Dependencies are actively checked with pure/guard.mjs.

## Precommitted design

Source: mathematical five-die outcomes with strictly positive independent fair-dice probability; scorecard legal 26-turn witnesses; no copies of production scorecards. Construct exactly 48 **distinct seed** scorecards seeds 991000000..991000047. Fourteen six-category outcome pools construct 26 scored category entries, precisely one Fours and one Straight field remain (two turns). Each whole scorecard receives TWO possible current dice inputs with distinct deterministic seed choices, at one and two rerolls respectively: 96 root decisions total. All state dice outcomes are legal but artificially curated for bonuses, zero scoring and threshold transitions; never claim the tested distribution equals actual random gameplay. This is a stress and proof-fidelity test.

At every root, run completely exact BigInt two-turn current-roll Bellman over every legal hold and score, caching all last-turn initial-roll rational continuations by post-score scorecard and current Bellman reroll states. Every per-action numerator has common denominator 6^(15+5*rerolls); use exact integer argmax to define mathematical optimum. Crosscheck EACH action's expected final BP against unchanged Oracle2 native Float64 to <=1e-8; native is not used as rational proof source.

Download frozen **independently mathematically trained** iteration16 model and validation-selected choice via GitHub Actions artifact 13357431453 / run 41897820339. No current test data are included in these frozen weights. For four fixed policies (simple mathematical myopic, math stage, math linear and math neural) perform exact within-turn multinomial expectimax with the corresponding continuation. Rank their selected legal actions using exact rational action Q teacher (not realized outcomes). Record optimal hit count, mean/median/max exact-Q regret, computation time; neural-minus-myopic game-cluster bootstrap 95% CI across the 48 independent scorecards, averaging the two correlated roots per card.

**No new model training or tuning occurs in this iteration.** It strictly diagnoses whether earlier mathematical AI generalizes to more independent verified optimal choices. Ties count as optimal. Underlying native rational finite-horizon proof only certifies two remaining turns, not 28-turn global optimality. Neither Q regret nor heldout action accuracy alone establishes higher naturally frequency-weighted final Big Points. Do not deploy.

## Reproduce

Node22, g++ C++20, all commands from repository root:

```bash
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
node research/oracle-3.0/pure/guard.mjs
# Unpack independent iteration16 math-only weights to math-student/
node research/oracle-3.0/pure/rational-multicard-fidelity.mjs
```

GitHub workflow automatically downloads the pinned mathematical weights and archives `oracle3-rational-multicard-fidelity.json`, `oracle3-rational-multicard-summary.json`, and logs. Report results only after a verified SUCCESS run.
