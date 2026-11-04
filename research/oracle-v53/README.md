# Oracle v53 — 01:30 research gate (4 November 2026)
Branch based on committed v52, not main. North Star and v50/v51/v52 reviewed.

**Hypothesis:** a quota-constrained exact threshold-progress DP with state-dependent score distributions can distinguish action order, unlike v52's state-independent toy model. In a two-category, two-turn finite model with nonlinear terminal threshold reward, exact rational Bellman and separately recursive brute force agree at **24/24 states**. At initial state, Q(A)=7/4 and Q(B)=35/16, so action B is provably better **within the artificial model**. The conditional distributions depend on prior progress and therefore cannot be interchanged as in v52.

**Critical scope:** This is a micro-model feasibility gate, NOT the Balut seven-category quota solver. Its synthetic probability laws are not Balut dice. It does not certify any original 20–28-turn decision, does not check original 1–7 Bellman or frozen 10–14 Q reference, and does not recompute the 30 opening actions. No early rival pruning, no new measured original-game gap. The last verified opening gap remains 13.0067595694 BP from v51.

**Reproduce:** `python3 research/oracle-v53/threshold_dp.py` (Python standard library only). Local test run passed; 24 checks, 24 memo states, 0.0011 s, max RSS 95500 KB in shared runtime (not incremental allocation). See results.json. No changes to main/live.

**Next:** map actual Fours/Choice score-progress transitions to the seven-category v51 quota kernel, retaining directed upper rounding and exact 1–7 router. Validate frozen original Q before opening. If state explosion, investigate bonus-state factorization or true multitur dual.
