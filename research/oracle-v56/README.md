# v56 — nonlinear terminal clairvoyance with current keep/reroll actions

04:30 research iteration, based on v55. Reviewed issue #1, North Star ADR-001, v50, v55.

The previous v55 toy had no current hold/reroll action and a zero root gap. This iteration adds a real first-die observation, a choice to keep or reroll, category-specific outcome payoffs, and a nonlinear terminal reward (threshold and cross-category conjunction). Exact Bellman is computed with Python Fraction. The upper is the expected optimal offline policy after advance disclosure of **all future independent dice pairs**. This is admissible for the specified toy model by policy-set inclusion, but it is not a Balut upper.

Run `python3 research/oracle-v56/experiment.py`.

Observed: 37 reference states; 229 rational inequalities; 192 action bounds; 73 strictly certified observed toy decisions; 117 toy rivals pruned. Root exact 2923/192; offline upper 3101/192; gap 89/96 (=0.9270833). Maximum observed state gap 37/24. Runtime 0.00653s; peak process RSS 95,760 KB (shared Python runtime).

**Critical gate:** This is a deliberately small three-category, three-turn, binary-die model, not the actual seven-category four-cell Balut game. Original unchanged Q fixtures **not run**; locked [1,3,4,4,5] opening **0/30 evaluated**. **0 Balut global early certificates; 0 Balut rival prunes**. Last independently reported early opening gap remains 13.0067595694 Big Points (v51). The toy results must not be extrapolated. No production/main changes.

Next: replace toy state/score transitions with original scoring and real multinomial dice/hold outcomes; prove admissibility at every state, rerun unchanged Q fixtures, then all 30 opening actions. Full-path offline enumeration will explode, so use conditional information disclosure and martingale penalties as in v50.
