"""Independent verification of integer-certified v47 quota upper.
Includes independent ordered dice enumeration, Fraction dual Bellman (small quota),
frozen global-Q reference containment, and real exact native short-horizon Q.
"""
from collections import Counter
from fractions import Fraction
from functools import lru_cache
from itertools import product
import json,subprocess,random,unittest
from pathlib import Path
from bounds_andor import CATS,INDEX,HISTS,SCORES,compress,scorer,exact_native
from integer_proof import HOLD_TABLE,transitions as source_transitions,guaranteed_policy_lower,physical_bound_u,action_envelopes
from run_gate2 import quota_u,evaluate
HERE=Path(__file__).resolve().parent
D=7776;MIC=1000000

def independence_score(c,d):
 n={i:d.count(i) for i in range(1,7)}; s=sum(d)
 if c<3:return (c+4)*n[c+4]
 if c==3:
  if set(d)=={1,2,3,4,5}:return 15
  if set(d)=={2,3,4,5,6}:return 20
  return 0
 if c==4:return s if sorted(Counter(d).values())==[2,3] else 0
 if c==5:return s
 return s+20 if len(set(d))==1 else 0

@lru_cache(None)
def unordered_hold_results(h):
 n=5-len(h);cnt=Counter()
 for seq in product(range(1,7),repeat=n):cnt[tuple(sorted(h+seq))]+=1
 assert sum(cnt.values())==6**n
 return [(INDEX[d],w) for d,w in cnt.items()]

def independent_beta(z,alpha):
 k,p,st,fh,ba,t=z
 maxs=(20,25,30,20,30,30,50)
 def bonus(t):return -2 if t<300 else -1 if t<350 else 0 if t<400 else 1 if t<450 else 2+(t-450)//50
 return max(Fraction(bonus(t+x))-alpha*x for x in range(5*k[5],sum(x*y for x,y in zip(k,maxs))+1))

def independent_surrogate(z,alpha):
 k,p,st,fh,ba,total=z
 thr=(52,65,78,100);maxs=(20,25,30,20,30,30,50)
 G=Fraction(2*ba)
 for c,j in ((0,0),(1,1),(2,2),(5,3)):
  if p[j]>=thr[j]:G+=2
 for c,n,award in ((3,st,4),(4,fh,3)):
  if not k[c] and n==4:G+=award
 rewards={}
 for c in range(7):
  if not k[c]:continue
  a=[]
  for d in HISTS:
   s=independence_score(c,d);v=alpha*s
   if c in (0,1,2,5):
    j=(0,1,2,3)[(0,1,2,5).index(c)]
    if p[j]<thr[j]<=p[j]+k[c]*maxs[c]:v+=Fraction(2*s,thr[j]-p[j])
   if c==3 and st+k[c]==4 and s:v+=Fraction(4,k[c])
   if c==4 and fh+k[c]==4 and s:v+=Fraction(3,k[c])
   if c==6 and s:v+=2
   a.append(v)
  rewards[c]=a
 return G,independent_beta(z,alpha),rewards

def independent_current_actions(z,dice,r,alpha):
 G,beta,rewards=independent_surrogate(z,alpha)
 @lru_cache(None)
 def whole(k):
  if not sum(k):return Fraction(0)
  cand={}
  for c in rewards:
   if k[c]:
    nxt=list(k);nxt[c]-=1;cand[c]=whole(tuple(nxt))
  stop=[max(rewards[c][i]+cand[c] for c in cand) for i in range(252)]
  once=advance_roll(stop,stop)
  twice=advance_roll(once,stop)
  counts=Counter(tuple(sorted(x)) for x in product(range(1,7),repeat=5))
  return sum(w*twice[INDEX[d]] for d,w in counts.items())/D
 def advance_roll(prev,stop):
  results=[]
  for i,d in enumerate(HISTS):
   best=stop[i]
   for h in HOLD_TABLE[i]:
    results0=unordered_hold_results(h)
    num=sum(w*prev[j] for j,w in results0)
    q=num/Fraction(6**(5-len(h)))
    if q>best:best=q
   results.append(best)
  return results
 k=z[0]
 continuation={}
 for c in rewards:
  if k[c]:
   nxt=list(k);nxt[c]-=1;continuation[c]=whole(tuple(nxt))
 di=INDEX[tuple(sorted(dice))]
 stop=[max(rewards[c][i]+continuation[c] for c in continuation) for i in range(252)]
 prev=advance_roll(stop,stop) if r==2 else stop
 out={}
 for c in continuation:out[f'score:{CATS[c]}:{independence_score(c,tuple(sorted(dice)))}']=G+beta+rewards[c][di]+continuation[c]
 if r:
  for h in HOLD_TABLE[di]:
   ct=''.join(str(h.count(j)) for j in range(1,7))
   out[f'hold:{ct}']=G+beta+sum(w*prev[j] for j,w in unordered_hold_results(h))/Fraction(6**(5-len(h)))
 return out

