"""Independent exact Fraction cross-check for 1-turn and two-turn score actions."""
from fractions import Fraction as F
from collections import Counter
from math import factorial
from bounds_andor import CATS,HISTS,INDEX,compress,advance,terminal
from integer_proof import HOLD_TABLE
import json
from bounds_andor import exact_native

def score_independent(c,d):
 n=Counter(d);s=sum(d)
 if c==0:return 4*n[4]
 if c==1:return 5*n[5]
 if c==2:return 6*n[6]
 if c==3:return 15 if set(d)==set(range(1,6)) else 20 if set(d)==set(range(2,7)) else 0
 if c==4:return s if sorted(n.values())==[2,3] else 0
 if c==5:return s
 return s+20 if len(n)==1 else 0

def roll_dist(hold):
 from itertools import combinations_with_replacement
 n=5-len(hold)
 for d in combinations_with_replacement(range(1,7),n):
  m=factorial(n)
  for cnt in Counter(d).values():m//=factorial(cnt)
  yield INDEX[tuple(sorted(hold+d))],F(m,6**n)

def pass_one(vals,stops):
 return [max([stops[i]]+[sum(w*vals[j] for j,w in roll_dist(h)) for h in HOLD_TABLE[i]]) for i in range(252)]

def one_turn(z):
 assert sum(z[0])==1
 c=next(i for i,k in enumerate(z[0]) if k)
 stops=[F(terminal(advance(z,c,score_independent(c,d)))) for d in HISTS]
 one=pass_one(stops,stops);two=pass_one(one,stops)
 ans=0
 for i,d in enumerate(HISTS):
  m=factorial(5)
  for cnt in Counter(d).values():m//=factorial(cnt)
  ans+=F(m,7776)*two[i]
 return ans

def test():
 z=compress({c:[None,None,None,None] for c in CATS});
 # 1 turn only Choice with 3 existing Choice scores
 z=(tuple([0,0,0,0,0,1,0]),tuple([52,65,78,57]),4,4,1,410)
 dice=[2,3,4,5,6];native=exact_native(z,dice,2)
 c=5;score=score_independent(5,tuple(dice))
 stops=[F(terminal(advance(z,c,score_independent(c,d)))) for d in HISTS]
 one=pass_one(stops,stops)
 for name,v in native['actions'].items():
  if name.startswith('score:'):ref=F(terminal(advance(z,c,score)))
  else:
   digits=[int(x) for x in name.split(':')[1]]
   hold=tuple(x for i,n in enumerate(digits) for x in [i+1]*n)
   ref=sum(w*one[j] for j,w in roll_dist(hold))
  assert abs(float(ref)-v)<1e-12,(name,float(ref),v)
 # two-turn score action test, both positive categories available
 z2=(tuple([1,0,0,0,0,1,0]),tuple([45,65,78,80]),4,4,2,410)
 dice=[4,4,4,5,6];native=exact_native(z2,dice,0)
 for key,v in native['actions'].items():
  c=int(key.split(':')[1]);sc=score_independent(c,tuple(sorted(dice)))
  ref=one_turn(advance(z2,c,sc))
  assert abs(float(ref)-v)<1e-12,(key,float(ref),v)
 return {'one_turn_all_actions_checked':len(exact_native(z,dice,2)['actions']),'two_turn_positive_score_actions_checked':len(native['actions']),'exact_rational_failures':0}
if __name__=='__main__':print(json.dumps(test(),indent=2))
