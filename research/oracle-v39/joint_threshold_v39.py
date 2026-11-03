"""V39 coupled nonlinear row-bonus upper DP. Requires v37/v38 modules in local ZIP.
This is an admissible upper for the RELAXED two-category subproblem, NOT a Balut Q* upper by itself.
All expectation rounding is upward in integer fixed-point.
"""
from functools import lru_cache
import numpy as np
from multistop_v37 import SCORES, transition_matrix, DEN
SCALE=10**6
def ceil_stochastic_max(stop):
    mat,starts,initial=transition_matrix()
    v=np.asarray(stop,dtype=np.int64)
    for _ in range(2):
        reroll=-((-(mat@v))//DEN)
        v=np.maximum(v,np.maximum.reduceat(reroll,starts[:-1]))
    return -((-int(np.dot(initial,v)))//DEN)
def coupled_threshold_upper(cat_a,cat_b,ka,kb,T,base_a=0,base_b=0,threshold_a=52,threshold_b=65,scale=SCALE):
    assert 0<=ka<=4 and 0<=kb<=4 and ka+kb<=T<=28 and cat_a!=cat_b
    aa=np.asarray(SCORES[cat_a],dtype=np.int64)
    bb=np.asarray(SCORES[cat_b],dtype=np.int64)
    @lru_cache(None)
    def V(t,i,j,sa,sb):
        if not (i or j):
            return (2*int(base_a+sa>=threshold_a)+2*int(base_b+sb>=threshold_b))*scale
        if t<i+j:return -(10**15)
        skip=V(t-1,i,j,sa,sb) if t>i+j else -(10**15)
        av={int(x):V(t-1,i-1,j,sa+int(x),sb) for x in set(aa)} if i else {}
        bv={int(x):V(t-1,i,j-1,sa,sb+int(x)) for x in set(bb)} if j else {}
        leaf=np.array([max(skip,av.get(int(x),-(10**15)),bv.get(int(y),-(10**15)))
                       for x,y in zip(aa,bb)],dtype=np.int64)
        return ceil_stochastic_max(leaf)
    return V(T,ka,kb,0,0),V.cache_info().currsize
def independent_threshold_upper(cat,k,T,base,threshold,scale=SCALE):
    other=next(i for i in range(7) if i!=cat)
    return coupled_threshold_upper(cat,other,k,0,T,base,0,threshold,10**9,scale)
