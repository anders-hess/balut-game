# Oracle v35 — exact pathwise terminal exchange: **ordinary 20–28 optimum still UNSOLVED**

**Research date:** 2026-11-03. **Production:** unchanged. **Outcome:** zero certified early top actions, zero current action eliminations. This is a substantive negative research result, not an optimal early-game Oracle.

## What changed mathematically

V34 constructs a nonanticipative randomized policy exchange: score category c now, privately simulate a rival's present rerolls and score d(y), then replace its first future c(z) by d(z), thereafter follow its virtual policy. The exact terminal Small Points difference is Δ=c(x)+d(z)−d(y)−c(z) (or c(x)−c(y) if d=c). All other category Big Point rewards cancel; only the two exchanged rows and the final total Small Points bonus can change.

V34 independently minimized row-bonus differences and the final Small Points bonus. **V35 computes the exact joint deterministic pathwise minimum**: enumerate all reachable future partial row totals, their all-valid indicators and associated Big Point changes, use min-plus convolution for the exchanged rows, and encode the total scores reachable in every other category as an exact integer bitset. For each future dice pair z and current rival score d(y), jointly minimize the row Big Point difference plus the actual terminal Small Points bonus difference over the full set of reachable category outcomes. A fast integer algorithm checks only the discontinuities at 300+50k and 300+50k−Δ. No Monte Carlo or heuristic continuation values are used.

This is the sharpest **policy-independent pathwise lower bound** within V34's exchange coupling, but it is **not** the stochastic value Q*: the minimization still allows a worst-case future first-c outcome z without accounting for its probability or the rival's nonanticipative stopping-time constraints. Current reroll/score action comparisons use the same exact integer/rational two-reroll adversarial Bellman as V34. Every comparison targets expected **final** Big Points under optimal adaptive future play.

## What was actually measured

- **36 locked, actually encountered first-roll scorecards**, horizons 20–28: evaluate the strongest V34 immediate-score candidate against all **212 rival current score actions and 716 rival hold actions**. V35 exact exchanged-row joint bound, other rows interval-relaxed: **0 certified top choices, 0 pruned actions, 0 tightened maximum-regret bounds**. Mean regret upper bound remains **4.3241745931 BP** (range 3.1862068473–5.6111111111).
- **Two observed roots fully enumerated** (indices 0 and 35; 28 and 20 turns remaining): all seven present score candidates, 14 candidates total, all legal current score/hold rivals, **0 top certificates**.
- **Seven selected observed roots** (indices 0,4,8,13,17,26,35): complete exact reachable-other-total terminal minimization for **11,592 future (d,y) leaf cells**. **0 cells improve on V34**. This demonstrates saturation of the deterministic pathwise method on these seven positions. It is not a claim about all 36.
- **Legal non-vacuous positive control** (two turns left): Choice row [30,30,_,_], current five sixes give Choice30, hypothetical rival future five ones gives Choice5; other rows Fours/Fives/Sixes/Straight [0,0,0,0], Full House [0,0,7,18], Balut [50,50,50,50]. Old separately minimized payoff lower = 0 BP, V35 joint exact lower = **+1 BP**, independently confirmed by enumerating every final Choice score. This validates that the method is genuinely stronger in states where bonus correlations constrain the outcome. It is NOT an early-game certificate.
- **Tests passed:** 252 independent histogram scorings, 12,000 exact staircase breakpoint checks, 2,000 exact reachable-total queries, 900 independent full-terminal comparisons and **408 action-difference bounds** against five immutable exact Bellman reference roots (10–14 turns; minimum observed slack +1.20853 BP). All current-action sign tests use exact integer/rational arithmetic; reference Q values are Float64, not formally outward-rounded.

## Interpretation and next method

The current **3–6 BP** early proof gap is **not** primarily caused by independently minimized terminal category bonuses. The worst-case exchanged-category outcomes used by V34 are actually reachable in the seven audited observed cases. No further deterministic sharpening of that same exchange's terminal pathwise minimum can resolve those cases. The next research iteration should instead enforce the **probability and nonanticipativity of the future first-category scoring time**, e.g. a certified finite-horizon stochastic optimal-stopping envelope or a valid information-relaxation dual penalty. Test every proposed bound against the same 408 exact Q comparisons and all 36 observed roots; report zero certificates if still unresolved.

## Reproduction

Source in this research branch: [joint_swap_v35.py](joint_swap_v35.py), [test_v35.py](test_v35.py), [run_v35.py](run_v35.py), [run_checks.sh](run_checks.sh), [summary.json](summary.json). Depends on the v34 research code and frozen fixtures already included in this branch's parent. From repo root:

```bash
bash research/oracle-v35/run_checks.sh
RUN_BENCH=1 bash research/oracle-v35/run_checks.sh
```

The standalone full ZIP (including 36 frozen per-root JSON outcomes and independent tests) is in the ChatGPT Balut conversation: `Balut_Oracle_2_Iteration_35_Exact_Pathwise_Exchange.zip`, SHA256 `055fc7aefff299aa32f04e2252b82c2bbf31c726042e90dfc676849f902f9310`. Fresh extraction and default checks passed. **No live-app/main changes; no 1–7-turn heuristic fallback.**
