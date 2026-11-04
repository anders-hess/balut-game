# v55 — pathwise nonlinear-terminal relaxation experiment (03:30, 4 Nov 2026)

Built cumulatively after v54; reviewed issue #1, North Star, v50 and v54. This experiment evaluates a **clairvoyant offline allocation upper** against a nonanticipative exact Bellman on 27 small rational test states. Both evaluate the same nonlinear terminal reward (threshold and category-completion bonus), with no linearization. Since allowing future outcomes to be known in advance expands the policy set, its expectation is an admissible upper *for this toy*.

**Measured:** 27/27 inequality tests passed; root exact=31/3, upper=31/3, gap=0; 0.001109 s, process peak RSS 95,504 KB (shared runtime). This experiment is too small and often tight by coincidence; it is not evidence of useful early-game pruning.

**Critical limitations:** two categories, one slot each, two outcomes, scoring only. No original seven-category scoring, hold/reroll, four cells, or original terminal Big Points. No original Q-reference fixtures run, 0/30 locked opening actions measured, **0 early global certificates, 0 pruned rivals**, and no improved opening gap (last independently verified 13.0067595694 BP from v51). This is **not** a certified upper for Balut until faithfully mapped and proven.

Run: `cd research/oracle-v55 && python3 pathwise.py`; writes results.json. No changes to main/live.

**Next:** add a real seven-category pathwise resource-allocation upper with all scoring opportunities, exact nonlinear terminal reward, and hold/reroll outcome coupling; establish admissibility, then verify unchanged exact Q fixtures before opening benchmark.
