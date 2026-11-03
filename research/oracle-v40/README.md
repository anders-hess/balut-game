# Oracle v40: exact-integer regret-graph transitive closure — negative result
2026-11-03. User's objective **NOT MET**. 0 certified normal 20–28-turn top actions, 0 eliminated current score actions, 0 eliminated hold actions.

## New exact theorem
For every legal current action a,b,c, let U[a,b] be an upper on globally optimal expected FINAL Big Points difference Q*(a)-Q*(b). Then U[a,c] may be replaced by min(U[a,c],U[a,b]+U[b,c]), preserving global admissibility for fully adaptive future play. Compute all-pairs Floyd–Warshall on the exact-integer scaled V34 swap bounds. For each hold h, U[h,c] may similarly be replaced by min_b(U[h,b]+U[b,c]). No Monte Carlo, no learned values; integers scaled by 7776² for all current r=2 comparisons. This is a new valid *global* decision-bound refinement rather than a standalone pair-category bonus surrogate.

## Actual benchmark
36 frozen previously observed legal early positions, remaining 20–28 turns, all legal scoring categories and every hold from the current roll; 26.49 s local Linux Python. **Score pairwise bounds tightened: 0. Hold bounds tightened: 0. Score actions pruned before/after: 0/0. Holds pruned before/after: 0/0. Certified full current root top actions before/after: 0/0.** The v34 bounds are already triangle-consistent on these instances. This rules out triangle closure as a useful independent route for this dataset.

Independent exact Fraction three-action artificial Q benchmark verifies triangle admissibility and strict tightening in a positive-control example. Unchanged V27 exact global Bellman reference comparisons from V34: **408/408** admissible pairwise Q-difference upper bounds, minimum slack 1.2085307317 BP. These tests do NOT establish early certification or numeric outward rounding of any Float64 reference; the closure arithmetic itself is exact integers.

## Reproduction and caveat
Complete reproducible package in conversation: `Balut_Oracle_2_Iteration_40_Regret_Graph_Closure.zip`. It includes v39 dependencies, original 36 observed cases, full 408 Q fixture, new `oracle_v40/closure_v40.py`, `test_v40.py`, `observed_v40.json`. Run `python oracle_v40/closure_v40.py` and `python oracle_v40/test_v40.py`, plus `cd oracle_v37 && python test_exact_q_v34.py`. GitHub source `research/oracle-v40/closure_v40.py` is a compact equivalent implementation; the ZIP has the full audited benchmark script. No changes to main or live app.

## Next research
Need genuinely stronger nonanticipative future-value bound or a feasible-policy lower, not transitive tightening of already loose swap bounds. Investigate decision-directed exact AND/OR with a valid 7-category terminal bonus upper and independently verified exact Bellman <=7. Do not repeat v39 standalone pair-threshold saturation.
