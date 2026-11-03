# Balut Oracle — integrated research v43–45 (2026-11-03)

**Global objective preserved:** expected FINAL Big Points under fully adaptive optimal choices in all seven categories across the remaining 28 turns. **No globally optimal ordinary early action proved. 0 certified, 0 pruned.** This research did not touch production or `main`.

## Completed together

1. **Rule/quotient audit (v43):** independent 252x7 score calculations (1,764 outcomes) checked against C++ and Python; corrected Straight 1-2-3-4-5=15 and 2-3-4-5-6=20. 10,000 random complete raw scorecards gave identical terminal Big Points in the quotient representation, and 10,000 state transitions agreed with recompression. Target column changes (right for high score) do not affect future legal categories or terminal reward in current rules; this assumption must be revisited if gameplay changes.
2. **Native exact Bellman (v44):** standalone C++20 solver on the exact reward-preserving compressed state. It enumerates all 252 unordered first-roll histograms with multinomial weights, all 210 possible useful holds across the dice space, and two adaptive rerolls. It scores all current legal categories (positive points and forced scratches). A complete exact solution is required for <=7 remaining, with explicit `EXACT_RESOURCE_LIMIT_NO_FALLBACK` on budget/time failure. It does **not** claim that seven diverse remaining slots fit the tested 30,000-state cap; resource exhaustion was observed.
3. **Actual feasible-policy lower (v45):** for each future category, use its allotted turns, optimize expected immediate category Small Points with up to two rerolls, and score a legal category every turn. Full end-score expectation is evaluated by *exact integer convolutions*, including total-Small-Points bonus, threshold categories, Straight/House all-valid conditions, and Balut counts. The per-action lower is floored to integer micro-BP, not Monte Carlo.
4. **Decision-directed integer AND/OR interval model (v45):** all available present scoring/hold actions get exact-integer rational lower and upper bounds. Upper uses a safe but loose pathwise maximum; lower comes from the feasible fixed-category policy. Chance probabilities use integer multinomial multiplicities with common denominator `1,000,000 * 7776**r`. A one-future-turn exact AND/OR expansion strengthens a selected postscore state, with integer floor/ceil projection back to micro-BP. Actual strict proof condition is checked by integer cross-multiplication. No Float64 proof certification.

## Frozen independent Q-reference test

Five unchanged 10–14-turn reference roots; **92/92** actual legal action values contained in the new intervals, **0 violations**. These stored reference values are binary64 and do not constitute independent exact rational Q certificates. An independent `Fraction` solver checked **16 actions** in a one-turn instance and **two positive score actions** in a two-turn instance against the C++ native Bellman, with error below 1e-12.

## Observed early tests (36 previously locked visited V6 states)

All 36 scorecards and first rolls from `observed_early_cases_v28.json`, with 20–28 remaining turns, tested with all current scoring and hold alternatives. **964 action intervals; 0 globally certified top choices; 0 pruned actions.** Mean current-candidate proof gap **28.065274 BP**, min **22.586469 BP**, max **32.657213 BP**. Sum of per-root elapsed measurements ~50 sec, batched separately to bound memory. The new physical envelope is **strictly weaker** than earlier v31 and v37 rigorous upper/comparison bounds; its purpose is proof-engine integration, not improved certified decision quality. Do not promote it to production.

## Actual decision-directed expansion

On observed root #0 with 28 turns left and dice `[4,1,3,4,5]`, all seven *current score actions* were expanded by one additional stochastic turn, with exact integer intervals. Score Fours 8: lower -0.8236→-0.6222 BP, upper 32→31.8382 BP. Choice 17: lower -1.1583→-0.9846 BP, upper 32→31.7114 BP. All 30 current legal actions remain possible optimal choices; the best lower is a hold of both fours, with remaining proof gap **32.621777 BP**. The current holds were not expanded further in this targeted test. Expansion took ~12.58 sec and process peak RSS ~98 MiB.

## Critical limitation and next go/no-go decision

Neither an exact 20–28-turn Bellman tree nor a global certificate has been produced. The pure physical upper is too loose; re-integrate the stronger v31 seven-category quota DP (not present in the available local package) or construct a genuine dual information-relaxation penalty before performing large AND/OR expansions. Aim for proof-directed narrowing of *hold* action competitors, as well as scores. The current integrated kernel makes interval arithmetic, exact-small endgames, immutable current actions, and independent verification concrete, but is a **research scaffold** rather than a breakthrough.

## Reproduction

`bash run_checks.sh` tests the independent score/quotient contracts, frozen Q references, independent rational small-horizon solver and native benchmark. `python run_partial.py 0 8` etc. regenerates the 36-root results in batches; consult `observed_metrics.json`, `refinement_case0.json`, `exact_benchmark.json`. The included binary is intentionally omitted; compile from C++20 source. No external packages required, Python >=3.10, GNU g++ C++20.