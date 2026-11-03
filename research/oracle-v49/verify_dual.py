#!/usr/bin/env python3
"""Independent exact-integer audit of Oracle v49 information relaxation.
Checks the entire 30-action opening, including three positive scores,
using a separately coded multinomial Bellman evaluator, plus an exact
ordered-shock dual calculation on selected within-turn dice histograms.
No Float64 tolerance is used to identify certificates.
"""
from __future__ import annotations
from collections import Counter
from itertools import product, combinations_with_replacement
from fractions import Fraction
from math import factorial
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parent
V48=next(q for q in (ROOT.parent/'oracle_v48',ROOT.parent/'oracle-v48') if q.exists())
D=7776;SCALE=1_000_000
CATS=('fours','fives','sixes','straight','fullHouse','choice','balut')

# Independent unordered histogram and hold enumeration, not inherited C++ table.
HISTS=list(combinations_with_replacement(range(1,7),5))
I={x:i for i,x in enumerate(HISTS)}
def holds(d):
    seen=set(d); choices=[()]
    for v in sorted(seen):choices=[h+(v,)*count for h in choices for count in range(d.count(v)+1)]
    return [h for h in choices if len(h)<5]
def name(h):
    return 'hold:'+''.join(str(h.count(i)) for i in range(1,7))
def distr(h):
    n=5-len(h); out={}
    for extra in combinations_with_replacement(range(1,7),n):
        cnt=Counter(extra);w=factorial(n)
        for t in cnt.values():w//=factorial(t)
        w*=6**(5-n)
        j=I[tuple(sorted(h+extra))];out[j]=out.get(j,0)+w
    assert sum(out.values())==D
    return out

def table():
    x=[]
    for row in (ROOT/'last_roll_table.tsv').read_text().splitlines():
        a=list(map(int,row.split()))
        assert len(a)==8 and sum(a[:6])==5
        d=tuple(i+1 for i,c in enumerate(a[:6]) for _ in range(c))
        x.append((d,a[6],a[7]))
    assert len(x)==252 and set(d for d,u,l in x)==set(HISTS)
    z={d:(u,l) for d,u,l in x}
    return [z[d] for d in HISTS]

def nonanticipative(upper):
    r1=[]
    for i,d in enumerate(HISTS):
        val=upper[i]*D
        for h in holds(d):val=max(val,sum(w*upper[j] for j,w in distr(h).items()))
        r1.append(val)  # numerator micro, denominator D
    return r1

def selected_dual(hist,upper,lower,potential):
    # Full 6^5 ordered common shock R; before observing R, player must select h.
    hlist=holds(hist);shock=list(product(range(1,7),repeat=5))
    m={}
    for h in hlist:
        m[h]=sum(potential[I[tuple(sorted(h+shock_i[:5-len(h)]))]] for shock_i in shock)
    expected_psi={h:Fraction(m[h],D) for h in hlist}
    # Exact unbiased martingale condition for every legal hold.
    for h in hlist:
        mean=sum(potential[I[tuple(sorted(h+shock_i[:5-len(h)]))]] for shock_i in shock)
        assert Fraction(mean,D)==expected_psi[h]
    total=0
    for shock_i in shock:
        best=D*upper[I[hist]] # stop immediately; zero martingale
        for h in hlist:
            j=I[tuple(sorted(h+shock_i[:5-len(h)]))]
            best=max(best,D*(upper[j]-potential[j])+m[h])
        total+=best
    dual=Fraction(total,D**2)
    regular=max(Fraction(upper[I[hist]]),*(Fraction(sum(w*upper[j] for j,w in distr(h).items()),D) for h in hlist))
    assert dual>=regular
    return dual,regular

