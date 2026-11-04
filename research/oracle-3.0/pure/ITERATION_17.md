# Oracle 3.0 iteration 17 — exact-rational mathematical certificates for the last turn

**Date** 4 November 2026. Independent research branch
\`research/oracle-3.0-phase6-exact-rational-endgame-2026-11-04\`, cumulative
from the VERIFIED pure math-only iteration 16 (not old advisor code).
No \`main\`, production Oracle, legacy model, BPIV, or Oracle 2.0 changes.

## Why this matters to the binding North Star

Prior Oracle 2.0 solved 1–3-turn states with numeric complete **Float64**
Bellman. This is a good complete reference but NOT by itself a rigorous
mathematical proof of an optimal choice when action values differ by less
than floating-point accumulated error. The user specifically wants the
3.0 AI to learn **mathematically correct optimal** actions where possible.

This iteration certifies the FINAL TURN, all legal hold/score actions and
0/1/2 rerolls, with exact **rational** expectations using BigInt INTEGER
arithmetic. The proof domain is sharply limited to one turn remaining.
The existing 2.0 C++ Float64 solver is used only for a fully independent
differential test; it does not supply the proof values.

## Mathematical proof

Let D = 6^5 = 7776. On a state with r rerolls remaining, represent
expected final Big Points by the signed integer numerator N over the
COMMON exact denominator **D^r = 6^(5r)**.

Base r=0: there is precisely one unfilled category, so score it now.
The completed game's Big Points value is an **integer**, hence N=score.

Induction: for every legal hold of h dice (0≤h<5), k=5−h are rerolled.
The rethrow has exactly C(k;c1,...,c6)=k!/prod(c_i!) EQUIPROBABLE
ordered rolls giving each multiset. If next-reroll optimum has numerator
N_next over D^(r−1), then the current hold's expected rational value
scaled to D^r is exactly

    N_hold = 6^h × Σ_{all counts summing to k}
                          C(k;counts) × N_next(held ⊕ counts, r−1).

The constant factor 6^h comes from
D / 6^(5−h) = 6^h. Also include scoring now as
N_score = integerFinalBP × D^r.

Every legal held subset of the actual dice is enumerated with count
multiplicity compression (and all legal score assignments, just one
remaining category). The maximum among **integer BigInt numerators**
gives the exact rational Bellman-optimal choice. All ties and positive
choice margins are exact; no floating-point operations participate in
action comparison. Decimal values are display-only.

Proof invariants: outcomes list sizes for n=0..5 are 1,6,21,56,126,252;
multinomial coefficients sum EXACTLY to 6^n; exact expectation of
each face count n/6. The corresponding entire action-Q array is
cross-checked (to 1e-8 for numeric display) against unmodified Oracle
2.0 v46 native Float64 Bellman for each test root.

## Precommitted executable experiment

- 12 **fresh independently covered mathematically reachable scorecards**,
  seeds 970300000..970300011, with threshold/bonus/strike witness
  profiles from the previously verified independent sampler. Each
  28-turn scorecard witness is replayed.
- Select the actual mathematical last-unfilled-category scorecard,
  independently choose fair possible dice multisets spanning runs,
  repetitions, high scores and poor scratch cases.
- For EACH scorecard evaluate **0,1,2 remaining rerolls**, giving
  **36 distinct certified action-decision roots** with full exact rational
  per-action numerators and common denominators.
- Compare exact rational per-action Q and optimum to unchanged numeric
  Oracle2 teacher, and explicitly store exact ties, numerator action
  margins, runtime/memo states, parent RSS.
- **No previous production Oracle policy is used for data/labels/model.**
  Inherited transitive dependency guard must pass (0 forbidden imports).

## Reproduction

From repo root (Node22, g++ C++20):

\`\`\`sh
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
node research/oracle-3.0/pure/guard.mjs
node research/oracle-3.0/pure/rational-test.mjs
\`\`\`

Outputs:
\`oracle3-rational-last-turn-certificates.json\` exact per-root
BigInt numerators/denominators and legal action list, and
\`oracle3-rational-last-turn-summary.json\` verified outcome count,
optimal uniqueness/ties and runtime/RSS. Results must be actual
GitHub Actions-completed artifacts, not intended results.

## Interpretation / next mathematical barrier

This **does prove** a finite-horizon Bellman optimal action on the last
turn, under correct tested game scoring and independent fair dice.
It does **not** prove the correctness of the source code in a formal
theorem prover, nor prove 2–28-turn optimal actions. A formal system
proof would still require code/semantics verification.

The natural next research target is rational/interval action
certificates with **two or more turns** remaining and an admissible
upper/lower bound for earlier 28-turn mathematical searches. The
neural math student learns from independently constructed teacher
values but is NOT automatically certified on states outside exact
teacher coverage. No production advisor fallback is permitted.