class QuotaAudit(unittest.TestCase):
 def test_every_score_against_independent_scorer(self):
  for d in HISTS:
   for c in range(7):self.assertEqual(scorer(c,d),independence_score(c,d))
 def test_all_210_hold_distributions_independent_ordered_rolls(self):
  from math import factorial
  holds=set(h for row in HOLD_TABLE for h in row)
  self.assertEqual(len(holds),210)
  for h in holds:
   derived=Counter(dict(source_transitions(h)))
   independent={idx:w*6**len(h) for idx,w in unordered_hold_results(h)}
   self.assertEqual(dict(derived),independent)
 def test_fraction_surrogate_all_actions_tiny_2_quota(self):
  # 26 completed slots, two distinct real positive scoring opportunities remain.
  card={c:[0,0,0,0] for c in CATS}
  card['fours']=[4,8,12,None];card['choice']=[16,23,25,None]
  z=compress(card);self.assertEqual(sum(z[0]),2)
  d=[4,4,5,3,6];alpha_micro=14000
  frac=independent_current_actions(z,d,2,Fraction(alpha_micro,MIC))
  native=quota_u(z,d,2,alpha_micro)
  self.assertEqual(set(frac),set(native['actions_micro']))
  for key,q in frac.items():
   upper=Fraction(native['actions_micro'][key],MIC)
   self.assertGreaterEqual(upper,q, (key,float(upper),float(q)))
   self.assertLess(upper-q,Fraction(3,10000),(key,float(upper-q)))
 def test_exact_reference_all_92_unchanged(self):
  rows=json.loads((HERE/'reference_exact_q_v27.json').read_text());n=0
  for row in rows:
   s=row['stateInput'];z=(tuple(4-x for x in s[:7]),tuple(s[7:11]),s[11],s[12],s[13],s[14]);d=s[15:20];r=s[20]
   out=evaluate(z,d,r,(14000,),reference=row['exactActionQ'],record_actions=False)
   self.assertEqual(out['reference_check']['violations'],0,out['reference_check'])
   n+=out['reference_check']['checked']
  self.assertEqual(n,92)
 def test_true_1_2_3_turn_q_all_positive_actions(self):
  rng=random.Random(47)
  for n in (1,2,3):
   for _ in range(2):
    card={c:[0,0,0,0] for c in CATS}
    slots=rng.sample([(c,i) for c in CATS for i in range(4)],n)
    for c,i in slots:card[c][i]=None
    # make surviving categories bonus-progress mixed, all legal scores from dice
    for c,name in enumerate(CATS):
     for i,score in enumerate(card[name]):
      if score is not None:card[name][i]=independence_score(c,rng.choice(HISTS))
    z=compress(card);dice=list(rng.choice(HISTS))
    true=exact_native(z,dice,2,limit=150000,timeout=35)['actions']
    upper=quota_u(z,dice,2,14000)['actions_micro']
    for key,q in true.items():
     if key.startswith('score:'):
      _,c,sc=key.split(':');key='score:'+CATS[int(c)]+':'+sc
     self.assertGreaterEqual(upper[key]/MIC+1e-11,q,(n,key,q,upper[key]/MIC))
if __name__=='__main__':unittest.main(verbosity=2)