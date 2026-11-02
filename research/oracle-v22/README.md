# Oracle v22 — Correctness-first router and early action counterfactual audit

Date: 2026-11-02. Research only; no production modifications.

Full reproducible source + test assets + native C++ v21 reference + raw two opening studies have been delivered as `Balut_Oracle_2_Iteration_22_Decision_Audit.zip` in the ChatGPT Balut project. ZIP SHA256: `81bee06d88fdbe34357f56726db4f07353c669de9ec0e4063f1d9fc8c08b8213`. Extracted ZIP `npm test` passed.

See [ADR-016](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_016_EXACT_FIRST_EARLY_AUDIT.md) for complete findings, protocols and decision.

## Implementation
- `DecisionOracleV22`: <8 remaining exact JS, 8–12 native optional exact first, >12 V6 provisional. Correct detail: **1–7 are mandatory exact**, `approvedAction=null` when only fitted/risk-bounded evidence exists; no exact7 fallback.
- Paired V6-policy + exact seven-turn boundary evaluator; all seven categories available at each future score decision.
- Analytically centered first random outcome control variate, pilot-fitted beta, separate confirm set; random seeds locked before run.

## Pre-locked studies
- Opening 3-3-3-6-6: Full House - hold 6s, raw +0.0730 BP, control-adjusted +0.3194 BP; **SE 7.14% worse**.
- Opening 3-3-3-5-5: Full House - hold 3s, raw +0.6361 BP, control-adjusted +0.6205 BP; **SE 3.82% better**.
- Two studies each 10 pilot pairs +32 confirmation pairs; both inconclusive, no globally optimal opening action certified.
- Protocol SHA256 `4a04356636a37db882fe92b52634191d8a97b252bbdc96238a43626ab38d3f8a`. 168 complete all-seven-adaptive prefixes with exact-seven-tail evaluations, ~101.5s local Node.

## Decision and forward gate
Do not integrate the first-chance control variate as an automatic 'improvement'; pilot coefficient did not robustly generalize. Keep the correctness-first exact/provisional distinction. Next iteration should build **materially stronger seven-category-adaptive continuation** using offline genuine policy improvement + exact seven-turn boundary and validate **action regret** on holdout exact states. Main mathematical target expected final Big Points under globally optimal adaptivity through 28 turns; NO approximation can be relabeled Q*.

Native C++ binary is Linux/offline and has not been tested on Safari/iPhone. No production deploy.