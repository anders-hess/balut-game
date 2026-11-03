# Oracle v37 — multi-use quota stochastic stopping: early optimum STILL UNSOLVED

**2026-11-03. Research-only, no main/live changes.** This is a genuinely new mathematical and implemented lower-bound component, **not** a globally optimal 28-turn Oracle. **0 normal 20–28-turn top actions certified; 0 current score/hold actions pruned.**

## New mathematics

V36 tracked the fair-dice distribution of the rival's **first** future use of a category c, but allowed its later c scores to be selected pathwise with perfect hindsight. V37 enforces **ALL k_c future scoring occasions** of c in one finite-horizon, nonanticipative stochastic k-stopping dynamic program. The rival may skip c in any future turn while still having enough turns to fill all k_c slots, with up to two adaptive fair-dice rerolls on each scoring occasion. Other category quotas are *relaxed*, so this remains a valid adversarial lower envelope under any globally adaptive seven-category virtual rival strategy.

Given candidate score c(x) now, rival score d(y) now, and first future c score z, use the original valid nonanticipative policy exchange: score c now, then replace the virtual rival's first c(z) by d(z), subsequently follow its virtual policy. For threshold c, the exact difference in its terminal +2 Big Point reward is:

`A_c(z,w)=2*(1[filled_c+x+sum(w)>=threshold_c]-1[filled_c+z+sum(w)>=threshold_c])`,

where w comprises all k_c−1 subsequent c scores. All other reward differences are bounded below pathwise by `B_d(z)`, the minimum d-row bonus difference plus the exact staircase total Small Point bonus difference over a safe reachable interval. Because B_d may depend on d(z), minimize it over all histograms with the same c score, a further *safe* relaxation. The terminal objective `A_c(z,w)+B_d(z)` is then minimized by a quota-aware stochastic Bellman state `(turns_remaining, c_slots_remaining, first_c_score, later_c_score_sum)`, with exact fair-roll multiplicities and all legal holds.

All expectation minimizations use downward-rounded signed integer fixed-point scale 10^8; current rival max/reroll propagation uses upward rounding. For each d/y take the **maximum** of v36 first-use lower and new v37 multi-use lower, preserving validity. For Straight/House/Balut candidate scores, retain v36 first-use. All seven category choices remain available to the virtual rival; none are silently removed. The existing 1–7-turn exact Bellman engine is untouched; this research component is **not** a replacement/fallback.

## Executed results (same fixed candidate comparison)

All **36 unchanged actually visited first-roll roots**, 20–28 turns remaining. Deterministic candidate = first legal Fours/Fives/Sixes (Fours in all 36). For each candidate, evaluate **every** present score rival and **every** legal hold/reroll rival: 212 scoring rivals + 716 holds across the 36 cases. This does **not** search all seven possible candidate scores at all roots; compare only against v36 on the **same fixed candidate**, not v36's separately reported best-of-candidates 4.2954 BP result.

| Metric | v36 first-use | v37 all-k-use |
|---|---:|---:|
| Mean upper bound on max rival advantage, expected final BP | 5.3726686667 | **5.2398376581** |
| Roots with strict improvement | — | **34/36** |
| Largest per-root improvement | — | **0.59540420 BP** (observed root #24) |
| Certified normal early optimal top actions | 0 | **0** |
| Pruned score/hold rivals | 0 | **0** |

2,167 future rival-score-value cells had a strict lower-bound improvement. Measured sum of root runtimes ~272 s; peak RSS ~158 MiB in local Linux batches. These are *proof uncertainty* bounds, not actual optimal-policy regrets.

## Verification

- **199/199** current action Q-difference upper comparisons versus **five unchanged 10–14-turn exact Bellman reference roots** for ten available Fours/Fives/Sixes candidate scores: **zero violations**, minimum slack +1.20139058 BP. 142/199 rival-action upper bounds improved over v36, maximum individual reduction 1.35607845 BP. An additional **408/408** action-difference regression covers every legal candidate on all five unchanged exact Bellman reference roots, using v37 multi-use for Fours/Fives/Sixes and the valid v36 first-use for Choice/Straight/House/Balut; minimum slack +1.00581984 BP, zero violations. See [full reference audit](test_all408_v37.py). The stored exact-Q reference numbers are Float64, so these are regression checks, **not** formal interval certificates of Q*.
- Independent arbitrary-precision `fractions.Fraction` two-reroll solver checks the one-turn kernel and the genuinely **two-turn/two-quota** k-stopping DP, not using the sparse-matrix implementation. Fixed-point floors enclose both exact rational results.
- All 4,116 legal histogram/hold states and 253,848 weighted transitions checked, each fair-dice transition row totaling 7,776.
- The final standalone ZIP was freshly extracted. Both test commands passed separately; a combined shell invocation timed out after the first test, so it is not claimed to have passed as one command. The **GitHub copy was not separately run in GitHub CI**. SHA256 ZIP: `0132e6c9f27eb334d24ff0c99d5eeb343f9b3883b55b0d2717ee5d3418abbc49`.

## Code and reproduction

- [Source](multistop_v37.py), [independent exact-rational and Bellman tests](test_v37.py), [36-root runner](run_v37.py), [aggregate](summary_v37.json), [checks](run_checks_v37.sh).
- This research branch inherits v34 and v35 modules and compressed immutable fixtures. From repository root, with Python 3.11+, numpy and scipy: `bash research/oracle-v37/run_checks_v37.sh`. The check restores original compressed fixtures, runs exact rational tests and all five frozen Bellman references. Full root rerun: after checks, `cd research/oracle-v37 && OPENBLAS_NUM_THREADS=1 python run_v37.py 0 3 replay.json`. Batch all 36 roots in chunks.
- The **full 25-file standalone locally verified package** with every frozen per-root JSON, test report, and dependencies is available in the Balut ChatGPT conversation as `Balut_Oracle_2_Iteration_37_Multiuse_Quota_Stopping.zip` (SHA above).

## Next research step

The new quota-aware stochastic relaxation is **stronger but still 4.77–5.72 BP away from certification** for these fixed candidates. The remaining six category outcomes and their bonus progress are adversarially decoupled from fair dice. A meaningful next step is a **two-category joint quota stochastic stopping** with both category thresholds tracked, or a nonanticipative information-relaxation martingale penalty. Do not substitute a better bound for a proof, and do not claim the user's all-28-turn optimality objective has been met.
