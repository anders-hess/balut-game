# Balut Oracle v51 — Exact Straight & Full House bonus automata in seven-category quota upper

**Date:** 2026-11-03. **Research only, no main or production change.** Mathematical target unchanged: globally optimal adaptive expected **FINAL Big Points** under all 28 turns, all seven categories, all legal holds/rerolls and positive/zero scores.

**NO early-game top-action optimality proof:** 0 certified ordinary 20–28-turn top actions; 0 competitors eliminated on 36 observed 20–28-turn roots. No claim of an exact 28-turn original Bellman value.

## New algorithm

The v47 7-category quota DP approximated a potentially achievable +4 Straight all-positive-row Big Points bonus by `(4/k_straight) * number of positive future Straights`, and Full House +3 analogously. This is a *valid but loose* pathwise upper majorant: scoring some but not all remaining positive Straights can yield a positive fractional surrogate despite the real final bonus being 0.

v51 **replaces both bounds with their *exact reward automata***, retaining everything else from the seven-category upper relaxation. Each all-positive category carries one extra binary `alive/dead` state when it remains possible to complete the row. A zero/scratch irrevocably makes it `dead`; completing the final positive cell in an `alive` row pays the full +4 Straight or +3 Full House, **exactly**, not fractionally. The 7-category quota vector still obeys all 28 one-category-per-turn resource and dice constraints, and all two adaptive rerolls. This is a mathematically valid stronger global upper; `Surrogate` still includes the v47 threshold majorants and affine global Small Points bonus upper, so v51 does NOT solve the original nonlinear full game.

**Pathwise proof:** For any real legal history, `Original Final BP <= G + beta_alpha + sum_future(alpha*small + non-St/FH majorant rewards) + real completion awards for St/FH`. Every term on the right is either an exact award or independently a pathwise upper. Maximizing the right side over all fully adaptive legal future policies is therefore an upper on the original `V*`. The two-bit reward automaton tracks the St/FH awards exactly. Every positive rational weight is rounded UP at micro-BP precision; chances use integer multinomial weights totaling 7,776 per roll step, so the implemented root values are also conservative. **The original 1–7-turn exact Bellman router is not replaced or bypassed**; this is a separate bound component.

## Newly measured results

- **36 frozen naturally observed 20–28-turn roots, all 964 legal present actions:** new U strictly improves *964/964* vs the frozen v47 per-leaf alpha portfolio (root per-alpha direct upper intersected with v47 per-leaf U); candidate-gaps mean **16.0952905336 → 15.4519463531 BP**, an improvement of **0.6433441804 BP or 3.9971%**. **0 top certificates / 0 actions pruned**. All action-by-action exact integer intervals and statistics in `v51_36_all_actions.json`; `v51_36_summary.json` and `check_frozen_v51.py` independently audit them.
- **Frozen normal opening [1,3,4,4,5], empty scorecard, two rerolls, 30 legal actions:** carry over the v48 exactly evaluated legal six-category policy lower. Candidate hold both fours `hold:000200`: L=**4.2514434306 BP**. Strongest rival U is hold 3-4-5 `hold:001110`: improved from **18.2222439263 → 17.2582030 BP**, leaving a **13.0067595694 BP** certificate gap, down from 13.9708004958 BP. **0 pruned**, and 0 globally certified. Integer witness denominator **60,466,176,000,000**: L numerator **257,068,526,726,016**, largest rival U numerator **1,043,537,540,041,728**; strict L>U is FALSE. All 30 direct action U improve vs v48/v47 after intersection.
- **Capacity:** Full empty scorecard, one `alpha=0.014`, 7-category quota surrogate DP: v47 **78,123** states, ~0.94s; v51 **199,998** memoized automaton states, ~2.60s. Across 36 roots and 3 alpha values, 8,390,184 DP-state evaluations, ~104s on the current Linux runtime. Extra bonus memory/CPU has a substantial cost.

## Independent verification

1. `check_fraction_bonus.py`: fully separate Python `fractions.Fraction` Bellman computes exact two-category surrogate with 1 remaining Straight and 1 remaining Full House, both positive-row completion bonuses reachable, all 13 actual legal present actions including positive Full House and held-dice rerolls. Every C++ integer upper is ABOVE the exact rational surrogate; max outward rounding slack ~2.41e-6 BP.
2. `check_invariance.py`: when both bonuses are provably dead, v51 gives EXACTLY the same 13 action U values as the v47 native solver.
3. `check_references.py`: five frozen 10–14-turn global exact Q-reference positions, 92/92 current score/hold actions below the new U, minimum observed slack **2.697084385 BP**. These frozen Q references are Float64, not exact rational certificates.
4. `check_frozen_v51.py`: validates 36 roots, 964 action intervals, all negative strict integer top certificates, `lo<=up`, and no widening from v47.
5. `run_opening_v51.py`: re-evaluates 30 opening actions at alpha micro 10000/14000/18000 and compares against the unchanged v48 six-category lower.

## Reproduction

From an extracted standalone v51 ZIP: `bash Oracle_v51/run_checks.sh` rebuilds C++ and reruns all independent tests and the frozen opening. `RUN_HEAVY=1 bash Oracle_v51/run_checks.sh` also regenerates all 36 observed roots (significantly slower). From GitHub researchbranch, execute `bash research/oracle-v51/run_checks.sh`: it reuses the frozen `research/oracle-v47` and `research/oracle-v48` inputs through sibling paths. Requires Python 3.10+ and g++ C++20, no third-party packages.

## Research decision / next strongest idea for overnight v52

The improvement is structurally valid but **still 0 pruned competitors**. Do NOT spend multiple iterations merely adding binary bonus flags. Stronger next options: (a) couple **one additive-threshold category** exactly with the seven quota model, using tightly bounded terminal bonus progress (reward automaton for Fours or Choice), with state-space resource cap and independent Fraction tests; (b) selective AND/OR expansion on the top competing *hold* conditioned on real nonlinear bonus interactions; or (c) seek alternate factorization/dual for remaining terminal Small Points bonus. First test on 2–7-turn bonus-active true-Q references before locked opening. Report 0 if unsuccessful. Full optimality across all 28 turns is **not** achieved.