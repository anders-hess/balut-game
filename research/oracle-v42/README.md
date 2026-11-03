# Oracle v42 — exhaustive scoring-rule audit of v41 exact quotient
2026-11-03. **Research-only; NO global optimal 20–28-turn action certified.**

## New finding (important correctness bug in v41)
The v41 research file `research/oracle-v41/oracle_v41.mjs` implemented Straight with identical low-straight predicates in both ternary branches. Thus it returned **20 instead of 15** for 1-2-3-4-5 and **null instead of 20** for 2-3-4-5-6. This contradicts production `src/logic/scoring.js`. This is a substantive correctness blocker for integrating v41's otherwise valid quotient into a Bellman engine: it can corrupt legal positive actions and expected Q values. The v41 quotient *mathematical theorem* is unaffected; its implementation is not sound.

## New actual code and execution
New `oracle_v42.mjs` corrects the two Straight outcomes and retains the seven-category compressed-state, threshold and terminal bonus definitions. `oracle_v42.test.mjs` includes independent scoring-rule comparison and 20-turn transition consistency checks. Command to rerun in Node 20+: `node --test research/oracle-v42/oracle_v42.test.mjs`.

The actual V8 JavaScript tool runtime (not Node) independently executed:
- All **252** five-dice histograms and **7** categories: **1,764 / 1,764** scoring comparisons with an independently expressed reference scorer passed.
- Original v41 Straight implementation versus production reference: **2/252** dice histograms differ, exactly low and high Straight.
- **3,528 / 3,528** compressed-state transitions over two constructed legal 20-turn scorecards, all 252 dice histograms and seven open categories passed.
- All integer scores and state counters are below 2^53, so these discrete tests are integer-exact.
- The committed Node test source has **NOT** been run in Node, because the container runtime failed with a connection error. The independent V8 comparisons above were actually executed.

## Explicit acceptance-gate result
**0** certified ordinary 20–28-turn current top actions, **0** legal current actions pruned, **0** early-game full Q*(s,a) values calculated, no L/U proof-gap measurements, no memory/speed benchmark, no new exact 10–14-turn Bellman Q reference comparisons. No independent full global 28-turn action certificate. The current work fixes a dangerous scoring implementation error, **not** the user's demanded decision-proof milestone.

## Mathematical next step
Integrate corrected v42 scoring and quotient into the native exact Bellman implementation, first compare all seven categories and reroll Q values with unchanged exact 10–14-turn reference positions. Next run decision-directed AND/OR with rigorous upper/lower bounds on each legal current action at the 36 observed 20–28-turn roots; exact 1–7-turn solver remains mandatory. If possible, use symbolic canonical quotient key and verify no column-order constraints are omitted. Do not claim early optimality from the quotient lemma or these rule tests.

No production/main changes.
