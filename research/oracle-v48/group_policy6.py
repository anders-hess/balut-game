"""Research v48: exact rational evaluation of a legal quota-adaptive continuation policy.

The future turns of Fours/Fives/Sixes/Straight/Full House/Choice are
chosen with a quota-aware adaptive category/reroll rule in each turn.
Remaining Balut turns are filled by a separate fixed-category legal policy.  No Monte Carlo, no statistical CI.
The resulting expectation of the TRUE final Big Points is an admissible lower for V*.
"""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent / "oracle_v47"))
from collections import defaultdict
from functools import lru_cache
from math import factorial
from bounds_andor import (CATS,THR,bonus,HISTS,INDEX,SCORES,hold_names,transitions,
                          fixed_category_distribution,conv,exact_fixed_policy)
from integer_proof import SCALE,D
from itertools import product
import time

GROUP=(0,1,2,3,4,5)
# priority by relative excess above typical three-roll category expectation
# among available categories (integer weights, tie-breaking deterministic).
WEIGHTS=(240,190,160,175,140,100,0)
N=D**3

@lru_cache(None)
def kernel(mask):
    """Sparse exact integer distribution over (category,scoring Small Points).
    All phases are adaptive, with decisions based on current dice, active mask.
    Outcome numerator uses common denominator 7776**3.
    """
    cats=[c for j,c in enumerate(GROUP) if mask&(1<<j)]
    assert cats
    # Final roll: choose the largest weighted legal category score.
    terminal=[];values=[]
    for i in range(252):
        c=max(cats,key=lambda c:(SCORES[c][i]*WEIGHTS[c],-c))
        s=SCORES[c][i]
        terminal.append((c,s))
        values.append(WEIGHTS[c]*s)
    # One reroll left: choose either score now or hold; a branch has denominator D.
    one=[];v1=[]
    for i,d in enumerate(HISTS):
        best=values[i]*D; bestdist={terminal[i]:D}
        for h in hold_names(d):
            mass=transitions(h)
            v=sum(w*values[j] for j,w in mass)*6**len(h)
            if v>best:
                best=v
                q=defaultdict(int)
                for j,w in mass:q[terminal[j]]+=w*6**len(h)
                bestdist=dict(q)
        one.append(bestdist);v1.append(best)
    # Two rerolls: distributions have denominator D**2
    two=[]
    for i,d in enumerate(HISTS):
        best=v1[i]*D; bestdist={key:x*D for key,x in one[i].items()}
        for h in hold_names(d):
            outs=transitions(h);v=sum(w*v1[j] for j,w in outs)*6**len(h)
            if v>best:
                best=v
                q=defaultdict(int)
                for j,w in outs:
                    ww=w*6**len(h)
                    for key,x in one[j].items():q[key]+=ww*x
                bestdist=dict(q)
        two.append(bestdist)
    q=defaultdict(int)
    for i,d in enumerate(HISTS):
        mult=factorial(5)
        for f in range(1,7):mult//=factorial(d.count(f))
        for key,x in two[i].items():q[key]+=mult*x
    assert sum(q.values())==N
    return tuple(sorted(q.items()))

@lru_cache(None)
def group_distributions(ks):
    """One total and one margin per active category with identical common denominator N**sum(ks).
    Index0 total Small. Other marginals are accumulated category Small (threshold
    categories) or future positive-count (Straight and Full House).
    """
    ks=tuple(ks)
    if not sum(ks):return ({0:1},)*(len(GROUP)+1)
    mask=sum((1<<j) for j,x in enumerate(ks) if x)
    out=[defaultdict(int) for _ in range(len(GROUP)+1)]
    for (c,s),weight in kernel(mask):
        j=GROUP.index(c)
        child=list(ks);child[j]-=1
        childd=group_distributions(tuple(child))
        for l,dist in enumerate(childd):
            delta=(int(s>0) if c in (3,4) else s) if l==j+1 else s if l==0 else 0
            o=out[l]
            for x,n in dist.items():o[x+delta]+=weight*n
    denom=N**sum(ks)
    assert all(sum(v.values())==denom for v in out)
    return tuple(dict(v) for v in out)

@lru_cache(maxsize=100)
def adaptive_group_value(z):
    """Exact rational E[Final Big Points] for one feasible 28-turn continuation policy.
    Returns numerator,denominator, no floats.
    """
    k,p,st,fh,ba,t=z
    ks=tuple(k[c] for c in GROUP)
    g=group_distributions(ks)
    groupden=N**sum(ks)
    row_reward_num=0
    for j,c in enumerate(GROUP):
        dist=g[j+1]
        if c in (3,4):
            have=st if c==3 else fh
            award=4 if c==3 else 3
            row_reward_num+=award*sum(n for x,n in dist.items() if have+x==4)
        else:
            idx={0:0,1:1,2:2,5:3}[c]
            row_reward_num+=2*sum(n for x,n in dist.items() if p[idx]+x>=THR[c])
    total={x:n for x,n in g[0].items()}
    den=groupden
    # The only category outside the adaptive six-category group is Balut.
    fixed_reward_num=(2*ba)*den
    for c in (6,):
        roll,rd=fixed_category_distribution(c); roll=dict(roll)
        dd={0:1}; own=1
        for i in range(k[c]):
            dd=conv(dd,roll); own*=rd
        if c in (3,4):
            ok=(st if c==3 else fh)+k[c]==4
            if ok:
                probability_count=sum(n for x,n in roll.items() if x>0)**k[c]
                reward=(4 if c==3 else 3)*probability_count
            else:reward=0
        else:
            reward=2*k[c]*sum(n for x,n in roll.items() if x>0)*rd**max(0,k[c]-1) if k[c] else 0
        row_reward_num*=own
        fixed_reward_num=fixed_reward_num*own+reward*den
        den*=own
        total=conv(total,dd)
    assert den==N**sum(k)
    assert sum(total.values())==den
    bnum=sum(n*bonus(t+x) for x,n in total.items())
    return row_reward_num+fixed_reward_num+bnum,den

if __name__=='__main__':
    import json
    from bounds_andor import compress,advance
    t0=time.monotonic();card={name:[None]*4 for name in CATS};z=compress(card)
    print('kernel',[(m, len(kernel(m))) for m in (1,3,7,15)],'time',time.monotonic()-t0,flush=True)
    v=adaptive_group_value(z)
    print('empty card BP',v[0]/v[1],'fixed',lambda:None,'time',time.monotonic()-t0,'cache',group_distributions.cache_info(),flush=True)