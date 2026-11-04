from fractions import Fraction as F
from functools import lru_cache
from itertools import product
import json, time, resource

# 3-category / 3-turn toy game: two fair binary dice per turn.
# First observed die can be kept or replaced by a fresh independent reroll.
# Choose any unfilled category after the final die. Nonlinear terminal reward.
C=3
def points(c,d): return ((6,1,3) if d==1 else (1,6,4))[c]
def reward(s):
    return F(sum(s),3)+F(7 if sum(s)>=12 else 0)+F(5 if s[0]>=4 and s[2]>=4 else 0)

@lru_cache(None)
def exact(mask,s):
    if mask==7:return reward(s)
    def after(d):
        return max(exact(mask|1<<c,tuple(s[i] if i!=c else points(c,d) for i in range(C))) for c in range(C) if not mask>>c&1)
    reroll=(after(1)+after(2))/2
    return (max(after(1),reroll)+max(after(2),reroll))/2

# Full advance disclosure of all future die pairs. This enlarges the policy set,
# and hence is a mathematically admissible upper for this toy game.
@lru_cache(None)
def clair(mask,s,seq):
    if mask==7:return reward(s)
    d0,d1=seq[0]
    return max(clair(mask|1<<c,tuple(s[i] if i!=c else points(c,d) for i in range(C)),seq[1:])
               for d in (d0,d1) for c in range(C) if not mask>>c&1)

def upper(mask,s):
    n=C-mask.bit_count()
    return sum((clair(mask,s,seq) for seq in product(product((1,2),repeat=2),repeat=n)),F(0))/4**n

def actions(mask,s,d):
    out=[]
    for kind in ('keep','reroll'):
        for c in range(C):
            if mask>>c&1:continue
            def val(x):
                ns=tuple(s[i] if i!=c else points(c,x) for i in range(C))
                return exact(mask|1<<c,ns),upper(mask|1<<c,ns)
            lo,hi=val(d) if kind=='keep' else tuple(sum((p[k] for p in (val(1),val(2))),F(0))/2 for k in (0,1))
            out.append((kind,c,lo,hi))
    return out

def run():
    t=time.perf_counter(); states=tests=acts=certs=pruned=0; maxgap=F(0)
    for mask in range(7):
        for s in product((0,2,4,6),repeat=C):
            if any(s[c] for c in range(C) if not mask>>c&1):continue
            if any(s[c]==0 for c in range(C) if mask>>c&1):continue
            e,u=exact(mask,s),upper(mask,s)
            assert e<=u
            states+=1;tests+=1;maxgap=max(maxgap,u-e)
            for d in (1,2):
                aa=actions(mask,s,d);acts+=len(aa)
                for _,_,lo,hi in aa:assert lo<=hi;tests+=1
                best=max(a[2] for a in aa)
                certs+=any(a[2]>max((b[3] for j,b in enumerate(aa) if i!=j),default=F(-999)) for i,a in enumerate(aa))
                pruned+=sum(a[3]<best for a in aa)
    result=dict(states=states,inequalities=tests,actions=acts,certified_observations=certs,
                pruned_rivals=pruned,maxgap=str(maxgap),seconds=round(time.perf_counter()-t,5),
                peak_rss_kb=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
                root_exact=str(exact(0,(0,0,0))),root_upper=str(upper(0,(0,0,0))),
                scope='toy only; no Balut Q reference or 30 opening actions')
    print(json.dumps(result,indent=2))
if __name__=='__main__':run()
