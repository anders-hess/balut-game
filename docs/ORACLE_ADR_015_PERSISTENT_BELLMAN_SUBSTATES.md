# ADR-015 — Persistent complete Bellman substate memo (Oracle iteration 21)
**Date:** 2026-11-02. **Status:** ACCEPTED FOR RESEARCH, NOT FOR PRODUCTION.
**Binding:** North Star, ADR-007, ADR-010, ADR-011, ADR-013 and ADR-014 unchanged.

## Objective and scope
Optimize exact expected FINAL Big Points under optimal adaptive continuation for all 28 turns. The final <=7 turns remain exact. The unresolved decision problem is 8–28 turns, especially 20–28, with **all seven future categories** always eligible. A faster previously computed value is exact only for its matching sufficient-statistics state.

## Engineering decision
Adopt a native C++ persistent **Bellman W(s) substate memo**, rather than only an individual root/whole-scorecard cache. A batch service answers several roots using the same exact native solver instance. An offline binary snapshot stores complete canonical W(s) values and can be reloaded by a new process. Only complete successfully calculated W states are saved. The snapshot uses a versioned header, length, FNV-1a-64 error-detection checksum and atomic rename; **trust only self-generated, matching source/version caches**. Checksum does not prove authenticity nor mathematical correctness of malicious data.

Max new states per request is explicit. State-budget failure emits status=error. Resident memory ceiling emits status=resident_limit. A query is NEVER reported exact if interrupted. A future product wrapper must externally impose wall-time and memory budgets, report no approved action on timeout, and validate solver build/rules.

## Measured and tested results
- A ten-turn root from known legal v19-generated game scorecard `new-10-8` with a hypothetical last-roll dice configuration was solved exactly, covering 197,005 W states. It scored Full House zero (a legal scratch) in the chosen action.
- Its resulting legal **nine-turn successor** from first-roll dice [1,2,3,4,5] needed 109,070 new W states and ~1.615–1.780s when computed cold; with the prior ten-turn W memo, ~0.04ms and ZERO new states. The same action list was recovered after loading the 3,152,112-byte snapshot in a new process (~0.05ms excluding process/cache load).
- Same ten-turn scorecard with **two rerolls** after a last-roll root: 257,521 cold W states / 3.629s, versus 60,516 newly computed states / 1.048s with warm cache; so not all possible new roll outcomes are precomputed from one score-only root.
- Between DIFFERENT ten-turn scorecards, only 595 of 197,005 new memo states were saved (~0.3%); runtime improvement was inconsistent. Thus do not assume random-board cache coverage.
- Two exact ten-turn full action lists agree with unchanged native V20 reference at 1e-9 tolerance. 480 exact score/hold entries from a complete ten-turn turn-table agree with independent V20; warmed table computing ~0.92s vs cold V20 ~4.35s in one run, but direct timings are noisy.
- Corrupt snapshot byte, invalid request, forced low state budget and resident memory limit were tested: errors/statuses reported explicitly, no fake exact result; a fresh full query after a partial state-budget failure remained exact.
- All tests were run locally in a Linux x86-64 container; some run from a separately extracted ZIP. There is NO iPhone/Safari test and no globally certified 20–28-turn optimal action. Numerical calculations use Float64, not formally directed-rounding verified interval arithmetic.

## Acceptance and next experiment
This does **not** demonstrate a better oracle recommendation and must not go live. Next iteration should use this cache as infrastructure for action-directed **all-seven-category adaptive planning** in 8–28 turns, with exact seven-turn terminal Bellman, and evaluate actual action regret/correctness on locked independent references where possible. Prioritize this above further generic cache optimizations.

Full tested source/benchmarks/snapshot are in user-delivered `Balut_Oracle_2_Iteration_21_Persistent_Exact.zip`. Research branch `research/oracle-overnight-2026-11-01` stores the checkpoint. No production code changes.