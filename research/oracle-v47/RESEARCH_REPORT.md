# Balut Oracle v47 — Mathematical feasibility gate 2

**Date:** 2026-11-03. **Research branch only.**

## 1. Non-negotiable outcome

**0 normal early top actions proved globally optimal with 20–28 turns left. 0 actions eliminated.** The goal is still optimal expected **FINAL Big Points** across seven fully adaptive categories in all remaining turns. The new method is a rigorously admissible upper relaxation; it **does not** solve the original 28-turn Bellman problem. Nothing in the live app or main branch was changed.

## 2. Source provenance and integrity

The available v46 package includes exact-state C++ engine, v45 integer action-bound engine, the 36 fixed visited positions and 5 locked exact-Q reference roots. The GitHub North Star (ADR-001), ADR-025 and ADR-026 were read, including v31's quota-upper mathematics. **The original complete v31 C++ ZIP was unavailable**; this research **reconstructs** its mathematical model with newly written independent C++20 source, and does not claim bit-for-bit or performance equivalence to the original. In particular, the older v31 benchmarks intersected a further v28 bound not present in this standalone implementation. Do not compare its results to the v31 mean 11.6248 BP as identical benchmark architecture.

## 3. New mathematical implementation

At original state s, let k_c be remaining scoring slots (0..4), total Small Points T, row-progress p_c, and previous valid-row counts. Define B(T) as the true final Small Points Big Point bonus. For any alpha >=0 define

`beta(s,alpha)=max_{x integer in [5*k_Choice, SUM_c(k_c*M_c)]} [B(T+x)-alpha*x]`

with guaranteed safe maxima `M=[20,25,30,20,30,30,50]`. Then, for **every actual future complete adaptive path**, the final Small Points bonus is <= `beta + alpha * additionalSmallPoints`. For threshold categories c in 4s/5s/6s/Choice: if their threshold was already achieved, credit fixed Big Points G_c=2; if no longer reachable even at physical max, contribute 0; otherwise a successful final +2 Big Points is bounded **pathwise** by `SUM_future 2*small_c(d) / (threshold_c - progress_c)`. For Straight / Full House, a row already broken by a zero scores no bonus; otherwise its +4/+3 all-positive reward is bounded by `reward * futurePositiveCount / remainingQuota`; closed already-complete positive rows contribute fixed G. Every positive Balut contributes exactly +2 and existing positive Baluts are fixed G.

Let `rho_c(d)` be these additive category majorants; let `G(s)` be secured Big Points. Then for every legal future adaptive sequence:

`FinalBP <= G(s) + beta(s,alpha) + SUM_future [rho_c(d)+alpha*small_c(d)]`.

Optimize the surrogate **exactly** over remaining 7-category quotas with 252 equiprobable-histogram classes weighted by multinomial multiplicities, and both adaptive rerolls. A quota Bellman recursion with 5^7=78,125 possible quota states computes `W_alpha(k)`. This remains **valid for every original future policy**, even when that policy chooses categories based on past dice. Hence `G+beta+W_alpha(k)` is a global upper bound for original optimal expected final Big Points.

For current score action c on observed dice d: `U_alpha(score c)=G+beta+rho_c(d)+alpha*small_c(d)+W_alpha(k-e_c)`. For current hold actions, propagate the same score-leaf upper array through all available current hold/re-roll Bellman backups. Intersect independent valid bounds for alpha in `{0.010,0.014,0.018}` and existing physical upper.

### Numeric proof condition

ALL reported intervals use exact integer operations with micro-BP `SCALE=1,000,000`. Rational category majorants are individually rounded **up** using integer ceil. Each finite transition expectation `SUM(outcomeMultiplicity * futureUpper) / 7776` is also rounded **up** by integer ceil; every `max` and `min` preserves upper admissibility. `G` and `beta` are exact integer-micro values at the chosen integer alpha multipliers. All sums/products used fit 64-bit signed integers under legal Balut score bounds. Lower bounds come from **exact rational integer convolution** of a legal fixed-category adaptive-reroll continuation policy, rounded **down** to micro-BP. Root current rerolls are propagated with exact integer numerator and common denominator `SCALE*7776**r` (as Python arbitrary-precision integers). The strict certificate test compares numerator integers with identical denominators, never Float64 gaps.

The Fraction independent check computes the fully adaptive additive surrogate on a two-remaining-slot position with two different categories and both current rerolls; all current legal actions (including positive score choices and holds) satisfy `original Fraction surrogate Q <= upward-rounded native Q <= Fraction surrogate Q+0.0003 BP`.

### Decision-directed AND/OR refinement

A second method intersects the child **score-leaf** upper across alpha *before* the current chance and reroll Bellman backups, which is admissible because every child of every possible dice outcome is independently bounded.

A third method ranks influential `(category, score)` leaves by the occupancy of the currently strongest **competing hold** under an optimistic upper-bound action policy, then recomputes `G(s_after)+beta(s_after)+W(s_after)` at each selected child. The root upper is recomputed through all holds and all chance outcomes, retaining the previous upper for unrefined leaves. The heuristic leaf ranking NEVER substitutes for a probability or upper bound. This handles rivals' **positive** category scores and valid hold/rerolls.

## 4. Actual tests and locked data

