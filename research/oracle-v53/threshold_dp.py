"""Exact rational state-dependent threshold/quota micro-model; NOT full Balut."""
from fractions import Fraction as F
from functools import lru_cache
from itertools import product
import json,time,resource
OUTCOMES={('A',0):((F(1,2),2),(F(1,2),4)),('A',1):((F(1,4),1),(F(3,4),5)),('B',0):((F(1,2),1),(F(1,2),3)),('B',1):((F(1,2),0),(F(1,2),4))}
T=5
BONUS=F(7,2)
@lru_cache(None)
def dp(mask,progress):
    if mask==3:return BONUS if progress>=T else F(0)
    return max(sum((p*dp(mask|1<<j,min(T,progress+x)) for p,x in OUTCOMES[(c,int(progress>=3))]),F(0)) for j,c in enumerate('AB') if not mask>>j&1)
def brute(mask,progress):
    if mask==3:return BONUS if progress>=T else F(0)
    return max(sum((p*brute(mask|1<<j,min(T,progress+x)) for p,x in OUTCOMES[(c,int(progress>=3))]),F(0)) for j,c in enumerate('AB') if not mask>>j&1)
def run():
    start=time.perf_counter()
    for mask,progress in product(range(4),range(6)):
        assert dp(mask,progress)==brute(mask,progress)
    actions={c:str(sum((p*dp(1<<j,min(T,x)) for p,x in OUTCOMES[(c,0)]),F(0))) for j,c in enumerate('AB')}
    result=dict(checks=24,root_exact_fraction=str(dp(0,0)),root_action_q=actions,dp_states=dp.cache_info().currsize,seconds=time.perf_counter()-start,maxrss_kb=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,original_balut_Q_verified=False,locked_30_actions_verified=False,early_global_certificates=0,pruned_early_rivals=0)
    print(json.dumps(result,indent=2))
if __name__=='__main__':run()
