# Oracle v34 — stochastic future-category exchange (2026-11-02)
**Result: NOT SOLVED. Zero globally certified ordinary 20–28-turn top choices.**

## Mathematical result
For any legal current immediate scoring action c(x), compare to an arbitrary globally adaptive rival strategy B, including initial rerolls. A legal randomized strategy A scores c(x) now, privately simulates B's current-turn rerolls and category d(y), then follows B's virtual strategy on identical real future dice. If d != c, A scores d(z) at B's first future c(z), repairing the exact category quota mismatch. This is nonanticipative. The final Small Points difference is c(x)+d(z)-d(y)-c(z), or c(x)-c(y) if d=c.

Compute a pathwise integer lower bound D_c(d,y) on final Big Points difference by minimizing over all future z, all independently reachable other row scores, exact Fours/Fives/Sixes/Choice thresholds, Straight/House all-four success bonuses, Balut events, and actual piecewise terminal Small Point bonus. Then maximize -D over all legal present holds/score decisions and both rerolls using exact multinomial integer DP with denominator 7776^r. For every rival action b,
Q*(s,b) - Q*(s,score c) <= M_c(b).
This bounds **true globally adaptive expected FINAL Big Point regret** without assuming a heuristic continuation. The bound's sign is tested with exact integer/rational arithmetic; floats only for human-readable display.

## Measured
- 36 unchanged genuinely observed 20–28-turn first-roll scorecards (four per horizon), r=2.
- 248 legal immediate score candidates and 4,940 current hold comparisons across candidates, plus all legal rival score actions.
- **0 certified top choices, 0 weak top choices, 0 rival score or hold eliminations.**
- Best current-score action per case: mean certified *upper bound on regret* 4.3241745931 BP; min 3.1862068473, max 5.6111111111 BP. NOT measured true regret and not directly comparable to v32's different-candidate bound.
- 252 dice-score checks, 210 exhaustive held-dice probability enumerations, 7,800 independent terminal payoff comparisons, all passed.
- Five immutable exact Bellman reference roots, 92 Q actions, 408 action-pair upper-difference checks: 0 violations; smallest numerical slack 1.2085307317 BP.
- Python 3 Linux about 1–2 seconds compute per observed root; 99MB RSS for one standalone representative root.
- The special constructed v33 last-roll Straight20 weak result is reproduced at r=0, but not certified at r=1 or r=2.

## Full reproducible artifact
The self-contained Python source, independent tests, unchanged exact-Q reference and observed fixtures, three 12-case benchmark outputs and aggregate summary were created and freshly re-extracted/tested in the user's ChatGPT Balut project:
`Balut_Oracle_2_Iteration_34_Stochastic_Exchange_Regret_Bounds.zip`
SHA256: `6d8c2e52b0351978209a5d52959dd8f0da6b7d6906b7f39f7d6ba272b9930c06`.
Run `bash oracle_v34/run_checks.sh` after extraction; `RUN_BENCH=1 bash oracle_v34/run_checks.sh` regenerates all 36 roots.

**Limitation:** This method certifies regret of an immediate score action, not that a hold is optimal. Worst-case future category dice z and independent terminal completions leave a 3–6 BP gap, so the user's global 20–28 optimum acceptance gate remains unmet. Next research: constrain first-future-c outcome with a nonanticipative stochastic stopping-time envelope coupled to v32's exact seven-category quota DP, or implement a verified information-relaxation dual. No live-app or main branch changes.