- **252 * 7 = 1,764** independently scored dice/category combinations; all pass.
- All **210** distinct useful holds checked against a separately enumerated ordered-dice experiment, including exact probability multiplicity; all pass.
- Independent `fractions.Fraction` two-category / two-score-staging test including all current holds and two positive competing category choices passes, with strict upward rounding.
- **6 actual original 1–3-turn full Q roots**, all present score/hold actions bounded above by the new quota model; original Q independently computed with existing native exact Bellman.
- **5 unchanged global exact-Bellman reference roots, 92/92 legal action Q**, contained in integer action intervals; their stored Q are Float64 reference observations and not an independent formal original-game certificate.
- Re-optimized *postscore* upper independently checked against positive and zero score Q in the same frozen reference roots.
- Explicit 1–7 exact router test: a two-turn case solved using v46 exact; forcing cap=1 returns `EXACT_RESOURCE_LIMIT_NO_FALLBACK`, **no silent fallback**. Not all possible seven-turn cards are solved within a practical resource budget.

## 5. Measured 36 early-game roots

Machine: Linux x86-64, AMD EPYC 9V74 VM, Python 3.13.5 and g++ 14.2.0 (C++20 O3). Frozen, actual earlier observed visited first rolls, four cases per remaining horizon 20–28. Cases are NOT an unbiased sample of all possible Balut states.

| Metric | Measured result |
|---|---:|
| Observed early positions | 36 |
| All current legal actions checked | 964 |
| Legal action uppers improved vs v45 physical | 964 |
| Pruned current competitors | **0** |
| Strict numeric top certificates | **0** |
| V45 mean candidate/regret bound gap | 28.065274 BP |
| V47 rootwise alpha envelope mean gap | 16.095758 BP |
| V47 per-score alpha portfolio mean gap | 16.095291 BP |
| Mean gap improvement vs v45 | 11.969984 BP (42.65%) |
| Final min / max gap | 12.231524 / 18.911020 BP |
| Native quota states evaluated (sum over all 108 alpha runs) | 3,790,584 |
| Native weighted hold-transition operations (sum) | 31,204,532,016 |
| Rootwise 36-case total per-root wall-time | ~107.35 sec |
| Per-score alpha portfolio total per-root wall-time | ~50.65 sec |

Each root contains the complete per-action lower and upper rational numerators and the exact common denominator in `observed_*.json` and `portfolio_*.json`. A separate pure-integer verifier checks action identity, complete hold/scoring coverage, monotone interval improvements and zero strict certificates on all 36. On a single 28-turn empty card the native one-alpha quota surrogate uses ~78,123 nonterminal memoized states in approximately 0.9 sec, peak native RSS ~2,688 KiB; Python full native tests peak ~98,952 KiB. These are measured on the current host and must not be extrapolated to an iPhone.

### Conditional competing hold refinement (not a certificate)

**Observed case 0:** 28 remaining, dice `[4,1,3,4,5]`, empty card. The best *lower-bound* candidate is hold `[4,4]`, the largest competing *upper* is hold `[3,4,5]`. Reoptimize 8 future category-score outcomes ranked by their contribution to this rival's optimistic policy (including future positive Straight15/20 and Choice19/21/22). Mean gap at this one root 18.844021 → **18.808018 BP**, 0 pruned, ~22.63 seconds.

**Observed case 8:** 20 remaining, dice `[2,5,2,4,2]`. Rival hold three 2s; seven most influential category-score outcomes reoptimized, including positive Full House scores 8,12,14,16,18. Root gap 12.231524 → **12.134637 BP**, 0 pruned, ~1.79 seconds.

The improvement is very small compared to the remaining 12–19 BP and cannot justify a success claim. The single portfolio refinement across all 36 roots likewise has almost no decision effect.

## 6. Conclusion / decision

Gate 2 demonstrates that an entirely newly written integer-safe admissible 7-category quota DP can be combined with all-current-action AND/OR, tested against immutable Q references and dynamically refined against a chosen competing hold. However **zero action elimination and zero early top proofs** is an unequivocal negative verdict on the target acceptance gate.

**Pivot, do not repeat small bound iterations.** Next highest-leverage research is (A) a substantially stronger **legal globally adaptive continuation-policy lower** with certified evaluation, or (B) a nonanticipativity-penalized information-relaxation upper that preserves more strategic cross-category coupling. The v31 historical 11.6248-BP opening/observed gap applied additional v28 intersections, so we should first recover/integrate those stronger existing bounds rather than claim this independent rebuild supersedes v31. After that, run Gate 3 on a frozen ordinary opening with a fixed wall-clock/memory budget and independent strict all-action certificate checker. If no elimination occurs, report 0 and reassess feasibility. Preserve the exact <=7-turn Bellman requirement, with explicit unresolved failures.

## 7. Reproduction

`bash run_checks.sh` (fast, from clean extract) compiles all source, executes independent tests, confirms fixed Q and full interval audit. `bash run_heavy.sh` regenerates all 36 roots, 36 portfolios and two selective hold benchmarks; expected several CPU-minutes. `verify_results.py` checks stored numerators, denominators and action identities using arbitrary-precision integers, independent of native printed gap or ranking. The dataset, results and branch remain research-only.