"""Machine-checkable exact-INTEGER Bellman envelope (no Float64 proof claims).

Each score-leaf bound is an integer number of MICRO Big Points. A reroll
step multiplies its denominator by D=6^5. It handles all valid holds and
stops at each reroll, with exact transition multiplicities.
For a fixed legal continuation policy, its expected score lower is computed
by integer convolutions; physical upper is pathwise integer-exact.
"""
from __future__ import annotations
from collections import Counter
from functools import lru_cache
from itertools import combinations_with_replacement
from math import factorial
from bounds_andor import CATS,HISTS,INDEX,SCORES,compress,advance,physical_lower,physical_upper,exact_fixed_policy,THR,terminal
D=7776
SCALE=1000000

def hist_holds(hist):
 counts=Counter(hist);hs=[()]
 for face,n in sorted(counts.items()):hs=[h+(face,)*j for h in hs for j in range(n+1)]
 return [h for h in hs if len(h)<5]

@lru_cache(None)
def transitions(h):
 n=5-len(h)
 out=[]
 for dice in combinations_with_replacement(range(1,7),n):
  counts=Counter(dice);weight=factorial(n)
  for v in counts.values():weight//=factorial(v)
  out.append((INDEX[tuple(sorted(h+dice))],weight*6**(5-n)))
 assert sum(w for _,w in out)==D
 return out

HOLD_TABLE=tuple(hist_holds(h) for h in HISTS)

def outcome_numerator(h,previous):
 return sum(w*previous[i] for i,w in transitions(h))

def pass_reroll(prev,stop,scale):
 return [max(stop[i]*scale,*(outcome_numerator(h,prev) for h in HOLD_TABLE[i])) for i in range(252)]

def action_envelopes(z,dice,r,leaf_lower,leaf_upper):
 """Return inclusive (low_num,high_num,denom) for all legal current actions.

 Bound inputs MUST return integer MICRO BP, lower<=true<=upper in real arithmetic.
 """
 assert r in (0,1,2)
 legal=[c for c,k in enumerate(z[0]) if k]
 leaf_l={};leaf_u={}
 for c in legal:
  for sc in set(SCORES[c]):
   child=advance(z,c,sc)
   lo=int(leaf_lower(child));hi=int(leaf_upper(child))
   if lo>hi:raise ValueError('inconsistent leaf intervals')
   leaf_l[c,sc]=lo;leaf_u[c,sc]=hi
 stopsL=[max(leaf_l[c,SCORES[c][i]] for c in legal) for i in range(252)]
 stopsU=[max(leaf_u[c,SCORES[c][i]] for c in legal) for i in range(252)]
 hidx=INDEX[tuple(sorted(dice))];denom=SCALE*D**r
 actions={}
 for c in legal:
  sc=SCORES[c][hidx]
  actions['score:'+CATS[c]+':'+str(sc)]=(leaf_l[c,sc]*D**r,leaf_u[c,sc]*D**r,denom)
 if r>0:
  lprev,uPrev=stopsL,stopsU
  if r==2:
   lprev=pass_reroll(stopsL,stopsL,D)
   uPrev=pass_reroll(stopsU,stopsU,D)
  for h in HOLD_TABLE[hidx]:
   key='hold:'+''.join(str(h.count(i)) for i in range(1,7))
   lo=outcome_numerator(h,lprev);hi=outcome_numerator(h,uPrev)
   actions[key]=(lo,hi,denom)
 return actions

def floor_div(a,b):return a//b
def ceil_div(a,b):return -((-a)//b)

def guaranteed_policy_lower(z):
 n,d=exact_fixed_policy(z)
 return floor_div(n*SCALE,d)

def physical_bound_l(z):return SCALE*physical_lower(z)
def physical_bound_u(z):return SCALE*physical_upper(z)

@lru_cache(maxsize=5000)
def preturn_interval(z,policy=False):
 """One exact next turn with bounded tail. Numerator denominator integer-exact."""
 legal=[c for c,k in enumerate(z[0]) if k]
 L=(guaranteed_policy_lower if policy else physical_bound_l)
 U=physical_bound_u
 vL={};vU={}
 for c in legal:
  for sc in set(SCORES[c]):
   child=advance(z,c,sc)
   vL[c,sc]=L(child);vU[c,sc]=U(child)
 stopL=[max(vL[c,SCORES[c][i]] for c in legal) for i in range(252)]
 stopU=[max(vU[c,SCORES[c][i]] for c in legal) for i in range(252)]
 oneL=pass_reroll(stopL,stopL,D)
 oneU=pass_reroll(stopU,stopU,D)
 twoL=pass_reroll(oneL,stopL,D**2)
 twoU=pass_reroll(oneU,stopU,D**2)
 den=SCALE*D**3
 nums=[]
 for h in HISTS:
  w=factorial(5)
  counts=Counter(h)
  for x in counts.values():w//=factorial(x)
  nums.append(w)
 lo=sum(x*y for x,y in zip(nums,twoL))
 hi=sum(x*y for x,y in zip(nums,twoU))
 return floor_div(lo*SCALE,den),ceil_div(hi*SCALE,den)

def certificate(actions):
 assert actions
 denoms={d for l,h,d in actions.values()};assert len(denoms)==1
 den=denoms.pop()
 best=max(actions,key=lambda a:actions[a][0]);lo=actions[best][0]
 rival=max((v[1] for a,v in actions.items() if a!=best),default=-10**100)
 return dict(candidate=best,certified=lo>rival,legal_actions=len(actions),pruned=sum(v[1]<lo for a,v in actions.items() if a!=best),
             gap_bp=(rival-lo)/den,best_lower_bp=lo/den,max_rival_upper_bp=rival/den,
             exact_integer_witness={'best_low_num':str(lo),'max_rival_high_num':str(rival),'common_denominator':str(den)})

def compare_with_exact(actions,exact_q,tolerance=2e-9):
 from json import loads
 failures=[];covered=0
 for key,v in exact_q.items():
  kind,c,hold=loads(key)
  if kind=='score':
   # target name may be in frozen Q but current scoring includes positive target sum.
   a=next((x for x in actions if x.startswith('score:'+c+':')),None)
  else:a='hold:'+''.join(map(str,hold))
  if a is None or a not in actions:failures.append(('missing',key));continue
  l,u,d=actions[a]
  if not l/d-tolerance<=v<=u/d+tolerance:failures.append((key,a,v,l/d,u/d))
  covered+=1
 return {'checked':covered,'violations':len(failures),'failure_examples':failures[:5]}