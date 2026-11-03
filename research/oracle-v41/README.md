# Oracle iteration 41 — exact reward-preserving Markov quotient (NOT an early-game optimality certificate)
Date: 2026-11-03. Research only; no changes to main or live Oracle.

## Mathematical contribution
A scorecard with 28 entries can be replaced, for purposes of **all future expected final Big Points**, by the tuple
`z=(k[7],h[7],v[7],baluts,total)`, where:
* `k[c]` is remaining number of slots in category c;
* `h[c]=min(threshold[c], categorySmallTotal[c])` for fours/fives/sixes/choice, zero for others;
* `v[straight]` and `v[fullHouse]` are positive-scoring entry counts, zero for other categories;
* `baluts` is the number of positive Balut entries;
* `total` is **uncapped** aggregate Small Points, necessary for the exact terminal 300/350/400/450+50 bonus.

The next score `x` depends only on dice and category, not the columns. After a legal category score, update `k[c]-=1`, `total+=x`, capped threshold progress `h[c]=min(threshold,h[c]+x)`, successful Straight/House count or Balut count as applicable. A scratch is `x=0`. The game assigns a particular free column depending on high-score rules, but **column identity has no impact on future dice probabilities, legal categories, category bonuses or terminal reward**. All score histories sharing z have identical immediate action sets and identical successor z for any action/outcome. The terminal reward is a function of z exactly. By induction over remaining slots, **their optimal Bellman values and every legal current action Q* are equal**. This is an exact quotient, not a relaxation. The theorem applies at all 28 horizons.

## Actual execution and measurements
Source: `oracle_v41.mjs`. Independent test source: `oracle_v41.test.mjs`. Run `node --test research/oracle-v41/oracle_v41.test.mjs` in a Node environment. Container/Python execution was unavailable during this run, so the committed Node test file was **not** executed in Node. Instead, a separate JavaScript implementation of the same mathematical transitions and an independent raw terminal scorer were actually executed in the tool's V8 runtime:
* 252/252 unordered five-dice histograms generated.
* 10,000 terminal scorecards: compressed terminal Big Points = independently calculated raw category bonuses and total Small Points bonus, 10,000/10,000 pass.
* Two constructed legal 20-turn states (8 prior filled cells), every one of 252 dice histograms and all seven currently open categories: 3,528/3,528 successor quotient transitions agree with independently recompressed scorecards.
* Numeric arithmetic for these comparisons is **integer-exact** (JS Number integers safely below 2^53), so no Float64 rounding concern for the discrete terminal reward checks.
* Memory footprint of z is O(7) integers rather than 28 scorecard entries, but **no actual speedup, Bellman state count or cache hit rate was benchmarked**. Multiple raw histories can collapse to one z; compression ratio not measured.

## Explicit non-success
**0 globally certified ordinary 20–28-turn current actions. 0 actions pruned.** No full 20–28-turn seven-category Bellman calculation, no L/U root action intervals, no comparisons to preexisting exact 10–14-turn Q* fixtures were performed in this iteration (the complete v32+ local research ZIP and container execution were unavailable). The 20-turn states were constructed, not the previously locked 36 observed cases. Therefore there is **no measured proof gap** and no claim that a nontrivial hold/reroll is optimal. The terminal reward and transition tests validate the quotient lemma only; they are not a substitute for Bellman-Q reference tests. This is an exact structural tool that may enable future memory reductions, NOT a proof of the user's requested early action or all-28 optimal policy.

## Next work
Implement the quotient in the real exact Bellman engine, test full legal hold/score actions against unchanged Q* fixtures, measure quotient cache reduction and try decision-directed AND/OR proof on the 36 observed 20–28-turn roots. Keep exact 1–7-turn Bellman and all seven categories. Do not label a compressed-state equality theorem as global action certification.
