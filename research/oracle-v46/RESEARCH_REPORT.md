# Balut Oracle feasibility experiment: v46 exact reward-potential quotient

**Date:** 2026-11-03  | **Scope:** first of three feasibility gates | **Verdict:** better exact solving in some late-game instances; **NOT a proven globally optimal current action with 20–28 remaining turns**.

## Why this is a mathematical change

The old exact quotient (v44) keyed a state by remaining category quotas `k[7]`, four capped threshold-progress counters `p[4]`, completed Straight and Full House success counts, past Balut success count and uncapped total Small Points. This retained information which affects the **already accrued** payoff, but is irrelevant to the **future incremental** optimal payoff.

Write the final Big Points reward as `R_final = Phi(s_terminal)`, where the exact potential for any original reachable partial card is

`Phi(s) = B(totalSmall) + 2*pastBalutSuccesses + sum_{c in 4s,5s,6s,Choice} 2*[pastSmall_c >= threshold_c] + 4*[Straight is filled and all four positive] + 3*[Full House is filled and all four positive]`.

For any legal future score event `s -> s'`, pay `r(s,s')=Phi(s')-Phi(s)`, and for a hold/reroll event pay zero. The sum telescopes pathwise: `R_final = Phi(s_initial) + sum_future r(s_t,s_{t+1})`. Therefore optimizing the expected *sum of incremental rewards* preserves exactly the full future adaptive `Q*(s,a)`, after adding the constant `Phi(s_initial)` to every action. This is **not** a relaxation or policy-approximation.

The value-to-go can be keyed by:

- All seven remaining quotas `k[7]`.
- Four threshold progresses `p[4]`, capped at success thresholds, or a `DEAD` sentinel whenever `p_c + k_c * maxSingleSmall_c < threshold_c`. Once DEAD, the actual historic total can never make the category bonus reachable again.
- Only two bits saying whether Straight/Full House have no prior zero entries. Once broken, their all-positive bonus can never be achieved. A completed all-positive row is accounted by `Phi`.
- A small-point bonus *phase*: exact total below 450, and `450+(total-450)%50` above 450, since subsequent bonus increments repeat each 50 Small Points. If even the physical maximum remaining Small Points cannot reach the **next** Small Point bonus boundary, the phase is replaced by a permanently `LOCKED` sentinel and every future increment for that bonus is zero.
- Past Balut count is **not** included in the state: `+2` is paid immediately in the incremental reward every time a positive Balut is scored; its past contributions are already in `Phi`.

Physical score maxima used for the irreversible-unreachability checks are `[20,25,30,20,30,30,50]` for Fours, Fives, Sixes, Straight, Full House (safe overestimate), Choice and Balut. For every possible legal future, these checks cannot discard any bonus attainable by that future. Induction on the number of future scores gives equality of optimal Bellman action values for the old and the reduced model in exact real arithmetic. Computed values still use IEEE Float64, **not certified outward-rounded intervals**.

## Executed checks

- **70,000** random legal score transitions across 2,500 full 28-turn traces; scorecards mixed realistic positive results and scratches. Verified `(Phi(after)-Phi(before)) == shaped_increment` and `shape(raw_after) == advance(shape(raw_before))` at each transition; **0 failures**. 22,882 events changed credited bonus reward. 51,000 separate periodic Small Points bonus difference checks, **0 failures**.
- Compared **all 394 current action Q-values** (every positive/zero category score and each nonredundant hold) across **16 independently generated 1–5-turn states** against the unmodified v44 exact Bellman. Largest absolute difference: **4.263256414560601e-14 Big Points**. Values were calculated separately, not fitted. The old solver and new solver both evaluate all future 7-category adaptive legal actions wherever relevant categories are open.
- Independently calculated two positive category current-score action Q-values with Python `fractions.Fraction` in a two-turn state, both agreeing with v46 C++ to better than 1e-11 BP. The earlier 1-turn full-action `Fraction` check and 92 frozen exact-Q containment checks in the inherited v45 package continue to run. **Frozen 10–14-turn exact-Q roots were not freshly fully solved by v46.**
- Source: `exact_reachable.cpp`, `test_reachable.cpp`, `audit_differential.py`; original v44 unmodified under `oracle_v43_45/`. No approximate continuation or silent fallback is present in either C++ exact solver.

