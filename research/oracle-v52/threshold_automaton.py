"""Exact rational threshold-bonus automaton kernel; NOT a full Balut oracle."""
from fractions import Fraction
from functools import lru_cache
from itertools import product

def exact_threshold_dp(distributions, threshold, reward, initial=0):
    dist=tuple(tuple((int(x),Fraction(p)) for x,p in d) for d in distributions)
    assert all(sum((p for _,p in d),Fraction(0))==1 and all(p>=0 for _,p in d) for d in dist)
    @lru_cache(None)
    def dp(mask,progress):
        if not mask: return Fraction(reward if progress>=threshold else 0)
        return max(sum((p*dp(mask^(1<<i),min(threshold,progress+x)) for x,p in dist[i]),Fraction(0))
                   for i in range(len(dist)) if mask&(1<<i))
    return dp((1<<len(dist))-1,min(threshold,initial)),dp.cache_info().currsize

def independent_enumeration(distributions,threshold,reward,initial=0):
    ans=Fraction(0)
    for outcomes in product(*distributions):
        prob=Fraction(1)
        for _,p in outcomes: prob*=Fraction(p)
        if initial+sum(x for x,_ in outcomes)>=threshold: ans+=prob*reward
    return ans

def tests():
    cases=[
      ([[(0,Fraction(1,2)),(4,Fraction(1,2))],[(0,Fraction(1,3)),(3,Fraction(2,3))]],5,7,0),
      ([[(0,Fraction(1,6)),(5,Fraction(5,6))],[(0,Fraction(1,2)),(2,Fraction(1,2))]],6,4,2),
      ([[(0,Fraction(1,1))]],1,10,0),
      ([[(2,Fraction(1,1))]],1,10,0)]
    for d,t,r,s in cases:
        v,n=exact_threshold_dp(d,t,r,s)
        assert v==independent_enumeration(d,t,r,s) and 0<=v<=r
        print('PASS',v,'states',n)
    d=[[(0,Fraction(1,2)),(10,Fraction(1,2))]]
    v,_=exact_threshold_dp(d,8,4)
    assert v==2 and Fraction(10,2)<8
    print('PASS nonlinear expectation counterexample')

if __name__=='__main__': tests()
