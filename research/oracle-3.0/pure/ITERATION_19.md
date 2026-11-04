# Oracle 3.0 iteration 19 — exact rational ALL-action Bellman with two turns remaining

**4 November 2026, research-only.** Independent cumulative branch
\`research/oracle-3.0-phase6-rational-rerolls-two-turn-2026-11-04\`,
from the verified two-turn scoring-only rational certificates (iteration 18).
No main/live/Oracle2 changes, NO production Oracle/BPIV policies, copied
trajectories, priors or fallbacks in active Oracle 3.0.

## Research target

Mathematically certify the optimal current action, **including every
legal HOLD/REROLL and every current SCORE/zero category assignment**, at
a game state with **exactly TWO remaining score slots**, allowing
**0, 1 or 2 current rerolls**. Certify decisions using exact rational
BigInt arithmetic — not a Float64 approximation.

Last-turn mathematically optimal value is implemented and independently
recomputed as exact rational in iteration 17. Iteration 18 computed the
pre-roll last-turn expected value for TWO remaining turns but assumed
there were ZERO rerolls in the current turn. Now generalize the current
turn's Bellman to rerolls while preserving a mathematically exact
complete search.

## Exact proof derivation

Let \`D=6^5\` and \`V_1(s)\` denote the **exact** expected final Big
Points score at the START of the LAST remaining turn, after a particular
current turn score has been written. This is an integer numerator
\`N_1(s)\` divided by \`D^3 = 6^15\`:
one initial 5-die roll and two subsequent rerolls.

For a current turn with \`r\` rerolls left, define each current action
Q value using common denominator

    D^(3+r) = 6^(15+5r).

When a category is filled NOW, the score action value is
\`N_1(s_after)*D^r\`.

For any hold of \`h < 5\` dice (reroll \`k=5-h\`), let
\`C(k;c_1,...,c_6)=k!/(c_1!...c_6!)\` be the number of equally probable
ordered dice results represented by a multiset. From the exact Bellman
value with \`r-1\` rerolls, in integer numerator form,

    N_hold = 6^h * Σ_{c_1+...+c_6=k}
                   C(k; c_1,...,c_6) *
                   N_Bellman(held ∪ multiset(c), r-1).

This follows because the child denominator is
\`6^(15+5(r-1))\`; averaging over the k rerolled dice and scaling to
the common denominator requires multiplication by \`6^h\`.

With \`r=0\`, the only available actions are the two category score
assignments (unless both slots are in one category). Base case
\`N_1(s_after)\` is fully exact rational after summing all **252
possible initial last-turn multisets**, each of which has its
complete last-turn action-optimal BigInt continuation.

Memoize current-turn Bellman states by 5-dice multiset + remaining
rerolls. Critically, **cache \`N_1(s_after)\` once per distinct scored
category/value pair** (the post-scorecard is identical for any dice
multiset with the same score/category in this fixed root). This avoids
recomputing the expensive last-turn full proof at every roll in the
current turn. The cache is an exact mathematical identity because
remaining-turn state depends on the scored category/value and original
fixed scorecard, not on the physical current dice history.

Every current legal action Q is a BigInt numerator over the SAME
denominator; compare these numerators to certify ties, winning action
and strict advantage margin. Float64 is used ONLY for displaying Q
values and differential validation against Oracle 2.0 numeric DP.

## Fixed, reproducible experiment

1. Independent \`coverageSampler(990500000,{kind:'bonus'})\` constructs
   a FULL 28-turn legal positive-probability scoring witness. Remove
   precisely the LAST scored Fours slot and the LAST scored Straight
   slot, then independently replay the remaining **26 legal scoring
   actions**, verifying all scored values and automatic columns.
   Thus the resulting scorecard has TWO distinct unfilled categories:
   Fours and Straight. This is an intentionally rare bonus-rich
   mathematical state, NOT a representative naturally sampled game.
2. Numerically and rationally analyze two root dice multisets:
   \`[4,4,4,4,4]\` and \`[1,2,3,4,5]\`. For the former test \`r=0,1,2\`;
   for the latter test \`r=1,2\`, giving **five independent action-choice
   situations sharing one fixed legal scorecard**.
3. Native Oracle 2.0 v46 is used ONLY as a separate Float64
   differential check. Assert every legal action key and Q value matches
   the BigInt rational result to 1e-8 when displayed as decimals.
   The mathematical proof itself does NOT use Oracle 2.0's numeric Q
   values, any production advisor, or any AI prediction.
4. At least 1,000 exact last-turn rational subcertificates must be
   generated (through the 252 initial-roll multisets for each distinct
   post-scorecard). Verify fixed numerator denominator \`6^(15+5r)\`,
   complete all-action Q coverage and independent BigInt argmax/margins.
   Record all exact numerators and action values, cache size, time and
   parent RSS.
5. Enforce the inherited transitive code-isolation guard. No source
   imports from the legacy advising engine, no production fallback,
   no old trained weights or scorecard policies.

## Reproduction

Node 22+ and C++20 from repository root:

\`\`\`bash
g++ -O3 -std=c++20 research/oracle-3.0/oracle2/oracle2-exact-v46.cpp -o research/oracle-3.0/oracle2/oracle2-roll
node research/oracle-3.0/pure/guard.mjs
node research/oracle-3.0/pure/rational-two-rerolls-test.mjs
\`\`\`

The GitHub workflow archives full action Q rational numerator and
denominator JSON, the 26-turn replayable legal witness, numeric teacher
differential values and summary timings. Do not report mathematical
results until CI reports SUCCESS.

## Limits of certification

This is a legitimate finite rational Bellman proof for two remaining
score slots, including both current rerolls if the test passes. It is
**not a proof for 3–28 turns**, and not a proof of the neural student's
correctness on all unseen states. The source-level implementation
itself is unit/differential tested, not verified by a proof assistant.

Next: compare the mathematically trained AI directly with these
stronger rational labels; grow mathematical state coverage and
provable bounds for earlier turns using state compression. The user
requires no old advisor components anywhere in Oracle 3.0.
