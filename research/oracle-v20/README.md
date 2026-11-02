# Oracle 2.0 — Iteration 20: native exact acceleration

**Status:** research only; no live app changes. Complete standalone C++ source, comparison scripts, four exact tables, tests and Danish research report are in the project attachment `Balut_Oracle_2_Iteration_20_Native_Exact.zip` (370,968 bytes, SHA256 `8767225e4a35360b95be062465dc63c0e6c49b4df8dc9dd50fa5581a8dd89ba9`). The ZIP contains original V18/V19 source plus additions in `Oracle_18/native`, `Oracle_18/tests/check_native_v20.mjs` and `Oracle_18/docs/ITERATION_20_REPORT_DA.md`.

## Changed method, unchanged objective
Compiled C++20 full exact Bellman (252 unordered 5-dice histograms, 210 useful hold combinations, 3 possible rolls/turn, all seven category choices, all future 28-turn decisions) with injective canonical 64-bit keys. This is an offline/server research accelerator, **not** an iPhone binary and **not** proof of full 28-turn feasibility. The <=7-turn exact solution remains mandatory. Native C++ outputs exact root action Q* and full scorecard tables compatible with V18.

## New verified measurements
- Full 10-turn scorecard JS 11.714s → C++ 2.079s (**5.63×**); another JS 17.810s → C++ 2.746s (**6.49×**). Cross-validation matched **23,268** reconstructed root action values across 252 dice × 3 reroll stages for the two scorecards.
- Eight additional independently generated v19 ten-turn root decision cases with r=0: native exact 8/8 completed in 1.43–9.29s, mean 3.14s. Existing V6 guide correct 6/8; two newly discovered errors corrected by global exact Bellman: `new-10-7` Fives→Sixes (regret **0.15999557** BP) and `new-10-8` Choice→Full House (regret **0.20587345** BP). Both errors and ALL alternative root Qs cross-checked independently with unchanged JavaScript V18.
- Four full native scorecard lookup tables (39,028 bytes) cover exactly 4×252×3=3,024 dice+reroll contexts on those four scorecards. Two tables fully cross-checked action-by-action with independent JS; the other two cross-checked at the questioned root r=0.
- 36 short-horizon root comparisons and two 10-turn root checks agreed with JS within 1e-9. New native, numeric-key and inherited V19 tests pass. A full inherited regression suite exceeded the overall compute allowance and cannot be claimed complete.
- Numerical JS key alone did **not** improve runtime (same case 9.20s string vs 10.03s numeric), so **not adopted**.

## Limitations
These are legal scorecards sampled from full-game histories, with dice taken from the game's FIRST roll but some evaluated as hypothetical final-roll decisions (r=0). No globally optimal opening 20–28-turn action is yet established; Float64 is not outward-rounded formal arithmetic; native cannot run unchanged in a mobile browser. New 11/12-turn solutions remain resource-limited and unproven. No production code or existing user automations modified.

## Next step
Priority: persistent bounded native offline worker and reusable Bellman substate cache; coverage vs CPU/memory on fresh 8–12-turn scorecards; fit into V18 table archive; use exact 7-turn boundary and ALL-SEVEN-category adaptive planning for 13–28, measure **correct root action and regret**, not bonus upper-bound tightening. Follow accepted [ADR-014](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_ADR_014_NATIVE_EXACT.md) and [North Star](https://github.com/anders-hess/balut-game/blob/main/docs/ORACLE_NORTH_STAR.md).