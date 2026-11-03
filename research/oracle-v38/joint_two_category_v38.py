"""V38: finite-horizon two-category nonanticipative quota scheduling.
Research surrogate only, NOT original Balut final-Big-Points Q*.
Requires numpy, scipy and multistop_v37.py from v37 research bundle.
"""
from functools import lru_cache
import numpy as np
from multistop_v37 import floor_stochastic_min, HISTS, SCALE
INF=10**15

def joint_min(fa,fb,ka,kb,T,scale=SCALE):
    assert len(fa)==len(fb)==len(HISTS)==252
    assert ka>=0 and kb>=0 and ka+kb<=T
    a=np.array(fa,dtype=np.int64)*scale
    b=np.array(fb,dtype=np.int64)*scale
    assert max(np.max(np.abs(a)),np.max(np.abs(b)))*7776 < 2**62
    @lru_cache(None)
    def value(t,i,j):
        if i==j==0:return 0
        if t<i+j:return INF
        skip=value(t-1,i,j) if t>i+j else INF
        ac=value(t-1,i-1,j) if i else INF
        bc=value(t-1,i,j-1) if j else INF
        leaf=np.minimum(np.minimum(skip,a+ac),b+bc)
        return floor_stochastic_min(leaf)
    return value(T,ka,kb),value.cache_info().currsize

def single_min(f,k,T,scale=SCALE):
    return joint_min(f,[0]*252,k,0,T,scale)
