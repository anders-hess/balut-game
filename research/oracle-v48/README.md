# Balut Oracle v48 — Gate 3 first-turn all-action stress test

**Actual code, independent exact-rational tests, and fixed result. No global first-turn certificate.**

- Target: previously visited ordinary empty-card first roll with dice **1-3-4-4-5**, 2 rerolls. **30/30** current legal actions, including positive Fours8, Fives5 and Choice17.
- 0 certified top actions; 0 competitors eliminated. After improving feasible policy L, the strict exact-integer witness remains **L=4.251443430555556 BP < max competing U=18.222243926311727 BP**, gap **13.970800495756173 BP**.
- New mathematical contribution: a feasible *six-category group-adaptive category choice and reroll* policy with exact evaluation of nonlinear final Big Points using quota-state DP and giant integer convolutions. Unlike previous fixed-category future lower, the G-group adapts category choice to actual dice while respecting quotas. Balut four scoring turns are still filled legally with the earlier fixed-category policy. See `MATHEMATICS.md` and `GATE3_PROTOCOL.md`.
- Full six-category root L evaluation finished in 60.6 wall seconds / 972,548 KiB max resident on the testing host under a 100-second / 1.8GB virtual-memory budget. This is a tested benchmark for one opening only, not all 28-turn positions or browser/mobile latency.

## Reproduce

From extracted archive root, use `bash oracle_v48/run_checks.sh` for *independent short-horizon exact-rational checks*, original v47 regression reference checks, and the full stored 30-action proof-negative integer audit. Then use `bash oracle_v48/run_full_gate3.sh` to **rerun the expensive six-category full root evaluation** (~60–90s on similar Linux hardware) and compare all action interval integers with the frozen archived result. The full test returns `BOUNDED_NOT_CERTIFIED`; a timeout or resource-cap failure must be reported as `UNRESOLVED`, never exact.

The `oracle_v47/` sibling contains the full inherited seven-category quota upper C++ and frozen reference fixtures. `oracle_v48/` contains all original new sources plus the locked input, original upper intervals, 75 audited adaptive-policy score leaves, 30 current action intervals, independent proofs/tests and resource logs. No live-app or main changes.