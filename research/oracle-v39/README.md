# Oracle v39 — coupled nonlinear Fours/Fives threshold Bellman (negative result)

**2026-11-03. Zero globally certified ordinary 20–28-turn root actions; zero root actions pruned. No globally optimal Oracle.** This is a mathematically rigorous two-category *relaxed subproblem*, not a full Balut Q* upper or lower bound. Main and live app untouched.

## New research
The stochastic Bellman state `(t,i,j,sa,sb)` tracks exact remaining quotas and cumulative future Fours/Fives Small Points; terminal reward is exactly the two nonlinear +2 BP thresholds at 52 Fours and 65 Fives, without linear majorization. Every turn chooses at most one row or a free skip (other categories relaxed); fair 252 initial dice histograms and all two adaptive rerolls are optimized. Exact integer transition weights; each expectation rounded **upward** at 1e6 fixed-point scale. The resulting bound is an admissible upper for this *two-row bonus-only relaxation*. Separate one-row games are an even looser upper because they may both score in the same turn. **Neither bound is a Q* bound on original seven-category final Big Points by itself.**

## Tests executed
- Independent exact Fraction complete two-turn, two-row adaptive reroll calculation: `22704902021/13060694016` BP, enclosed by rounded-up Bellman result **1.738417 BP**; 49 cached DP states.
- Joint vs independent two-row bonus upper (BP): T2 quotas1+1: **1.738417 vs 2.335130**; T8 quotas1+1: **3.811999 vs 3.879962**; T20 quotas1+1: **3.999000 vs 3.999384**; T20 quotas2+1: **3.999686 vs 3.999692**; T28 quotas2+2: **4.000000 vs 4.000000**. All inequality checks passed; largest 8,100 cached states.
- 34 of 36 frozen naturally observed 20–28-turn contexts have both rows open. Tested a **deliberately truncated one-use-each diagnostic**, with actual board prior row totals: **0/34 tighter**, 0.000 BP mean gain, 5.1 s. This is not a full original-quota or root evaluation.
- No 1–7 turn exact Bellman behavior modified. No new comparisons to full-game exact Q fixtures: standalone pair-bonus objective is not directly comparable to Q*. This is a real verification coverage limitation.
- Root action proof gap **not available** because no full-game valid Q intervals were generated. All legal root actions not assessed; **0 certified, 0 pruned**.

## Conclusion
Exact nonlinear pair-row bonus optimization saturates at almost 4 BP by 20 turns; simply adding more precision to this standalone bonus block will not solve the user's actual global root-action objective. Next iteration must produce a full Big Points admissible decomposition, or a fundamentally different decision-focused exact AND/OR proof mechanism. Do not represent this result as progress toward a certified natural early root.

**Local complete source package:** `Balut_Oracle_2_Iteration_39_Coupled_Nonlinear_Bonus_DP.zip`, SHA256 `336a2c6401091cfe19f862c21b7c77e8441e071330c52791c9288e98adb8b969`, 106 KB, includes all v37/v38 prerequisites, new scripts, tests, 36 observed contexts, original exact Q fixtures, frozen benchmark JSON. Reproduce from `oracle_v37`: `OPENBLAS_NUM_THREADS=1 python test_threshold_v39.py` and `OPENBLAS_NUM_THREADS=1 python benchmark_threshold_v39.py`. Both passed locally. GitHub branch: `research/oracle-v39-coupled-threshold-2026-11-03`.