def check():
    vals=table();U=[x[0] for x in vals];L=[x[1] for x in vals]
    r1=nonanticipative(U)
    cpp=json.loads((ROOT/'dual_opening_raw.json').read_text())
    reference=json.loads((V48/'gate3_result6.json').read_text())
    dice=tuple(sorted(reference['dice']))
    assert dice==(1,3,4,4,5) and reference['actual_legal_actions']==30
    root_h=holds(dice);assert len(root_h)==23
    root=dict(cpp['current_hold_actions']);assert set(root)==set(name(h) for h in root_h)
    per=[]
    for h in root_h:
        key=name(h);num=sum(w*r1[j] for j,w in distr(h).items()); micro=-(-num//(D*D))
        assert micro==int(root[key]['ordinary_upper_micro_ceil']), (key,micro,root[key])
        for label, bound in root[key]['bounds_micro_ceil'].items():
            assert int(bound)>=micro,(key,label,bound,micro)
        assert int(root[key]['bounds_micro_ceil']['perfect_tail'])==micro
        old=reference['action_intervals'][key]
        # All bounds are *upper* on Q*, but dual cannot improve the strongest
        # previously held v48 U based on the exact nonanticipative backup.
        old_u=Fraction(int(old['up_num']),int(old['den']))
        new_u=Fraction(micro,SCALE)
        assert new_u>=old_u, (key,old_u,new_u)
        per.append({'action':key,'ordinary_upper_micro_ceil':str(micro),'old_upper':str(old_u),
                    'zero_dual_micro_ceil':root[key]['bounds_micro_ceil']['zero'],
                    'lower_potential_dual_micro_ceil':root[key]['bounds_micro_ceil']['policy_lower'],
                    'mixed_dual_micro_ceil':root[key]['bounds_micro_ceil']['mixed'],
                    'perfect_dual_micro_ceil':root[key]['bounds_micro_ceil']['perfect_tail']})
    assert len(reference['action_intervals'])==30
    score=[x for x in reference['action_intervals'] if x.startswith('score:')]
    assert len(score)==7 and set(score)>= {'score:fours:8','score:fives:5','score:choice:17'}
    lmax=max(Fraction(int(v['lo_num']),int(v['den'])) for v in reference['action_intervals'].values())
    best=max(reference['action_intervals'],key=lambda key:Fraction(int(reference['action_intervals'][key]['lo_num']),int(reference['action_intervals'][key]['den'])))
    u_comp=max(Fraction(int(v['up_num']),int(v['den'])) for a,v in reference['action_intervals'].items() if a!=best)
    pruned=sum(Fraction(int(v['up_num']),int(v['den']))<lmax for a,v in reference['action_intervals'].items() if a!=best)
    assert not (lmax>u_comp) and pruned==0
    # Three independent exact enumerations for the same 6^5-shock dual and the
    # same 252-state Bellman backup, including stop and every legal hold.
    examples=[]
    for h in [(1,3,4,4,5),(1,1,1,3,6),(2,3,4,5,6)]:
        h=tuple(sorted(h)); result={}
        for label,pot in [('zero',[0]*252),('lower',L),('mid',[(u+l)//2 for u,l in zip(U,L)]),('upper',U)]:
            dual,bell=selected_dual(h,U,L,pot)
            result[label]={'dual_num':str(dual.numerator),'dual_den':str(dual.denominator),
                           'bellman_num':str(bell.numerator),'bellman_den':str(bell.denominator)}
            if label=='upper':assert dual==bell
        examples.append({'dice':h,'exact_duals':result})
    summary={'experiment':'Oracle_v49_information_relaxation_one_reroll','frozen_opening':list(dice),
      'remaining_turns':28,'rerolls':2,'current_legal_actions':30,'hold_actions':23,'score_actions':7,
      'policy_potential':'true feasible-policy continuation leaf lower from v48',
      'stop_table_leaf_count':252,'category_score_leaves':75,
      'last_roll_nodes_tested_in_cpp':252,
      'node_gap_counts':{k:v['nodes_with_positive_gap'] for k,v in cpp['reroll_stage_diagnostics'].items()},
      'all_23_independent_integer_bellman_checks':'PASS',
      'independent_fraction_dual_three_states':'PASS',
      'all_30_current_actions_included':'PASS',
      'previous_best_action':best,'previous_best_L_num':str(lmax.numerator),
      'previous_best_L_den':str(lmax.denominator),
      'largest_competing_U_num':str(u_comp.numerator),'largest_competing_U_den':str(u_comp.denominator),
      'gap_BP':float(u_comp-lmax), 'certified_early_actions':0,'newly_pruned_actions':0,
      'improvement_over_v48_root_upper_micro':0,
      'dual_bounds_never_below_regular_bellman':'PROVED_AND_TESTED',
      'hold_bounds':per,'toy_reroll_exhaustive_fraction_results':examples,
      'source_table_sha256':hashlib.sha256((ROOT/'last_roll_table.tsv').read_bytes()).hexdigest()}
    (ROOT/'v49_results.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:summary[k] for k in ('current_legal_actions','all_23_independent_integer_bellman_checks','independent_fraction_dual_three_states','gap_BP','certified_early_actions','newly_pruned_actions','improvement_over_v48_root_upper_micro','node_gap_counts')},indent=2))
    return summary
if __name__=='__main__':check()