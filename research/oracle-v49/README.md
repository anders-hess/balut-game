# Oracle v49 — auditable information-relaxation dual, negative Gate 4 result

This archive is **research-only**. No original Balut opening action is proven globally optimal. **0 early top certificates, 0 pruned actions.** The original objective remains all 28 turns, adaptive play across every category, and expected final Big Points.

### Reproduce from a fresh ZIP extraction

```bash
bash Oracle_v49/run_checks.sh
```

Requirements: Python 3.10+, g++ with C++20, standard library; no internet or paid services. It compiles original v47 C++ surrogates and v49 C++ integer dual, reconstructs the full original fixed-root leaf table, reruns the 252-state all-hold dual, three independent Python `Fraction` tests, the real Balut 2-turn dual example, the inherited v47 Q-reference tests and 36/964 integer audit. Scripts deliberately report 0 early proofs. A 1–7-turn exact-native resource failure propagates as explicit UNRESOLVED, never silently falls back.

Core files in `oracle_v49/`: `dual_one_step.cpp`, `build_table.py`, `verify_dual.py`, `toy_two_turn_dual.py`, `real_balut_two_turn_dual.py`, `RESEARCH_REPORT.md`, `v49_results.json`, `dual_opening_raw.json`, `balut_two_turn_exact_dual.json`, `run_checks_github.sh`.

Inherited `oracle_v47/` sources and frozen v48 `gate3_result6.json` are bundled, so the code is self-contained. GitHub research branches use sibling directories `research/oracle-v47`, `research/oracle-v48`, `research/oracle-v49` with the same tested input paths.

**Primary new theorem:** A single-reroll perfect-information dual with a conditionally mean-zero penalty cannot improve the nonanticipative Bellman backup of the **same** already-valid continuation upper function. The best penalty `psi=U` simply recovers that Bellman backup, so this attempted next research direction must pivot toward a different coupled original-reward relaxation.