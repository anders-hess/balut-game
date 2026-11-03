# Research report: Oracle iteration 50 — true-reward multi-turn information relaxation

Date 2026-11-03. **Research only.** All 28-turn original-game Q* values remain unresolved. No modifications to live app or main branch.

## 1. Objective and model

We continue to target `Q*(s,a) = E[FINAL Big Points | current a, globally optimal adaptive play afterwards]`. All seven Balut rules and the continuing total-Small-Points bonus are unchanged. Past scorecards are legal complete/partial four-cell rows, valid positive category values or scratch=0. The future decisions include all legal category choices and rerolls/holds (3-roll turns, 252 unordered dice histograms, 210 globally possible hold types) with correct multinomial probabilities. The current tested roll is at the **score-selection** point `rerolls_left=0`, so only three or four positive category choices are current; no claims about current holds on this test.

### Valid constructed 4-turn board

- Fours `[12,null,16,16]` (44 accumulated), Fives `[15,null,20,20]` (55), Sixes `[18,18,null,24]` (60), Choice `[26,26,30,null]` (82).
- Straight `[15,15,20,20]`, Full House `[20,18,22,22]`, Balut `[0,0,0,0]`. (All historical nonzero cells attainable with genuine fair dice and the production rule placing high Fours/Fives/Sixes/Straights from right; the Choice values are 26/26/30, **not** impossible 32.)
- Current dice `[4,4,5,5,6]`, no rerolls. Four positive legal scores: Fours=8, Fives=10, Sixes=6, Choice=24. Three turns remain after scoring.

The 3-turn board has the Sixes fourth historical score 24 and current dice `[4,4,4,5,5]`, with Fours12, Fives10, Choice22 positive.

## 2. New information relaxation across multiple future turns

Write `z` for the true reward-preserving Markov state: seven remaining quotas, capped category threshold progress, positive Straight/Full House counts, positive Balut count, and **uncapped** total Small Points. Let `R(z)` be the exact original *terminal* Big Points, including (i) all seven category bonus rules and (ii) `B(totalSmall)` with the 450+ continuing +1 per 50 rule.

Fix a current category action `c` (scores now, `r=0`) and let `n` be the number of remaining *future* full turns. Let `E` be the binary future observation `sum(first roll of final future turn) >=19`. The exact first-roll multiplicities are `m0=4668`, `m1=3108` out of `D=6^5=7776`. This event is independent of present and previous choices and **is not observed by the real player before earlier decisions**.

- `V_n(z)` is the ordinary original nonlinear-reward Bellman value with all future choices nonanticipative.
- `J_{n,e}(z)` is the **clairvoyant relaxed value** when the event `E=e` is disclosed *before* every preceding future decision, and the final turn's initial roll has its true conditional distribution given `e`. The player still has all legal within-turn rerolls, stops and category choices. Therefore `U(c) = sum_e (m_e/D) J_{n,e}(next(z,c,dice))` is a mathematically valid upper on the actual `Q*(s,c) = V_n(next(...))`.

For any original nonanticipative current action `c`, define `psi_c(e)` with `barpsi_c = sum_e m_e/D * psi_c(e)`. The penalty `M_c(e)=psi_c(e)-barpsi_c` has **exactly zero conditional mean** for that action. The two-level dual upper for an oracle choosing its present score based on future `E` is

`D_psi = sum_e (m_e/D) max_c [ J_{n,e}(z_c) - psi_c(e) + barpsi_c ] >= max_c Q*(s,c)`.

Using `psi_c(e)=lambda*J_{n,e}(z_c)` with `lambda` in `{0,1/4,1/2,3/4,1}` is a valid diagnostic penalty family. At `lambda=1` it removes **only** the advantage of knowing `E` at the current choice: `D_1 = max_c U(c)`. It cannot remove the separate advantage of knowing `E` during future decisions. **Do not mistake D_1 for exact original Q*.**

## 3. Exact integer dynamic programming

For a fixed full original Balut score state and legal remaining quota sum `n`, let `W_0(j)` be max legal immediate original terminal reward (if n=1) or optimal next state numerator (if n>1), evaluated on unordered dice histogram `j` after 3rd roll. Both scores and the terminal reward are exactly integral. For each dice state `j`, the one- and two-reroll backups are obtained by optimizing either stop or all legal hold transitions and summing **integer** conditional probabilities, normalized to common denominator `D` on every 5-dice reroll stage.

- Ordinary 1-turn value numerator: `sum_j multiplicity(j)*W_2(j)`, denominator `D^3`.
- Event-conditioned last 1-turn numerator: `sum_{j in E=e} multiplicity(j)*W_2(j)`, denominator `m_e*D^2`.
- Every preceding full turn multiplies each denominator by `D^3`; for `n` total future turns, original denominator `D^(3n)`, conditional denominator `m_e * D^(3n-1)`.

