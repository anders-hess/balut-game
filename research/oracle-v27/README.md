# Oracle 2.0 — Iteration 27: directed numerical Bellman certificates
**2026-11-02, RESEARCH ONLY.** No production code changes. [Permanent ADR-022](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_022_DIRECTED_BELLMAN_CERTIFICATES.md).

Complete self-contained source, unchanged V26 reference, `-frounding-math` V27 native engine, five all-legal-action certificates, independent exact rational Fraction solver, separate numeric certificate verifier, 36 legal-game deterministic fixtures, ablation of rejected hash/dummy optimizations, full Danish technical report: Balut ChatGPT project artifact **Balut_Oracle_2_Iteration_27_Directed_Bellman_Certificates.zip**, 41,456 bytes, SHA256 `bae7d609b55c2f83415e8b78eecdc4822c9527112d11940da4ffc083f77c2656`. Extracted ZIP `bash run_checks.sh` PASSED including real C++ recompilation, 24-action rational independent proof and original V26 27-action cross-check.

## New exact-root numerical verification method
For one legal root, run globally adaptive optimal expected FINAL Big Point Bellman twice: FE_DOWNWARD and FE_UPWARD. All fair-dice randomness uses repeated exact 1/6 operations on shared histogram lattice and maximum action choice, both monotonic; no rounded multinomial root weights. Separate memos and immutable source fingerprint. Return per legal action [L,U], certify a unique best action if `L(best) > max U(other)`. Hex-float action values and independent verification with reconstructed legal action set. The result is valid CONDITIONAL on correct compiler/hardware fenv and quotient semantics; no formally verified hardware/compiler proof. Full ranking beyond the top not asserted.

**Five reproducible root winner certificates, 92 legal actions:**
- `new-10-0` 10 turns r=2: hold two 5s; certified margin 0.054054516042 BP, 27 actions.
- `new-11-1` 11 turns r=2: hold two 6s; margin 0.079949783775 BP, 27 actions.
- `new-12-3` 12 turns r=0: score in sixes; margin 0.032884515945 BP, 5 actions.
- `new-12-8` 12 turns r=0: score in Choice; margin 0.115311656821 BP, 4 actions.
- `derived-14-two-straight-scratch` 14 turns r=2: hold one six; margin 0.013173060854 BP, 29 actions; all future Bellman exact and fully adaptive. CONSTRUCTED LEGAL but non-representative scorecard, 899,827 W states per pass.
Max individual interval width < 7.2e-13 BP. Independent exact rational Python test checked 24 different legal one-turn action values for correct enclosures. Numeric run not speedup and no newly proven 20–28 turn opening action.

**Negative candidates rejected:** packed open-addressing cache made small cases slower/larger; merging reward-neutral dummy category slots reduced a specially crafted 8-turn W state count 31→13 but did not significantly help ordinary scorecards. A 15-turn interval run did NOT finish both directions, no certification.

**Next true bottleneck:** 16–28-turn scorecard state blow-up. Build admissible selective AND/OR branch-and-bound with per-action safe intervals and exact seven-turn tail, use V27 as final audit engine. Do not relabel policy conditional or fitted V24 values as global Q* or deploy to live game.