# Gate 3 — frozen first-turn decision proof stress test

## Acceptance criterion

The only success condition is a mathematically sound and independently checkable GLOBAL first-turn action certificate for the ORIGINAL expected terminal Big Points under fully optimal adaptive future seven-category play: `L(a*) > max_{b != a*} U(b)`, all legal holds and positive scores included. A stronger feasible policy score, smaller interval, Monte Carlo estimate, or policy consensus is **not a certificate**.

## Locked target and scope

- 2026-11-03; actual previously observed fixture #0 from `observed_early_cases_v28.json` (not a constructed maximum-score special case).
- Scorecard empty (all 28 cells); current dice `[4,1,3,4,5]` with two rerolls; 30 current legal actions comprising 7 category scores (including Fours8, Fives5 and Choice17) and 23 holds.
- Fixed previously computed v47 *certified integer* upper-bound intervals from `portfolio_0_2.json`: 7-category quota adaptive stochastic DP, per-leaf portfolio alpha 0.010/0.014/0.018 with upward integer rounding and physical cap. No live code changes.
- Budget for full six-category legal-policy evaluation: `timeout 100s`, `ulimit -v 1800000` (~1.8GB virtual memory). Local observed elapsed 60.60s, peak RSS 972548 KiB. Host: Linux x86-64 CPU; no mobile/production tests.
- The complete endgame (1–7 turns) MUST be handled by exact Bellman, and can report an explicit resource failure; this experiment does not fix that universal resource limitation.

## Research hypotheses and freeze clarification

The frozen opening, its v47 action upper bounds and all legal action names predate Gate 3. The 5- and 6-category lower policies were developed during Gate 3; weights and grouping were chosen experimentally, so this is NOT a preregistered unbiased estimate of performance over all openings. **The root's exact 6-category adaptive policy and its all-action certification were checked after fixing weights** `(240,190,160,175,140,100,0)` and active set `(Fours,Fives,Sixes,Straight,FullHouse,Choice)`, with Balut fill deferred as a legal fixed-category four-turn block. The decision certificate remains mathematically valid irrespective of policy tuning because it is based on a fixed, fully specified feasible policy whose reward was calculated exactly.

## Outcome

**0 certified optimal current actions, 0 eliminated competitors.** The best feasible action lower is for holding both fours: 4.251443430555556 BP; largest rival upper is holding 3-4-5: 18.222243926311727 BP; strict gap 13.970800495756173 BP. No global optimality claim.