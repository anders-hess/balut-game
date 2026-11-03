#!/usr/bin/env python3
"""V37 research: exact quota-constrained *multi-use* stochastic stopping
for a threshold-category's remaining c scores in a nonanticipative exchange.

This is a mathematically valid relaxation: future rival may schedule each of
its k_c category-c uses in any of T-1 future turns, observing fair rolls and
choosing up to two rerolls; competing quotas are relaxed. The c-row threshold
bonus is evaluated on ALL k_c scores jointly, not minimized pathwise. Other
exchanged-row and terminal bonus effects are safely minimized separately.

Returns a fixed-point lower bound on candidate c minus rival d, intersected
with the v35 deterministic bound. NEVER claims Q* or early optimality absent
strict separation against every legal score and hold action.
"""
from __future__ import annotations
from joint_swap_v35 import *
import numpy as np
from scipy.sparse import csr_matrix
from math import factorial
from functools import lru_cache
import time
SCALE=10**8
DEN=7776
THRESHOLD_C=(0,1,2,5)

@lru_cache(None)
def transition_matrix():
    starts=[0];rows=[];cols=[];weights=[]
    for h in HISTS:
        starts.append(starts[-1]+len(holds(h)))
    for i,h in enumerate(HISTS):
        for j,hold in enumerate(holds(h)):
            rid=starts[i]+j
            for nxt,mult in hold_transitions(hold):
                rows.append(rid);cols.append(nxt);weights.append(mult*6**len(hold))
    mat=csr_matrix((np.array(weights,dtype=np.int64),(rows,cols)),shape=(starts[-1],252),dtype=np.int64)
    assert np.all(np.asarray(mat.sum(axis=1)).reshape(-1)==DEN)
    initial=np.array([factorial(5)//np.prod([factorial(n) for n in Counter(h).values()]) for h in HISTS],dtype=np.int64)
    assert sum(initial)==DEN
    return mat,np.array(starts,dtype=np.int64),initial

def floor_stochastic_min(stop_values):
    """Exact fair-dice two-reroll MIN of stop_values, rounded DOWN."""
    mat,starts,initial=transition_matrix()
    v=np.asarray(stop_values,dtype=np.int64)
    assert v.shape==(252,)
    assert int(np.max(np.abs(v)))*DEN<2**62
    for _ in range(2):
        reroll=(mat@v)//DEN
        v=np.minimum(v,np.minimum.reduceat(reroll,starts[:-1]))
    return int(np.dot(initial,v)//DEN)

def ceil_stochastic_max_leaf(leaf,root_idx,r):
    mat,starts,initial=transition_matrix()
    v=np.asarray(leaf,dtype=np.int64)
    for _ in range(r-1):
        reroll=-((-(mat@v))//DEN)
        v=np.maximum(v,np.maximum.reduceat(reroll,starts[:-1]))
    held={}
    if r:
        for j,h in enumerate(holds(HISTS[root_idx])):
            raw=int(mat.getrow(starts[root_idx]+j)@v)
            held[str(h)]=-((-raw)//DEN)
    return held

def other_component_lower(card,idx,c,d,sy,*,compressed_total=None):
    """B(z): safe lower on exchanged d-row bonus + final Small Point bonus.

    All other future row scores and the future c-row small points are relaxed
    to a wide integer interval; they may depend on z and all adaptive choices.
    """
    filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
    k=tuple(4-len(f) for f in filled)
    x=SCORES[c][idx];present=sum(sum(f) for f in filled) if compressed_total is None else compressed_total
    # Other rows, including remaining c and d after exchanged present/first use.
    other_lo=sum((k[e]-(e in (c,d)))*SCOREMIN[e] for e in range(7))
    other_hi=sum((k[e]-(e in (c,d)))*SCOREMAX[e] for e in range(7))
    result={}
    for z in range(252):
        zc,zd=SCORES[c][z],SCORES[d][z]
        if (zc,zd) in result:continue
        delta=x+zd-sy-zc
        dbonus=row_bonus_min(d,sy,zd,filled[d],k[d]-1)
        base=present+sy+zc
        total=fast_bonus_diff_min(delta,base+other_lo,base+other_hi)
        result[(zc,zd)]=dbonus+total
    return {z:result[(SCORES[c][z],SCORES[d][z])] for z in range(252)}

def multiuse_lower(card,idx,c,d,sy,*,scale=SCALE, deadline=None,compressed_total=None):
    """Exact integer one-sided lower of adversarial k_c-use c scoring.

    First c use swaps with present c(x); later c scores affect its row bonus.
    B(z) from other_component_lower is a valid pathwise lower independently.
    We solve the relaxed finite-horizon optimal nonanticipative *k-use*
    stochastic scheduling DP, including all fair reroll transitions.
    """
    assert c in THRESHOLD_C and c!=d
    filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
    k=tuple(4-len(f) for f in filled)
    K=k[c];T=sum(k)
    assert K>=1 and T>=2
    if deadline is None:deadline=T-1
    assert deadline>=K
    x=SCORES[c][idx];base=sum(filled[c]);th=THRESH[c]
    b=other_component_lower(card,idx,c,d,sy,compressed_total=compressed_total)
    scorevals=tuple(SCORE_SETS[c]);score_of_hist=np.array(SCORES[c],dtype=np.int64)
    b_by_score={s:min(b[z] for z in range(252) if SCORES[c][z]==s) for s in scorevals}
    # B(z) may depend on d(z); minimization within c-score is admissible.
    # Normalize away a constant to reuse the expensive exact quota DP across
    # many present rival scores and categories.
    offset=min(b_by_score.values())
    pattern=tuple(b_by_score[s]-offset for s in scorevals)
    q,states=multiuse_pattern(K,deadline,base,x,th,scorevals,pattern,scale)
    return q+offset*scale,{'states':states,'k':K,'deadline':deadline,
                           'normalizedPattern':pattern}

@lru_cache(None)
def multiuse_pattern(K,deadline,base,x,th,scorevals,pattern,scale):
    score_of_hist=np.array(SCORES[next(c for c in THRESHOLD_C if SCORE_SETS[c]==scorevals)],dtype=np.int64)
    by_score=dict(zip(scorevals,pattern))
    @lru_cache(None)
    def val(t,j,first,rest_sum):
        if j==0:
            assert first>=0
            bonus_c=2*(int(base+x+rest_sum>=th)-int(base+first+rest_sum>=th))
            return (bonus_c+by_score[first])*scale
        if t<j or t==0:return 10**15
        skip=val(t-1,j,first,rest_sum) if t>j else 10**15
        scored={s:(val(t-1,j-1,s,0) if first<0 else
                    val(t-1,j-1,first,rest_sum+s)) for s in scorevals}
        stops=np.array([min(skip,scored[int(s)]) for s in score_of_hist],dtype=np.int64)
        return floor_stochastic_min(stops)
    return val(deadline,K,-1,0),val.cache_info().currsize

@lru_cache(None)
def first_use_normalized(f,deadline,scale):
    f=np.asarray(f,dtype=np.int64);q=None
    for t in range(1,deadline+1):
        stop=f*scale if t==1 else np.minimum(f*scale,q)
        q=floor_stochastic_min(stop)
    return q

def first_use_lower(f,deadline,scale=SCALE):
    offset=min(f)
    return first_use_normalized(tuple(int(x-offset) for x in f),deadline,scale)+offset*scale

def future_swap_f(card,idx,c,d,sy,*,compressed_total=None):
    filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
    k=tuple(4-len(f) for f in filled);present=sum(sum(f) for f in filled) if compressed_total is None else compressed_total
    x=SCORES[c][idx]
    lo=sum(k[e]*SCOREMIN[e] for e in range(7) if e not in (c,d))
    hi=sum(k[e]*SCOREMAX[e] for e in range(7) if e not in (c,d))
    out=[];memo={}
    for z in range(252):
        zc,zd=SCORES[c][z],SCORES[d][z]
        if (zc,zd) not in memo:
            delta=x+zd-sy-zc
            joint=joint_two_rows(c,zc,x,filled[c],k[c]-1,d,sy,zd,filled[d],k[d]-1)
            base=present+sy+zc
            memo[(zc,zd)]=min(r+fast_bonus_diff_min(delta,base+s+lo,base+s+hi) for s,r in joint)
        out.append(memo[(zc,zd)])
    return out

def compare_candidate(card,dice,c,r=2,*,multi=True,scale=SCALE,compressed_total=None):
    idx=INDEX[tuple(sorted(dice))]
    legal=[d for d in range(7) if None in card[CATS[d]]]
    assert c in legal and r in (0,1,2)
    filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
    k=tuple(4-len(f) for f in filled);T=sum(k)
    old=build_joint_lower(card,idx,c,compressed_total=compressed_total)
    D={};statecount=0;improvements=0;largest=0
    for d in legal:
        if d==c:
            D[d]=np.array(old[d],dtype=np.int64)*scale
            continue
        vals={}
        for sy in SCORE_SETS[d]:
            f=future_swap_f(card,idx,c,d,sy,compressed_total=compressed_total)
            q36=first_use_lower(f,T-k[c],scale)
            q=q36
            if multi and c in THRESHOLD_C:
                q37,meta=multiuse_lower(card,idx,c,d,sy,scale=scale,compressed_total=compressed_total)
                statecount+=meta['states']
                q=max(q,q37)
                if q>q36:improvements+=1;largest=max(largest,q-q36)
            vals[sy]=max(q,min(f)*scale)
        D[d]=np.array([vals[sy] for sy in SCORES[d]],dtype=np.int64)
        assert np.all(D[d]>=np.array(old[d],dtype=np.int64)*scale)
    leaf=np.maximum.reduce([-D[d] for d in legal])
    score={CATS[d]:int(-D[d][idx]) for d in legal if d!=c}
    held=ceil_stochastic_max_leaf(leaf,idx,r)
    maxadv=max(list(score.values())+list(held.values()),default=0)
    return {'candidate':'score:'+CATS[c], 'remaining':T,'dice':dice,'rerolls':r,
        'certifiedUnique':all(v<0 for v in score.values()) and all(v<0 for v in held.values()),
        'scorePruned':[name for name,v in score.items() if v<0],
        'holdsPruned':[h for h,v in held.items() if v<0],
        'scoreRivalUpperBP':{name:v/scale for name,v in score.items()},
        'holdRivalUpperBP':{name:v/scale for name,v in held.items()},
        'maxRivalAdvantageUpperBP':maxadv/scale,'stochasticStates':statecount,
        'improvedSyCells':improvements,'largestSyLowerImprovementBP':largest/scale,
        'scale':scale,'oneSidedInteger':True}