The implemented `multiturn_native.cpp` memoizes both kinds of original-game states and computes **all** future multi-category choices. For `n<=3` future turns (tested current 3/4-turn boards), integer numerators are bounded in magnitude by `128*D^9`, strictly less than signed `__int128` maximum `2^127-1`; no integer rounding or float conversion occurs inside that engine. Full fractions and strict proof tests are reconstructed by a separate `verify_certificates.py` using Python big integers.

## 4. Measured results

| Current remaining turns | Positive current score actions | Exact original Bellman current best | Worst competitor upper | Strict certificate margin | Native conditional memo states | Native runtime |
|---|---:|---|---|---:|---:|---:|
| 3 | 3 | Fours 12, 16.65553270026016 BP | Fives U=16.64875689063710 BP | **+0.006775809623 BP** | 216 | ~0.20 s |
| 4 | 4 | Fours 8, 15.62300795406228 BP | Fives U=15.62289643110617 BP | **+0.000111522956 BP** | 2,940 | ~2.46 s |

All current category scores are positive. `3/3` current competitors are globally strictly dominated on the four-turn scorecard, and `2/2` on the three-turn board; these are **valid short-horizon certificates** based on exact original Q lower vs valid relaxed U upper. They are not nontrivial early 20–28-turn certificates.

The four-turn case's *true exact Bellman* `Q(Fives)` is ~15.61890125014546 BP, smaller than its already tight optimistic dual upper ~15.62289643110617 BP. The certifier uses **only exact common-denominator integer comparisons** of full original Q and each competitor's valid U. See the reproducible `v50_results.json` for the exact positive difference numerator, denominator and all current-action interval bounds.

| Dual metric | 3-turn | 4-turn |
|---|---:|---:|
| Unpenalized future-knowledge gap | 0.011674165 BP | 0.013204143 BP |
| Perfect current-choice penalty residual | 0.001458506 BP | 0.003812269 BP |
| Reduction of this clairvoyance gap | 87.5% | 71.1% |

**Important nuance:** The perfect penalty uses the *exact conditional* continuation values and consequently is not a tractable 28-turn heuristic. A short-horizon tight dual is not an early policy algorithm.

**Capacity observation:** 216 memo nodes and ~109.7 million weighted hold operations for 3 turns versus 2,940 nodes and ~1.493 billion weighted operations for 4 turns (~13.6x). A straightforward Python big-integer implementation of the same 4-turn conditional DP did not finish within a 100-second test; the optimized native solver completed in ~2.46 seconds. This demonstrates implementation efficiency, not practical 28-turn feasibility. The program intentionally rejects horizons above 4 instead of risking a 128-bit overflow or pretending approximate results are exact.

## 5. Independent reproducibility

A fresh extracted archive's `bash Oracle_v50/run_checks.sh`:

1. Recompiles the new integer conditional/reward-coupled DP and **independently authored prior** C++ original-game Bellman.
2. Recomputes 3- and 4-turn original exact Q roots and verifies **all 7 positive present score actions** within 1e-11 BP of separately computed precise fractional Q.
3. Recomputes the conditional future-information upper with exact integers and verifies each rival U and strict positive action gap via Python `Fraction` (no numerical tolerance in the certificates).
4. Tests zero expected value of martingale penalties for each action and all lambda choices by exact rational calculations.
5. Runs a separate, much slower independent Python big-integer original Bellman and event-conditioned 3-turn model, verifies all original and oracle action numerators match native exactly.
6. Validates 252 histograms/210 legal hold types and correct 3-roll probability normalizations, checks all historical scorecard entries are actually achievable, and verifies the total Small bonus thresholds.
7. Loads frozen v49 opening metrics, *only as a baseline*, to ensure it is not relabeled as v50 early proof.

The independent Float64 reference checks are consistency controls; all strict certificate inequalities use native exact integer numerators plus separately implemented arbitrary-precision rational cross-checks.

## 6. No early optimality improvement

The locked *actual observed* 28-turn opening (empty board, 1-3-4-4-5, 2 rerolls, **30 current legal actions including positive scores and holds**) remains at best candidate L≈4.2514434306 BP and strongest competing U≈18.2222439263 BP, proof gap≈13.9708004958 BP. **0** early certified top choices. **0** newly pruned early competitors. **This v50 implementation did not produce any new valid Q upper bound at 28 turns.** The 3- and 4-turn certificates cannot be transplanted to the opening.

## 7. Concrete next test / pivot

The critical unresolved component is a **tractable information-relaxation dual upper for the full 28-turn state** that retains reward coupling while avoiding full exact Bellman. Specifically: keep selected nonlinear category thresholds/total-Small bonus in a small reward-state automaton, upper-majorize the remaining categories without breaking one-category-per-turn quotas, and solve the penalized (possibly scenario-wise) tail with *deterministic certified* bounds. Test first at 5–7 **hard bonus-active** turns with the original exact reference, including both current holds and scores. Only after a strict improvement there should we rerun the frozen 30-action opening. If no all-action pruning is achieved, report zero and stop repeating penalty retuning.

**No production deployment, no global optimal 28-turn claim.**