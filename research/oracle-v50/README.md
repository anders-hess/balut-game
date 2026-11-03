# Balut Oracle research iteration 50 — multi-turn, true-reward information relaxation

**Status (2026-11-03):** New actual mathematical/source-code research and strictly checkable **short-horizon** optimal-choice certificates. **0** ordinary 20–28-turn choices certified, **0** early competitors pruned. No changes to production or `main`.

## Run from a fresh extracted ZIP or GitHub checkout

Requires Python 3.10+, g++ with C++20, GNU/Linux shell. No network or third-party Python packages.

```bash
cd Oracle_v50
bash run_checks.sh
```

This compiles **two different** C++ solvers: a newly implemented exact-integer conditional information-relaxation model (`multiturn_native.cpp`) and the prior independently written exact Float64 Bellman (`legacy/exact_quotient.cpp`). It reruns both on the same 3- and 4-turn scorecards, recomputes all current Q and event-conditioned values, independently checks exact rational certification and zero-mean penalties, and runs a slow independent Python big-integer full-horizon 3-turn reimplementation.

`v50_results.json` records all exact action fractions, competitor dual upper values, numeric integer certificates, physical node counts and elapsed time. `native3.json`, `native4.json` contain native integer DP numerators. `native_exact3.json`, `native_exact4.json` contain independent exact Bellman numerical references. The fixed previous **28-turn opening** status is in `frozen_opening_v49.json` and **has not been improved by this research**.

## Mathematical experiment

The current positions have 3 or 4 open scoring cells across Fours, Fives, optional Sixes, and Choice, with valid historical full-house and straight scores and significant threshold/total Small Point bonus exposure. Every current category action scores **positive** points. The current roll has **zero** rerolls remaining. **These are not early-game states, and do not exercise competing current hold actions.** Future 2 or 3 turns have all 252 multinomial first-roll outcomes and all 210 available hold types, with two adaptive rerolls and optimally adaptive choices among remaining legal categories.

Define a binary event `E` on the first roll of the *last* future turn: its dice sum ≥ 19. The artificial player is informed of `E` before earlier decisions and optimizes the ORIGINAL final Big Points objective. For any fixed present legal score `a`, this yields a global upper on `Q*(s,a)`; the exact original Bellman computation yields a lower/equal bound. A zero-mean martingale penalty on earlier choices reduces the dual bound. All probability arithmetic and comparisons use integers and Python `Fraction` (`__int128` within the proved <=4-turn domain). The event has probabilities 4668/7776 and 3108/7776.

**Main result:** On the **4-turn** board, `Score Fours 8` has an exact lower Q exceeding *every* other positive current score's future-information upper by at least **0.000111522956 Big Points** in exact rational arithmetic. `3/3` competing scores are certified inferior. All 4 actions independently match prior exact Bellman Float64. For 3 turns, Fours 12 similarly dominates 2/2 scoring rivals with an exact strict margin ≈0.006775809623 BP.

This is an *additional method for certifying short-horizon global decisions*, not evidence of scalable 28-turn certification. Unlike the previous v49 one-reroll construction, the newly revealed information crosses future category selections and a genuinely nonlinear terminal Big Point reward.

## Non-success and gate

In v49's frozen observed opening (empty card, `1-3-4-4-5`, 2 rerolls, 30 actions), current mathematically valid candidate L and best competitor U remain **4.2514434306 BP and 18.2222439263 BP**, gap **13.9708004958 BP**, 0 certified, 0 pruned. **This iteration did NOT calculate a new 28-turn full-reward dual upper**. It is **not valid** to paste the new 3/4-turn conditional-value dual into a 28-turn model and claim any new early bound. Scaling the original nonlinear reward-state DP through 28 turns is unproven and currently not feasible within the tested program.

See `RESEARCH_REPORT.md` for the derivation, exact rational witnesses, independent validations, and the next falsifiable research direction.