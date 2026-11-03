#!/usr/bin/env python3
"""Independent Oracle v36 regression tests, no heuristic fallback."""
import argparse,json,time
from collections import Counter
from fractions import Fraction
from itertools import product
from stochastic_first_use_v36 import *
from fixtures import observed,exact_q
from test_exact_q_v35 import synthetic

def clear_caches():
    joint_two_rows.cache_clear();joint_one_row.cache_clear()
    row_bonus_outcomes.cache_clear();fast_bonus_diff_min.cache_clear()
    reachable_bonus_diff_min.cache_clear();other_reachable_bits.cache_clear()

def quick():
    mat,starts,initial=transition_matrix()
    assert mat.shape==(4116,252) and mat.nnz==253848
    assert np.all(np.asarray(mat.sum(axis=1)).ravel()==DEN)
    hist_counts=Counter(tuple(sorted(x)) for x in product(range(1,7),repeat=5))
    assert all(hist_counts[h]==initial[i] for i,h in enumerate(HISTS))
    f=np.array([2 if h in ((1,2,3,4,5),(2,3,4,5,6))
        else (-3 if len(set(h))==1 else 1) for h in HISTS],dtype=np.int64)
    # Independent arbitrary-precision exact one-turn reference.
    r1=[]
    for i,h in enumerate(HISTS):
        r1.append(min(int(f[i])*DEN,
            min(sum(w*int(f[j]) for j,w in hold_transitions(z))*6**len(z)
                for z in holds(h))))
    r2=[]
    for i,h in enumerate(HISTS):
        r2.append(min(int(f[i])*DEN**2,
            min(sum(w*r1[j] for j,w in hold_transitions(z))*6**len(z)
                for z in holds(h))))
    exact=Fraction(sum(int(initial[i])*r2[i] for i in range(252)),DEN**3)
    lo=first_use_lower(f,1);hi=first_use_upper_for_fixed_f(f,1)
    assert Fraction(lo,SCALE)<=exact<=Fraction(hi,SCALE)
    for t in (1,2,3,6,12,24):
        lo=first_use_lower(f,t);hi=first_use_upper_for_fixed_f(f,t)
        assert lo<=hi and hi-lo<=3*t+3
    for v in (-8,-2,0,3,12):
        for t in (1,3,24):
            assert first_use_lower([v]*252,t)==v*SCALE
            assert first_use_upper_for_fixed_f([v]*252,t)==v*SCALE
    return {'orderedDice':7776,'holdStates':4116,'transitions':253848,
            'exactOneTurn':str(exact),'constantTests':15}

def pathwise():
    cases=observed();checks=0;strict=0
    for i,c in ((0,3),(7,5),(19,4),(35,3)):
        row=cases[i];idx=INDEX[tuple(sorted(row['dice']))]
        old=build_joint_lower(row['board'],idx,c)
        new=build_stochastic_lower(row['board'],idx,c)
        for d in range(7):
            if new[d] is None:continue
            for y in range(252):
                assert int(new[d][y])>=old[d][y]*SCALE
                checks+=1
                if int(new[d][y])>old[d][y]*SCALE:strict+=1
        clear_caches()
    assert checks==7056 and strict>0
    return {'pathwiseCells':checks,'strictlyImproved':strict}

def exactq():
    checks=0;min_slack=1e9
    for ref in exact_q():
        s=ref['stateInput'];card=synthetic(s);dice=s[15:20];r=s[20]
        q={}
        for k,v in ref['exactActionQ'].items():
            key=json.loads(k)
            q[(key[0],key[1],tuple(key[2]) if key[2] is not None else None)]=v
        for c in range(7):
            key=('score',CATS[c],None)
            if key not in q:continue
            result=compare_candidate(card,dice,c,r,compressed_total=s[14])
            clear_caches()
            assert len(result['scoreRivalUpperBP'])+len(result['holdRivalUpperBP'])==len(q)-1
            for name,upper in result['scoreRivalUpperBP'].items():
                slack=upper-(q[('score',name,None)]-q[key])
                assert slack>=-1e-8,(ref['case'],c,name,slack)
                checks+=1;min_slack=min(min_slack,slack)
            for h,upper in result['holdRivalUpperBP'].items():
                ht=tuple(int(x) for x in h.strip('()').split(',') if x.strip())
                counts=tuple(ht.count(face) for face in FACES)
                slack=upper-(q[('hold',None,counts)]-q[key])
                assert slack>=-1e-8,(ref['case'],c,h,slack)
                checks+=1;min_slack=min(min_slack,slack)
    assert checks==408
    return {'exactBellmanActionComparisons':checks,
            'minimumSlackBP':min_slack,'violations':0}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--group',choices=('quick','pathwise','exactq'),required=True)
    a=p.parse_args();t=time.perf_counter()
    result={'quick':quick,'pathwise':pathwise,'exactq':exactq}[a.group]()
    print(json.dumps({'group':a.group,'result':result,
                      'elapsedSeconds':time.perf_counter()-t,'passed':True}))
