"""Exact rational seven-category one-roll threshold quota microgame; NOT Balut optimality."""
from fractions import Fraction as F
from functools import lru_cache
from itertools import product
from collections import Counter
import json,time,resource
CATS=('fours','fives','sixes','straight','fullhouse','choice','balut')
ROLLS=Counter(tuple(sorted(d)) for d in product(range(1,7),repeat=5))
assert sum(ROLLS.values())==7776
def score(c,d):
    counts=[d.count(i) for i in range(1,7)]
    if c in ('fours','fives','sixes'):
        face={'fours':4,'fives':5,'sixes':6}[c]
        return face*counts[face-1]
    if c=='choice':return sum(d)
    if c=='straight':return 15 if list(d)==[1,2,3,4,5] else (20 if list(d)==[2,3,4,5,6] else 0)
    if c=='fullhouse':return 15 if sorted(counts,reverse=True)[:2]==[3,2] else 0
    if c=='balut':return 30 if 5 in counts else 0
    raise ValueError(c)
@lru_cache(None)
def dp(mask,progress,threshold=25):
    if mask==127:return F(int(progress>=threshold))
    return sum((F(n,7776)*max(dp(mask|1<<i,min(threshold,progress+score(c,d)),threshold) for i,c in enumerate(CATS) if not mask>>i&1) for d,n in ROLLS.items()),F(0))
def run():
    t=time.perf_counter()
    checks=0
    for i in range(7):
        mask=127^(1<<i)
        for p in (0,20,24):
            ref=sum((F(n,7776)*F(int(p+score(CATS[i],d)>=25)) for d,n in ROLLS.items()),F(0))
            assert dp(mask,p)==ref
            checks+=1
    for i in range(7):
        for j in range(i+1,7):
            mask=127^(1<<i)^(1<<j)
            for p in (0,20,24):
                ref=sum((F(n,7776)*max(sum((F(m,7776)*F(int(p+score(CATS[k],d)+score(CATS[l],e)>=25)) for e,m in ROLLS.items()),F(0)) for k,l in ((i,j),(j,i))) for d,n in ROLLS.items()),F(0))
                assert dp(mask,p)==ref
                checks+=1
    d=(1,3,4,4,5)
    q={c:dp(1<<i,min(25,score(c,d))) for i,c in enumerate(CATS)}
    out=dict(checks=checks,root_dice=d,root_actions=7,root_Q={k:str(v) for k,v in q.items()},states=dp.cache_info().currsize,seconds=round(time.perf_counter()-t,4),maxrss_kb=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,original_Balut_Q_verified=False,locked_30_actions_verified=False,early_global_certificates=0,pruned_early_rivals=0,valid_original_game_bound=False)
    print(json.dumps(out,indent=2))
if __name__=='__main__':run()
