# Correctness argument: fully legal adaptive continuation policy and integer certificate

Let the frozen state have quotas `k_c`, accumulated category sums `p_c`, Straight/House positive counts, previous Baluts and total Small Points. The selected feasible strategy first fills all currently open slots in the group

`G = {Fours, Fives, Sixes, Straight, Full House, Choice}`

while selecting the exact scoring category adaptively after up to two adaptive rerolls in **each** future turn. Afterwards, the remaining Balut slots are filled legally with a fixed-category (but within-turn reroll-adaptive) policy. The strategy therefore consumes exactly one category slot in every future turn, all seven categories eventually fill, no future dice are anticipated, and the terminal objective is the real Balut final Big Points.

## Finite-turn dice kernel

For a six-category active mask `M`, at the last roll choose `c` maximizing `w_c * SmallScore(c,d)` with deterministic ties; weights are fixed integers `(240,190,160,175,140,100,0)` in the canonical seven-category order. At each earlier roll, choose to stop or choose a legal hold that maximizes the correct **conditional expected** weighted terminal score using the exact multinomial mass over fair six-sided dice. The resulting joint distribution `K_M(c,s)` is integer-valued with denominator `N = 7776^3 = 6^15`, including all three fair-dice phases and all legal hold alternatives. This is just a policy, not an optimized Big Points Bellman strategy.

## Adaptive category-level quota DP

Let `F_k^total(x)` be the exact integer numerator of total future Small Points from the G-group and `F_k^c(x)` be the numerator of category-c accumulated Small Points for c in `{Fours,Fives,Sixes,Choice}`. For `c` in `{Straight,FullHouse}`, `F_k^c(x)` instead tracks the number of future positive scores (0..remaining quota). All these distributions have the **same denominator** `N^sum(k)` and satisfy:

`F_k^total(x) = sum_{c,s} K_M(c,s) F_(k-e_c)^total(x-s)`

`F_k^j(x) = sum_{c,s} K_M(c,s) F_(k-e_c)^j(x - delta(j,c,s))`

with `delta = s` for the respective threshold category, `1_{s>0}` for the respective valid-only category and zero otherwise. At `k=0`, each distribution is unit mass on zero. Every branch decreases a required quota, so all `5^6=15,625` group quota states are resolved in a finite exact DP. No action-value approximation, Monte Carlo or independent-category assumption is used for the G-group.

Convolve the *joint group's total-Small marginal* with the exact independent distribution of the Balut fixed-category block. Then apply the **actual nonlinear bonus** `B(T+totalFutureSmall)` and compute its expectation exactly. The threshold-category expected Big Points are computed by their own exact marginal tail probabilities `P(p_c+additional_c >= threshold_c)`; the Straight/House expected Big Points by probabilities of filling all four positive slots; Balut scores +2 for each positive score, exactly under the fixed Balut policy. Linearity of expectation makes these separate marginals mathematically sufficient for E[FINAL Big Points], even though the different category totals themselves are *correlated* within the adaptive group. The policy value is returned as an exact Python pair `(integer numerator, integer denominator)`.

This value is a VALID global `L(s)` because it evaluates one explicit legal nonanticipative future strategy and the true terminal reward, hence `L(s) <= V*(s)` in exact rational arithmetic. To evaluate an **immediate hold** or **current score**, use category-specific feasible postscore-policy values for each reachable dice histogram, then optimize the remaining current rerolls and final category choice exactly as an OR/max over these feasible continuation strategies. Thus `L(s,a) <= Q*(s,a)` for every present legal action. Floors to micro-BP use `floor(integerNumerator * 1,000,000 / denominator)` before propagating rerolls with exact multinomial integer masses. Intersecting this L with the preexisting independently admissible v47 lower preserves validity.

The v47 upper is an earlier proven **pathwise additive seven-quota relaxation** from ADR-026 with exact integer upward rounding at all chance backups and true terminal Small bonus majorized. Its complete source and stored upper action integers are bundled separately for verification; no new unverified U is introduced in Gate 3. Numerical certification requires strict integer inequality after normalizing to `1,000,000 * 7776^2`, which is checked independently without floating-point comparisons.

## Independent checks and limitations

- `test_adaptive_lower.py` and `test_adaptive6.py` compare the stochastic one-turn policy kernels with a separately written `fractions.Fraction` two-reroll evaluator for smaller category masks, and reproduce the actual final Big Points for a two-turn position (including real Straight/Fours or Choice/Fours positive results and Small Points threshold crossings).
- Every nonempty mask of the active category group produces exactly probability mass 1 and only legal category scores.
- `verify_gate3.py` does **not** call the policy's production certificate routine: it re-enumerates all 23 current holds and all 7 current score actions and recomputes full two-reroll action lower propagation from all **75** exact-policy leaf floors using fresh integer transition counts. It compares with all 30 stored action bounds, checks unchanged upward v47 uppers, checks the strict witness and performs the full negative certificate audit.
- This establishes a feasible-policy **lower bound**, not an exact Bellman optimal value for original 28-turn Balut. The existing 10–14-turn Q references are Float64 reference results, not formal rational full-game Q certificates. No action was proved optimal; no valid action was pruned.