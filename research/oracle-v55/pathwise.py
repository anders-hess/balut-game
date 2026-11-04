"""Exact rational Bellman versus pathwise clairvoyant terminal-reward relaxation.
Restricted toy, NOT original Balut bounds.
"""
from fractions import Fraction as F
from functools import lru_cache
from itertools import product
import json,time,resource
OUTCOMES=((3,1),(0,2))
def reward(scores):
    total=sum(scores)
    return F(total,3)+F(7 if total>=4 else 0)+F(5 if min(scores)>=1 else 0)
@lru_cache(None)
def bellman(remaining,scores):
    if not remaining: return reward(scores)
    return sum((max(bellman(tuple(x for x in remaining if x!=a),tuple(scores[i]+(out[a] if i==a else 0) for i in range(2))) for a in remaining) for out in OUTCOMES),F(0))/len(OUTCOMES)
def offline(remaining,scores,trajectory):
    if not trajectory:return reward(scores)
    out=trajectory[0]
    return max(offline(tuple(x for x in remaining if x!=a),tuple(scores[i]+(out[a] if i==a else 0) for i in range(2)),trajectory[1:]) for a in remaining)
def clairvoyant(remaining,scores):
    return sum((offline(remaining,scores,path) for path in product(OUTCOMES,repeat=len(remaining))),F(0))/len(OUTCOMES)**len(remaining)
def main():
    start=time.perf_counter();tests=[]
    for scores in product(range(3),repeat=2):
        for rem in ((0,),(1,),(0,1)):
            lo=bellman(rem,scores);hi=clairvoyant(rem,scores)
            assert lo<=hi,(scores,rem,lo,hi)
            tests.append({'scores':scores,'remaining':rem,'exact':str(lo),'offline_upper':str(hi),'gap':str(hi-lo)})
    root=next(x for x in tests if x['scores']==(0,0) and x['remaining']==(0,1))
    result={'passed':len(tests),'root':root,'elapsed_seconds':round(time.perf_counter()-start,6),'peak_rss_kb':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,'early_balut_certificates':0,'early_balut_pruned':0,'original_Q_tests':0,'opening_actions_tested':0,'scope':'restricted two-category two-outcome toy only'}
    print(json.dumps(result,indent=2))
    open('results.json','w').write(json.dumps({'summary':result,'cases':tests},indent=2)+'\n')
if __name__=='__main__':main()
