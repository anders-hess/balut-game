# Oracle 2.0 — Iteration 31: EXACT seven-category quota stochastic DP UPPER relaxation

**2026-11-02, RESEARCH ONLY, no live code changes.** Standalone reproducible source and locked raw results supplied in conversation artifact `Balut_Oracle_2_Iteration_31_Coupled_Quota_DP.zip`, 348,201 bytes, SHA256 `e6bb11551883af5101c86ba085f360d264d3241dcf363dcc1dbca75a06c090fb`. Independently extracted ZIP, compiled C++ and ran `bash Oracle_31/run_checks.sh` successfully. **Not a mathematically optimal 28-turn Oracle**.

## Structural progress
The new native C++20 solver EXACTLY solves an **additive pathwise upper surrogate** with all 7 category quotas enforced throughout an entire 28-turn game. For the empty scorecard, **5^7=78,125 quota states** (78,124 nonterminal) and complete five-dice/3-roll Bellman search; ~1.0–1.4 sec/alpha native Linux. Contrast V12 Lagrangian upper: no need to relax actual category quotas. It uses valid majorants of category Big Point threshold/4-valid effects and terminal Small bonus affine envelope `B(S) ≤ beta(alpha)+alpha*S`; minimizes U over alpha grid and intersects with inherited V28 U and independent JS Lagrange U. All FUTURE choices remain adaptive across seven categories. The mathematical upper is in exact real arithmetic, not directed-rounded proof-certificate production.

## Entire 252-opening experiment
- Fair-roll weighted prior V28 upper on possible regret: **16.848734 BP**.
- New JS coupled-Lagrange bonus/category upper only: **15.380906 BP** (−8.71%).
- Native seven-category exact-quota upper: **13.460220 BP** (−20.1114% vs V28); improvement at 252/252 distinct histogram openings, STILL zero top certificates, zero additional action eliminations. Root 3-3-3-3-3 Balut score upper 23.7612→20.3481 BP, still far above valid policy lower.

## Actually observed early-game
36 prelocked actual first-roll scorecard states (4 × each horizon 20..28): average upper regret **14.140170→11.624805 BP** (−17.7888%); all 9 horizons improved 12.84–20.10%. **ZERO optimal root certificates and ZERO pruned alternatives**. These are correlated observations from four seeded game histories, not population coverage evidence.

## Verification / robustness
- All **92** legal Q*(s,a) values on five prior globally exact 10–14-turn root reference cases are <= new per-action upper (minimum observed margin +2.60983 BP).
- Independently implemented JS exact quota stochastic Bellman on four smaller quota problems matches native C++ all-action results to <2e−15 BP.
- An actual C++ indexing bug in an earlier version of allowed partial dice holds was detected by the independent one-category check and corrected BEFORE measuring/finalizing. Full ZIP retested after new extraction. Neither V27 numeric directed-rounding nor browser/iPhone timing has been integrated.

## Required next step
Need retain quota coupling but enforce more original nonlinear threshold progress in selected bonus dimensions, so future category-specific partial sums no longer receive a loose linear majorant; selectively expand only decision-critical dimensions, then test true action certification on previously actually visited 20–28-turn states. If we cannot close the remaining 13.46 BP proof gap, do not promote to optimal. New method is a substantial relaxation-engine advance, NOT original target achieved.

[Permanent ADR-026](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_026_COUPLED_QUOTA_DP_UPPER.md) records formulas, experiments and code artifact. No production modifications.