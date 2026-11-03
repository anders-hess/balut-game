#!/usr/bin/env python3
"""Oracle v36: rigorous finite-horizon first-use stopping-time exchange bound.

For candidate score c now and virtual rival d(y) now, swap rival's first
future c(z) into d(z). For each z, f(z) is a valid pathwise lower on the
FINAL Big Points advantage, computed with v35 joint row/terminal bonus.
The rival cannot choose z in advance: it must wait for fair dice and score
its first future c no later than T-k_c turns to reserve k_c-1 c scores.
An adversarial finite-horizon stopping Bellman (with extra freedom to defer
without respecting other quotas) lower-bounds E[f(z)] for ANY legal adaptive
future rival. All numerical operations use integer fixed-point one-sided
floor/ceiling rounding; no float is used for decision sign tests.

Research only: no claim of solved 20-28 turn roots or full 28-turn Oracle.
"""
from __future__ import annotations
import sys
from pathlib import Path
for name in ("oracle_v35", "oracle-v35", "oracle-v34"):
    path=Path(__file__).resolve().parent.parent/name
    if path.is_dir():sys.path.insert(0,str(path))
from joint_swap_v35 import *
import numpy as np
from scipy.sparse import csr_matrix
from math import factorial
from functools import lru_cache

SCALE=10**10
DEN=6**5

@lru_cache(None)
def transition_matrix():
    """Each legal (five-dice histogram, nonempty reroll) is a CSR row.
    All integer row weights sum to 6**5, independently of number held.
    """
    starts=[0];rows=[];cols=[];weights=[]
    for d in HISTS:
        hh=holds(d)
        for j,h in enumerate(hh):
            row_number=starts[-1]+j
            for nxt,mult in hold_transitions(h):
                rows.append(row_number);cols.append(nxt)
                weights.append(mult*6**len(h))
        starts.append(starts[-1]+len(hh))
    mat=csr_matrix((np.array(weights,dtype=np.int64),(rows,cols)),
                   shape=(starts[-1],252),dtype=np.int64)
    assert np.all(np.asarray(mat.sum(axis=1)).reshape(-1)==DEN)
    initial=np.array([factorial(5)//np.prod([factorial(Counter(h)[v])
        for v in Counter(h)]) for h in HISTS],dtype=np.int64)
    assert int(sum(initial))==DEN
    return mat,np.array(starts,dtype=np.int64),initial

