"""Independent exact-rational, two-turn cross-check of a fully legal adaptive policy.
Does not import the policy implementation for the independent dice-decision oracle.
"""
import unittest
from collections import Counter,defaultdict
from fractions import Fraction
from functools import lru_cache
from itertools import combinations_with_replacement
from math import factorial
import group_policy5 as gp
from bounds_andor import compress, terminal,advance
FACES=range(1,7)
HISTS=tuple(combinations_with_replacement(FACES,5))
WEIGHTS={0:240,1:190,2:160,4:140,5:100}
SCALE=6**5

def score(cat,ds):
    n=Counter(ds);s=sum(ds)
    if cat==0:return 4*n[4]
    if cat==1:return 5*n[5]
    if cat==2:return 6*n[6]
    if cat==4:return s if sorted(n.values())==[2,3] else 0
    if cat==5:return s
    raise ValueError(cat)

def holds(ds):
    # independently enumerate every possible multiset hold, including hold-all.
    cnt=Counter(ds)
    for ns in __import__('itertools').product(*(range(cnt[f]+1) for f in FACES)):
        yield tuple(f for f,repeat in zip(FACES,ns) for _ in range(repeat))

@lru_cache(None)
def rerolls(held):
    n=5-len(held)
    out={}
    for add in combinations_with_replacement(FACES,n):
        w=factorial(n)
        for v in Counter(add).values():w//=factorial(v)
        out[tuple(sorted(held+add))]=Fraction(w,6**n)
    assert sum(out.values())==1
    return tuple(out.items())

def independent_kernel(cats):
    cats=tuple(cats)
    @lru_cache(None)
    def roll(ds,r):
        chosen=max(cats,key=lambda c:(WEIGHTS[c]*score(c,ds),-c))
        outcome=(chosen,score(chosen,ds))
        if r==0:return Fraction(WEIGHTS[chosen]*outcome[1]),{outcome:Fraction(1)}
        best=Fraction(WEIGHTS[chosen]*outcome[1]);bestdist={outcome:Fraction(1)}
        for h in holds(ds):
            # choosing hold-all is equivalent to scoring now
            if len(h)==5:continue
            children=[(p,roll(nextdice,r-1)) for nextdice,p in rerolls(h)]
            val=sum(p*v for p,(v,dist) in children)
            if val>best:
                best=val;d=defaultdict(Fraction)
                for p,(v,dist) in children:
                    for outcome,q in dist.items():d[outcome]+=p*q
                bestdist=dict(d)
        return best,bestdist
    result=defaultdict(Fraction)
    for ds in HISTS:
        w=factorial(5)
        for v in Counter(ds).values():w//=factorial(v)
        p=Fraction(w,6**5)
        _,dist=roll(ds,2)
        for a,q in dist.items():result[a]+=p*q
    return dict(result)

def sample_card():
    return {'fours':[16,16,16,None], 'fives':[15,15,15,15],
            'sixes':[18,18,18,18], 'straight':[15,20,15,20],
            'fullHouse':[18,18,18,18], 'choice':[25,25,25,None],
            'balut':[0,0,0,0]}

class TestGroupLower(unittest.TestCase):
    def test_normalization_masks(self):
        for mask in range(1,1<<len(gp.GROUP)):
            k=gp.kernel(mask)
            self.assertEqual(sum(w for _,w in k),gp.N)
            for (c,s),w in k:
                self.assertIn(c,[c for j,c in enumerate(gp.GROUP) if mask&(1<<j)])
                self.assertIn(s,{score(c,ds) for ds in HISTS})

    def test_independent_two_category_policy(self):
        mask=(1<<gp.GROUP.index(0))|(1<<gp.GROUP.index(5))
        actual={a:Fraction(w,gp.N) for a,w in gp.kernel(mask)}
        reference=independent_kernel((0,5))
        self.assertEqual(actual,reference)
        for c in (0,5):
            mask=(1<<gp.GROUP.index(c))
            actual={a:Fraction(w,gp.N) for a,w in gp.kernel(mask)}
            self.assertEqual(actual,independent_kernel((c,)))

    def test_two_turn_original_big_points(self):
        s=compress(sample_card());self.assertEqual(sum(s[0]),2)
        kg=gp.kernel((1<<gp.GROUP.index(0))|(1<<gp.GROUP.index(5)))
        dist1={a:Fraction(w,gp.N) for a,w in kg}
        ref=Fraction(0)
        for (c,sc),p in dist1.items():
            s1=advance(s,c,sc)
            other=5 if c==0 else 0
            sub={a:Fraction(w,gp.N) for a,w in gp.kernel(1<<gp.GROUP.index(other))}
            for (cc,sc2),q in sub.items():ref+=p*q*terminal(advance(s1,cc,sc2))
        n,d=gp.adaptive_group_value(s)
        self.assertEqual(Fraction(n,d),ref)
        # Confirm a genuine positive threshold/terminal bonus is in the fixture.
        self.assertGreater(terminal(advance(advance(s,0,16),5,30)),0)

if __name__=='__main__':unittest.main(verbosity=2)