## Actual performance and explicit failures

Platform: Linux x86-64, AMD EPYC 9V74 virtual machine (5 visible CPUs), g++ 14.2.0 with `-O3 -std=c++20 -DNDEBUG`, Python 3.13.5. Figures below are single-run timings of particular constructed but legal scorecards, not representative population estimates or worst-case guarantees.

| Remaining | Example | Old v44 unique states | New v46 unique states | Old time | New time | Status |
|---|---|---:|---:|---:|---:|---|
| 3 | Seeded legal card | 419 | 138 | 0.197 s | 0.051 s | both exact Float64 |
| 4 | Seeded legal card | 3,644 | 386 | 1.76 s | 0.19 s | both exact Float64 |
| 5 | Seeded legal card | 28,970 | 2,225 | 13.91 s | 0.90 s | both exact Float64 |
| 6 | Seeded legal card | cap 30,000 hit | 3,777 | ~14.85 s before cap | 1.70 s | old unresolved / new exact Float64 |
| 7 | Seeded legal card | cap 30,000 hit in prior test | 27,452 | ~14 s before cap | 13.25 s | old unresolved / new exact Float64 |
| 8 | Seeded legal card | not run | 37,464 | not run | 18.11 s | new exact Float64 |
| 9 | Seeded legal card | not run | not completed | not run | >17 s | **new timed out**, unresolved |
| 7 | Deliberately bonus-active, p near all thresholds | cap 30,000 hit | not completed | ~14.54 s before cap | >12 s | **new timed out**, unresolved |

For the 7-turn seeded card: 27,452 cache states, 718,450 cache lookups, 13.25 seconds, measured peak RSS 3,428 KiB. For the 8-turn seeded card: 37,464 states, 1,076,203 lookups, 18.11 seconds, peak RSS 3,948 KiB. These are per-invocation measurements; the static executable and OS effects contribute to elapsed times. The 9-turn timeout and hard 7-turn timeout are not statements of mathematical impossibility.

**Important nuance:** The speed improvements mix **state reduction** and secondary implementation optimizations (precomputed scores and hold denominators); the change in *number of unique states* is attributable to the new exact quotient. The 5-turn example improves unique-state count by ~13.0× and elapsed time by ~15.4×. These figures cannot be extrapolated directly to the 28-turn opening. The 7-turn difficult card remaining unresolved means the requirement to solve **every** 1–7-turn input within a practical budget is not yet satisfied.

## Early-game certificate gate

| Metric | Result |
|---|---:|
| Global optimal ordinary 20–28-turn top choices proved | **0** |
| Competing holds/score actions pruned at 20–28 turns | **0** |
| Full 28-turn Bellman Q for opening actions | **None** |
| Formal numeric action-proof certificates | **None** |

Do not infer any top-choice guarantee from the exact state-compression theorem. The next feasibility experiment must integrate the stronger v31 seven-category admissible quota upper with exact/bounded AND/OR for **all** present actions, then demand action elimination, not only a smaller generic bound. This branch remains separate from main/live.

## Reproduction

`bash run_checks.sh` compiles old and new C++20 engines, executes raw-score potential-invariance tests, v45 reference and independent `Fraction` checks, and re-runs the 394 current-action exact Q comparison. `python capacity_probe.py --quick` regenerates selected 3–5-turn performance tests. `python capacity_probe.py --extended` adds explicit bounded long-horizon and hard-bonus probes; expensive and may return `UNRESOLVED` without fallback. The committed result files include `audit_results.json`, `h7_result.json`, `h8_result.json`, `nine_turn_probe.json`, and `capacity_summary.json`.