def first_use_lower(f,deadline,scale=SCALE):
    """Lower bound on adversarial min E[f(first future c score)] in BP*scale.
    Floor each rational expectation; min preserves lower-bound validity.
    """
    assert deadline>=1
    f=np.asarray(f,dtype=np.int64)
    assert f.shape==(252,)
    assert int(np.max(np.abs(f)))*scale*DEN < 2**62
    mat,starts,initial=transition_matrix()
    fv=f*scale;q=None
    for t in range(1,deadline+1):
        values=fv.copy() if t==1 else np.minimum(fv,q)
        for _ in range(2):
            hold=(mat@values)//DEN
            values=np.minimum(values,np.minimum.reduceat(hold,starts[:-1]))
        q=int(np.dot(initial,values)//DEN)
    return q

def first_use_upper_for_fixed_f(f,deadline,scale=SCALE):
    """Opposite one-sided rounding, for independent numerical checks."""
    f=np.asarray(f,dtype=np.int64)
    mat,starts,initial=transition_matrix()
    fv=f*scale;q=None
    for t in range(1,deadline+1):
        values=fv.copy() if t==1 else np.minimum(fv,q)
        for _ in range(2):
            hold=-((-(mat@values))//DEN)
            values=np.minimum(values,np.minimum.reduceat(hold,starts[:-1]))
        q=int(-((-int(np.dot(initial,values)))//DEN))
    return q

def future_swap_f(card,idx,c,d,sy,*,exact_other=False,compressed_total=None):
    """For each z, exact integer pathwise lower using joint exchanged rows.
    Non-exchanged rows use a safe interval or exact reachable-total bitset.
    """
    assert c!=d
    filled=tuple(tuple(v for v in card[name] if v is not None)
                 for name in CATS)
    k=tuple(4-len(f) for f in filled)
    present_total=sum(sum(f) for f in filled) if compressed_total is None else compressed_total
    x=SCORES[c][idx]
    other_quotas=tuple(0 if e in (c,d) else k[e] for e in range(7))
    bits=other_reachable_bits(other_quotas) if exact_other else None
    other_lo=sum(k[e]*SCOREMIN[e] for e in range(7) if e not in (c,d))
    other_hi=sum(k[e]*SCOREMAX[e] for e in range(7) if e not in (c,d))
    memo={};out=[]
    for z in range(252):
        zc,zd=SCORES[c][z],SCORES[d][z]
        pair=(zc,zd)
        if pair not in memo:
            delta=x+zd-sy-zc
            joint=joint_two_rows(c,zc,x,filled[c],k[c]-1,
                                 d,sy,zd,filled[d],k[d]-1)
            base=present_total+sy+zc
            if exact_other:
                val=min(r+reachable_bonus_diff_min(delta,base+s,bits)
                        for s,r in joint)
            else:
                val=min(r+fast_bonus_diff_min(delta,
                    base+s+other_lo,base+s+other_hi) for s,r in joint)
            memo[pair]=val
        out.append(memo[pair])
    return out

def build_stochastic_lower(card,idx,c,*,scale=SCALE,
                           exact_other=False,compressed_total=None):
    """D[d][y]: rigorous fixed-point lower on candidate minus rival Q*."""
    filled=tuple(tuple(v for v in card[name] if v is not None)
                 for name in CATS)
    k=tuple(4-len(f) for f in filled)
    T=sum(k)
    assert k[c]>0
    D=[None]*7
    old=(build_exact_pathwise_lower if exact_other else build_joint_lower)(
        card,idx,c,compressed_total=compressed_total)
    D[c]=np.array(old[c],dtype=np.int64)*scale
    deadline=T-k[c]
    for d in range(7):
        if not k[d] or d==c:continue
        assert deadline>=1
        by_score={}
        for sy in SCORE_SETS[d]:
            f=future_swap_f(card,idx,c,d,sy,exact_other=exact_other,
                            compressed_total=compressed_total)
            q=first_use_lower(f,deadline,scale)
            assert q>=min(f)*scale
            by_score[sy]=q
        D[d]=np.array([by_score[sy] for sy in SCORES[d]],dtype=np.int64)
        assert np.all(D[d]>=np.array(old[d],dtype=np.int64)*scale)
    return D

def ceil_div_array(a,den):
    return -((-a)//den)

def compare_candidate(card,dice,c,r=2,*,scale=SCALE,
                      exact_other=False,compressed_total=None):
    """All legal present score and hold rivals; exact fixed-point upper."""
    idx=INDEX[tuple(sorted(dice))]
    legal=[d for d in range(7) if None in card[CATS[d]]]
    assert c in legal and r in (0,1,2)
    D=build_stochastic_lower(card,idx,c,scale=scale,
                             exact_other=exact_other,compressed_total=compressed_total)
    leaf=np.maximum.reduce([-D[d] for d in legal])
    mat,starts,initial=transition_matrix()
    previous=leaf
    for level in range(1,r):
        previous=np.maximum(leaf,np.maximum.reduceat(
            ceil_div_array(mat@previous,DEN),starts[:-1]))
    score={CATS[d]:int(-D[d][idx]) for d in legal if d!=c}
    held={}
    if r:
        for j,h in enumerate(holds(HISTS[idx])):
            row=starts[idx]+j
            raw=int(mat.getrow(row)@previous)
            held[str(h)]=int(-((-raw)//DEN))
    max_adv=max(list(score.values())+list(held.values()),default=0)
    return {'candidate':'score:'+CATS[c],
            'remaining':sum(4-sum(v is not None for v in card[name])
                            for name in CATS),
            'dice':dice,'rerolls':r,
            'maxRivalAdvantageUpperBP':max_adv/scale,
            'certifiedUnique':all(v<0 for v in score.values()) and
                              all(v<0 for v in held.values()),
            'certifiedWeak':all(v<=0 for v in score.values()) and
                            all(v<=0 for v in held.values()),
            'scoresEliminated':[name for name,v in score.items() if v<0],
            'holdsEliminated':[h for h,v in held.items() if v<0],
            'scoreRivalUpperBP':{k:v/scale for k,v in score.items()},
            'holdRivalUpperBP':{k:v/scale for k,v in held.items()},
            'scale':scale,'integerOneSidedRounding':True}
