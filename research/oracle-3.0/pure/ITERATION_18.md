# Oracle 3.0 iteration 18 — exact rational category choice with two turns left

**4 November 2026.** New isolated research branch
\`research/oracle-3.0-phase6-rational-two-turn-2026-11-04\`, cumulative
from the verified fully rational last-turn iteration 17, no main/live
or Oracle 2.0 changes, and no old advisor imports of any kind.

## The precise mathematical claim

With **exactly two category slots unfilled** and **zero rerolls remaining
in the CURRENT turn**, the only legal current decisions are to score
now in one of the one or two unfilled categories. We can certify which
current category choice maximizes mathematically expected FINAL Big
Points after the LAST turn is optimally played.

After scoring category c now, the last remaining turn has a new initial
five-die roll, 0/1/2 possible rerolls, and the entire choice is solved
using the independent, already certified BigInt rational last-turn
Bellman program from iteration 17.

For every initial last-turn die multiset d, let w(d) be its exact number
of ordered permutations, and let N*(s_c,d) denote the exact last-turn
optimal FINAL Big Points numerator over 6^10 (from 2 possible rerolls).

Then current score action c has the **exact** Q-value

  Q*(c) = [Σ_d w(d) × N*(s_c,d)] / 6^15.

There are exactly 252 possible five-die multisets and Σw(d)=6^5.
All scores, weights, products, sums and comparisons use BigInt integers.
The common denominator **6^15** is exact. The optimal category
choice follows by comparing integer numerators; ties are exact.
No approximate AI values, Float64 Bellman estimates, or production
advisor influence the proof. The unchanged numeric Oracle 2.0
Float64 code is only an independent differential check after
the certified result has been computed.

## Precommitted executable proof test

- Independent mathematically constructed legal 28-turn witnesses
  from seeds scanned deterministically starting at 980400000,
  until THREE scorecards with **two different available categories**
  are found. Save exact selected seeds in JSON.
- At these three distinct, bonus/threshold/scratch-rich scorecards,
  choose predetermined feasible dice multisets and zero present
  rerolls. The entire score-versus-score legal action space has two
  options. Confirm all 252 initial-dice chance outcomes for EACH
  chosen category and re-use full exact-rational last-turn
  action-optimum proof at every chance leaf.
- Three roots × two category choices × 252 last-roll outcomes =
  **1512 exact rational last-turn subcertificates** if coverage is met.
- Replay all positive-probability legal scoring witnesses.
- Compare each of six rational category action Q values to
  independent Oracle 2.0 C++ Float64 native Q values to 1e-8
  display tolerance. Exact action rankings are determined solely by
  BigInt numerator comparisons, with every weighted sum preserved
  as reproducible JSON.
- Report exact action margins/uniqueness, complete chance-branch
  weight sums, time and parent RSS. Enforce the clean-math
  dependency guard (NO production Oracle/BPIV/fallback).

## Reproduction

Run in repo root, Node 22 and g++ C++20:

\`\`\`sh
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
node research/oracle-3.0/pure/guard.mjs
node research/oracle-3.0/pure/rational-two-test.mjs
\`\`\`

Outputs:
- \`oracle3-rational-two-turn-choice.json\`: full 252-outcome
  BigInt contribution proof for each option, from each seed;
- \`oracle3-rational-two-turn-summary.json\`: exact category choices,
  native parity, runtime and limitations.
- Workflow archives JSON/logs only when executed, not a fictional
  proof from committed source.

## Boundary: not global 28-turn optimality

This IS a valid finite rational proof for which category to score at a
two-turn state **when no current rerolls remain**, conditional on tested
Balut rule semantics and fair dice independence. It is NOT a proof for
the harder two-turn decisions with live rerolls, nor for earlier
1–28-turn states, nor a proof the neural student already makes
the same choice in all states. Source code is independently tested,
but not formally verified in a theorem prover.

Future research: extend exact rational/interval Bellman with current
rerolls, multi-category state compression and sound pruning, and
train an AI independently on these certified optimal decisions.
The production Oracle remains entirely outside 3.0.
