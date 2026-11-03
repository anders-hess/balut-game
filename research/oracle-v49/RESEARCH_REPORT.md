# Balut Oracle — iteration 49, information-relaxation dual (2026-11-03)

**Overall decision: FAILED to prove an ordinary early globally optimal action.**

## Frozen target / source
- **Original target:** globally optimal adaptive expected FINAL Big Points under 28 remaining turns, all seven categories, all current score/hold options.
- Real previously observed empty-card opening: dice **[1,3,4,4,5]**, **two rerolls left**. Exactly **30 current actions**: 7 scoring choices (including **Fours 8, Fives 5, Choice 17**) plus 23 holds.
- Full v48 exact legal group-policy lower and v47 seven-category quota-additive upper were held fixed. Complete v48 and v47 source and frozen fixtures accompany this archive.
- Original v47 quota U C++ rebuilt with micro-Big-Point upward rounding and three alpha values (10,000; 14,000; 18,000 micro). 75 score/continuation leaves, 252 unordered dice combinations, all 210 useful hold types and the actual 6^5 ordered reroll shock space are included.

## NEW mathematical result — one-roll information-relaxation barrier

Let Y_h(ω) be the complete five-dice outcome after retaining a legal hold h and rerolling the other dice, with ω an independent ordered fair sample of five dice; action h is selected **before** ω is observed. For any fixed original-game upper continuation function `u(y)` and any deterministic function `psi(y)`, define the zero-mean nonanticipativity penalty

`m(h,ω) = psi(Y_h(ω)) - E[psi(Y_h(Ω))]`.

For a given current dice histogram `d` with one reroll remaining, the standard nonanticipative upper Bellman backup is

`B_u(d) = max{u(d), max_h E[u(Y_h)]}`.

If an illegally clairvoyant player sees ω before selecting h, the information-relaxation dual bound is

`D_psi(d) = E_ω[max{u(d), max_h (u(Y_h(ω)) - m(h,ω))}]`.

For **each** nonanticipative hold h, `E[m(h,Ω)]=0` exactly. Therefore by expectation/max inequality, `D_psi(d) >= B_u(d)`. The dual can **never** improve an already exact Bellman backup of the **same continuation upper function**. With `psi=u`, each adjusted hold payoff equals `E[u(Y_h)]`, path by path, so **`D_u(d)=B_u(d)` exactly**. This is a general, real-arithmetic theorem, not a statistical observation. A dual on the same exact additive v47 quota surrogate cannot beat that surrogate's Bellman optimum unless the relaxed objective/reward itself changes.

This is not an impossibility proof for multi-turn information relaxation with the true nonlinear terminal reward! Such a construction can, in principle, tighten a different optimistic model, but needs a certified tractable inner maximization and no Monte Carlo-only 'upper'.

## Actual 28-turn opening calculation

The implementation `dual_one_step.cpp` computes `B_u` and `D_psi` **exactly as finite rational numbers** using 128-bit integer numerators, a common 7776 ordered-shock space, all 252 current dice histograms, 210 useful hold patterns, and all 23 present opening holds. All reported micro upper ceilings are outward-rounded using exact integer divisions. The candidate L and all seven score-action bounds are inherited unchanged from the independently integer-audited v48.

| Penalty potential psi | 252 one-reroll states with strict dual slack | Mean additional U over Bellman across all 23 opening holds (BP) | Pruning benefit vs v48 |
|---|---:|---:|---:|
| `psi=0`, unpenalized clairvoyance | 251 | +0.332970 | 0 |
| `psi=best feasible policy leaf L` | 221 | +0.118324 | 0 |
| `psi=floor((L+U)/2)` | 191 | +0.043600 | 0 |
| `psi=U` (perfect for same upper leaf) | **0** | **0.000000** | **0** |

The 'additional U' is not extra true regret; it is avoidable bound looseness introduced by giving the dual clairvoyance. `psi=U` recovers exactly the ordinary v47 Bellman propagation (up to at most 1 micro BP displayed ceil). We then intersect with v48's exact-integer action bounds, so **all 30 original action intervals remain unchanged**, with **0/23 holds pruned**, **0/7 scores pruned**, and **0 globally certified early top actions**. The inherited strict candidate-vs-largest-rival witness remains:

- Best L action: `hold:000200` (both fours).
- Rival with largest U: `hold:001110` (3, 4, 5).
- Best L = `257068526726016/60466176000000` BP = **4.251443430555556 BP**.
- Largest rival U = `1101829408363296/60466176000000` BP = **18.222243926311727 BP**.
- **Gap = 13.970800495756173 BP**. All 30 actions evaluated. No certification.

The v49 native C++ dual core took about **0.27 sec**, roughly **5.1 MB peak RSS** in the initial Linux x86-64 run, after the source table was built. Rebuilding the three quota alpha values took about 4.4 sec; these timings are platform-specific and exclude C++ compilation and the independent test suite.

## Validation and independent checks

1. `verify_dual.py`: separately codes multinomial transitions in Python and recomputes **all 23 opening hold Bellman uppers** as exact integer fractions; tests all 30 frozen action intervals, including the three positive scoring actions, all 252 stage states, and asserts every dual bound is at least the Bellman bound. With `psi=U`, equality holds for all 252 states and 23 opening holds. No action was pruned.
2. For three five-dice states, `verify_dual.py` independently enumerates all 7,776 ordered shocks with Python `Fraction`, all feasible holds and the stop option, verifying four different martingale penalties and their zero conditional means.
3. `toy_two_turn_dual.py`: independent 3-outcome, 2-turn **synthetic** threshold example shows strict unpenalized clairvoyance dual gap (38/3 versus true 8), improved dual with an approximate potential (10), and tight dual with an exact value potential (8). This is not actual Balut scoring.
4. `real_balut_two_turn_dual.py`: **genuine original Balut scoring** on a legal, constructed **2-turn** card with only Fours and Choice slots left, fixed current dice 4-4-4-5-5, and all 252 possible next first rolls plus two adaptive future rerolls. Computes both current score Q exactly, clairvoyant next-first-roll U and martingale duals using exact rational arithmetic. With perfect potential, dual equals actual optimal Q. This is a late-game demonstration, NOT a 28-turn certificate.
5. Inherited v47 nine tests: independent scorer checks, 210 hold distributions, 92 unchanged 10–14-turn frozen Q action references inside intervals, small exact-Fraction quota Bellman, positive action exact Q checks, explicit **no fallback** routing on 1–7 remaining turns. Inherited 36/964 observed-action integer audit run separately and reproduced zero pruned; these prior references use Float64 for exact Q fixtures and hence are not formal machine-rational 10–14-turn certificates.

## Research verdict and next go/no-go

**Do not pursue further one-roll clairvoyance penalties on the same quota-additive upper.** The mathematical barrier is structural and independently verified. Penalty calibration alone cannot bridge the 13.97 BP original-game certificate gap.

A potentially useful v50 must **retain original cross-category nonlinear bonus states in the pathwise objective across multiple future scoring turns** and then form a zero-mean martingale penalty from a genuine reward-aware approximate value function. It must solve the inner future-informed maximization exactly or supply an independent certified upper, NOT substitute Monte Carlo estimates. First test on a bonus-active, genuine Balut 2–5-turn card with exact original Bellman as reference, then attempt a bounded early position. If this model also yields no provable root competitor elimination under fixed resource limits, reevaluate whether full 28-turn certified gameplay is practical.

**No production/main changes.** The ZIP and GitHub research branch are for independent verification.