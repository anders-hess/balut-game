# Oracle 3.0 iteration 14 — verified result and decision

**4 November 2026, research only.** Cumulative from iteration 13. No changes
to main, live production Oracle or Oracle 2.0. Original Oracle 2.0 v46 native
exact solver source pinned at blob \`4ce623ed663edffc4b1c9291f975aba778622227\`.

## Provenance and execution

- All steps **SUCCESS**, [GitHub Actions run 41888927522](https://github.com/anders-hess/balut-game/actions/runs/41888927522), source commit \`2273b73649be80206ea6aa8c7c5dcba9e2372e55\`.
- [Complete immutable run artifact 13354085725](https://github.com/anders-hess/balut-game/actions/runs/41888927522/artifacts/13354085725): raw game/root Q tables, held-out model actions, weights, training and scoring JSON, logs.
- Exact native/Q tests **PASS**; independent all-action data integrity tests **PASS**. An independent Python cross-check of the downloaded archived results was also **PASS**, recomputing all 10,483 action keys, Q max, labels, production regrets, train-only normalization, **192/192** linear and neural locked-test actions, and 32-game paired final scores. See \`iteration14-independent-audit.json\`.
- Frozen iteration-13 **180/180** solved roots / **3,984** Q values were reused as **TRAINING**, never reused as the NEW locked test. **96 fresh complete games**, including 60 legal scratch trajectories, produced **384/384** newly solved exact roots and **6,499** more Q values. **Total 564 roots / 10,483 exact legal action-Q values**, including **240 score-zero alternatives**. **0** solver failures.
- Model training: **84 train games / 276 roots / 5,713 actions**; **24 validation games / 96 roots / 1,642 actions**; **48 test games / 192 roots / 3,128 actions**. Every source game and all its synthetic dice branches stay in one split.
- Model features: 43 state/dice/rerolls/category/held/immediate score/BPIV-prior dimensions. Weighted per-action residual target \`(exactQGap - bpivGap)/10\`, not a noisy realised final score. Strong baselines: frozen production, full-action production BPIV, linear and neural student.
- **Validation**: production average exact Q regret **0.0158655 BP/decision**; linear **0.0026365**; neural **0.0026554**. Best selected on validation: **linear residual with shrinkage alpha=0.5**, epoch 35. Neural was **not** selected (best epoch 20). Validation gain is not evidence of generalization.

## LOCKED TEST — do not tune on this

**48 distinct independent test games**, with natural/scratch balance, **192 observed and deliberately possible-roll decision roots**, **3,128** exact test action Q labels. Lower Q regret is better:

| Policy | Mean Q regret BP / root | Mathematically optimal actions |
| --- | ---: | ---: |
| Frozen production Oracle BPIV | **0.0043630** | **182 / 192** |
| Full-action BPIV (no learner) | **0.0043630** | **182 / 192** |
| Selected linear residual | 0.0065678 | 171 / 192 |
| Neural residual | 0.0073911 | 169 / 192 |

The selected linear student has paired **+0.0022048 BP more regret** than
production. **95% 48-game cluster-bootstrap CI [-0.005693, +0.008856]**,
including zero. **No verified gain.** This test includes purposely selected
possible but nonrandom dice (48/192 roots), so it is NOT a population-weighted
estimate of how often mistakes occur. Subsets are explicitly reported in
\`oracle3-q.q.holdout-summary.json\`.

**Failure pattern:** conditional values for saving/moving dice can be distorted
by the learned Q correction, especially in scratch-history games and with two
remaining turns. On the observed **seed 920200093**, 2 turns remaining,
dice [5,6,6,6,3] with 1 reroll: the exact Oracle 2.0 and frozen production
both hold 5-6-6-6 and reroll the 3 (native Q **8.4592053291** final BP).
Both linear and neural students instead score **26 in Choice immediately**
(native Q **8.1380859276**), losing **0.3211194015 expected final BP**.
This is a verified regression, not a hypothetical counterexample.
For this root, Choice had 26+26+24 filled and its fourth cell free,
Balut had only one free cell. Models overvalued securing Choice now relative
to the more valuable reroll/continuation.

The locked test has **10 roots where an exact-optimal choice scores zero**;
production and linear each made 10 score-zero selections, neural 9. The
additional scratch data did not independently establish improved strike
decisions.

## FRESH FINAL-BP SMOKE (32 independent complete games, common chance coupling)

- Preregistered seed range **940000000..940000031**.
- Both strategies use the frozen production Oracle until the final three
  turns; linear student then makes research-only decisions.
- Uniform dice are drawn via seeded, **turn+reroll-index counter-based** streams,
  so changing number of held dice does not make the next turn's RNG sequence
  diverge. Production and student see matched potential dice outcomes.
- Mean final Big Points **8.0625 production vs 8.1875 student**, paired
  delta **+0.125 BP**; **2 wins, 30 ties, 0 losses**.
- Nominal 95% normal CI **[-0.0668,+0.3168]**; seed/game bootstrap
  CI **[0,+0.34375]**. The interval touches zero, and 32 games are too few
  for a credible improvement claim. No claim of superior final BP.
- Mean wall time **4.537 s/game production** vs **4.502 s/game student**;
  262 learned decisions, p95 complete student endgame inference about
  **147.49 ms/decision**. Sample-size and machine limitations apply.

## Capacity and honesty
New exact Q data acquisition wall **446.75 s**; BPIV feature preparation
**44.31 s**; training **2.41 s**; test inference/scoring **0.61 s**;
32-game paired smoke **289.27 s**. Peak reported Node parent RSS
**133.71 MB** during acquisition (**native C++ subprocess memory omitted**).
All exact references are **EXACT_FLOAT64 complete finite-horizon Bellman for
1–3 remaining turns**, not a proof of globally optimal first-round play.

### Decision and next iteration

**STOP / no production upgrade**. The new algorithm is genuine learning from
a stronger Oracle 2.0 teacher, but did not generalize beyond production
Oracle on the locked exact-Q test. Don't rerank the four candidates based
on the inspected test set; that would invalidate its held-out status.

Next research track should examine **pairwise top-2 action margin errors**
and the systematic "score now versus reroll" failure, increase diverse
scratch / threshold-crossing *training* roots, and introduce a
**confidence-gated override** of frozen production (only correct decisions
with strong expert evidence). Prespecify completely NEW validation/test
seeds before any tuning. Only if robust Q regret improves on fresh games,
run a much larger, independent 28-turn final-BP head-to-head.
