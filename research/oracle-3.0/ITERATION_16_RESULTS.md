# Oracle 3.0 iteration 16 — verified coverage-directed math-only research result

**Date** 4 November 2026. **Verified** GitHub Actions [41897820339](https://github.com/anders-hess/balut-game/actions/runs/41897820339) SUCCESS on committed source `3ff7fd175b6999c9a6a749449b4a5f54ef2cb94a`.
Full raw replayable [artifact 13357431453](https://github.com/anders-hess/balut-game/actions/runs/41897820339/artifacts/13357431453); machine-readable `research/oracle-3.0/iteration16-verified-results.json` and independent score/action audit `iteration16-independent-audit.json` on this branch.

## Mathematical source and independence

Zero old-production-Oracle/BPIV imports, priors, training trajectories, learned weights or fallbacks. Transitive dependency guard **18 math-only modules inspected, 0 forbidden imports**. Immutable Oracle 2.0 exact native Bellman blob `4ce623ed663edffc4b1c9291f975aba778622227`. Own multinomial and complete within-turn expectimax. Learned policy refuses untrained >3-turn states; native exact is strictly separate.

## Actual new reference coverage

120 newly seeded complete games 960200000–119, 40 each threshold/bonus/strike, 72 whole games train / 24 validation / 24 locked test. Mathematically reachable but deliberately reward-rich scorecard states, with each of 28 scored turns replayably documented. **3,360/3,360 legal scoring witnesses, 360/360 exact pre-roll value states, 480/480 native exact at-roll roots, 8,881/8,881 legal action Q labels**, 476 score-zero action alternatives, **0 errors**. No production-state sampler. Importantly this is a **designed, rarely encountered distribution**: legal does not mean naturally frequent.

At 3 turns remaining mean Small Points **492.475**, versus ~104/184/172 on the previous independently sampled low-score distribution. In the new 120 games, **119** are past 300 Small Points and **92** have a threshold category in reach with free slots; mean current Big Points **13.617**. Balut/Straight/Full House positive occur frequently. This corrects the earlier lack of high-value challenging test states.

## Locked exact-decision test (24 new independent games, 96 Q decision roots, 1,776 native action Q labels)

| Selected model / baseline | Exact Oracle 2.0 Q regret (BP per decision) | Mathematically optimal choices |
| --- | ---: | ---: |
| Own mathematical myopic expectimax (no learned continuation) | **0.040347** | 64/96 |
| Mathematical stage mean | 0.040347 | 64/96 |
| Independent mathematical linear continuation | 0.021569 | 71/96 |
| **Neural math student (selected on validation)** | **0.017300** | **72/96** |
| Oracle2 complete numeric Bellman | **0** | **96/96** |

The 17→20→1 neural student was selected solely by validation exact-Q regret (neural **0.028940**, linear 0.029552, myopic 0.031364), then frozen before independent test. On test, neural-minus-myopic paired mean Q regret **−0.023047 BP**, 95% **game-cluster bootstrap CI [−0.054949, −0.001422] BP**. An improvement of approx. **57% relative Q regret** for this designed distribution. However n=24 independent games is small; CI is descriptive conditional on the fixed, deliberately selected test distribution. No unweighted natural-game final-BP improvement has been demonstrated.

Subgroups: at **3 turns left**, neural Q regret 0.026123 vs myopic 0.058864; at **2 turns**, neural 0.016953 vs myopic 0.043661; at **1 turn** both exactly 0. On observed-roll roots neural 0.006477 vs myopic 0.033125; on deliberately selected alternative dice 0.049767 vs 0.062012 (separate, not population-weighted). Neural V* held-out RMSE 1.1365 BP vs linear 1.1311 and stage 1.2966: the neural model does not dominate every value prediction metric, despite stronger action selection.

## Independent audit, performance and limitations

Python separately replayed all 3,360 turns with independent Balut scoring and column-placement logic; reconstructed the actual pre-3-turn scorecards; checked all 8,881 native Q action keys against exhaustive legally available holds/score entries, max(Q) equals teacher value, all 384 heldout model action/regret calculations, and all Big/Small totals. **PASS**. It did not reimplement the entire C++ Bellman recursion in exact rational arithmetic; numeric native teacher complete Float64 DP is not a formal 28-turn proof.

Data collection 14.33 seconds; train 0.25 seconds; evaluation 28.98 seconds; peak Node parent RSS 115.9 MB (native child memory not included). Math-only within-turn model approximate ~40 ms average and ~110 ms p95 per tested decision. Strictly research only, **no main/live/Oracle2 changes**.

## Next priority

Move from numerical Float64 teacher to **formally certifiable exact action choices in tractable endgame cases**, e.g. rational or outward-rounded interval Bellman; expand beyond 3 turns via search/pruning and mathematical policy iteration on independent states. We cannot yet promise mathematically certified choices at turn 1 of 28 or a full live deployable Oracle3; there is no production-policy fallback.

Reproduction instructions and precommitted protocol: `research/oracle-3.0/pure/ITERATION_16.md`.
