# Balut Oracle v47 — Step 2: admissible quota upper + all-action AND/OR

**Research only, 3 November 2026.** Zero globally optimal ordinary early-game top actions certified. **Do not deploy.** No changes to `main` or live game.

The native C++20 `quota_upper.cpp` is a **new, independently implemented reconstruction of the mathematical ADR-026 seven-category quota upper**. The original full v31 ZIP was not among the mounted source packages or GitHub research files, so **this is not the original v31 C++ source**. This implementation is combined with the v45 feasible-policy lower and the v46 exact native endgame engine.

## One-command quick verification

```bash
bash run_checks.sh
```

Requirements: g++ C++20, Python 3.10+, bash. No external Python dependencies. The script rebuilds native binaries, runs independent ordered-dice enumeration, 252x7 category-score audit, independent Fraction-based quota-Bellman test with positive scoring and all holds, native 1–3-turn original Q reference tests, 92 frozen 10–14-turn Q containment, strict 1–7-turn exact router tests, and verifies every frozen observed action interval and both selective-hold refinements using exact integer comparisons.

Full reproducibility (roughly several CPU minutes):

```bash
bash run_heavy.sh
```

## Output truth levels

- At **1–7 turns remaining**, `oracle_route.py` exclusively invokes `exact_reachable.cpp` complete finite-horizon original Big Points Bellman with *all* current legal score/hold actions. On finite resource/timeout failure it **returns `EXACT_RESOURCE_LIMIT_NO_FALLBACK`**, never the quota upper or a heuristic masquerading as exact. The documented requirement of practical completion for **all** seven-turn states remains unsatisfied.
- At **8–28 remaining**, the engine returns **integer-certified admissible L/U intervals**, not original exact Q. A top recommendation is **CERTIFIED** only on strict integer inequality `L(a*) > max_{b != a*} U(b)`; otherwise `BOUNDED_INTEGER`. None of the 36 early observed roots passed.
- FROZEN 10–14 turn Q fixtures contain Float64 exact Bellman reference values. Those are independent validation references, **not** formal rational certificates for the original game.

## Measured scope

- 36 observed first-roll roots with horizons 20–28, 4 per horizon, 964 scoring/hold actions.
- 5 frozen exact Q roots at horizons 10–14, 92 present actions.
- 3 tested dual multipliers alpha = 0.010, 0.014, 0.018.
- v45 original physical-upper gap mean 28.065274 BP; v47 rootwise mean 16.095758 BP, and per-outcome-alpha-portfolio mean 16.095291 BP.
- **0 pruned early competitors, 0 strict best-action certificates**. Additional branch-specific top-hold refinement: improvement ~0.0360 BP on observed root 0, ~0.0969 BP on root 8; still no pruning.
- Source: `RESEARCH_REPORT.md` and machine-readable `summary_metrics.json`.

## Files

- `quota_upper.cpp`: 5^7 quota-state exact *surrogate* DP, integer upward rounding, bounded root action values, branch-specific upper for post-score states.
- `bounds_andor.py`, `integer_proof.py`: inherited v45 scorecard semantics, exact-integer policy-lower convolution and chance backups.
- `exact_reachable.cpp`: inherited v46 exact original 1–7-turn engine (Float64 Bellman values, explicit failure).
- `run_gate2.py`: all-action current root interval intersection; `run_leaf_portfolio.py`: per-score independent alpha selection before chance backup; `run_selective_hold.py`: decision-directed category-score leaf refinement of a competing hold.
- `oracle_route.py`: exact/bounded strict stage router.
- `test_quota.py`, `test_conditional.py`, `test_route.py`: independent tests; `verify_results.py`: pure-integer frozen-result certificate auditor.
- Frozen inputs: `observed_early_cases_v28.json`, `reference_exact_q_v27.json`; outputs `observed_*.json`, `portfolio_*.json`, `reference_0_5.json`, `selective_hold_case0.json`, `selective_hold_case8.json`, `summary_metrics.json`.

See `RESEARCH_REPORT.md` for proof, limitations, negative result and next strongest research route.