import json,subprocess,time,random,unittest
from math import factorial
from collections import Counter
from bounds_andor import CATS,HISTS,INDEX,SCORES,compress,advance,terminal,physical_upper,physical_lower,bonus,scorer,exact_fixed_policy
from integer_proof import *
from pathlib import Path
HERE=Path(__file__).resolve().parent

def independent_score(c,h):
 n=[h.count(x) for x in range(1,7)];s=sum(h)
 if c<3:return (c+4)*n[c+3]
 if c==3:
  if set(h)=={1,2,3,4,5}:return 15
  if set(h)=={2,3,4,5,6}:return 20
  return 0
 if c==4:return s if 2 in n and 3 in n else 0
 if c==5:return s
 return s+20 if 5 in n else 0

def independent_terminal(card):
 rows=[card[c] for c in CATS]
 tot=sum(v for row in rows for v in row if v is not None)
 bp=bonus(tot)
 for c,th in ((0,52),(1,65),(2,78),(5,100)):
  bp+=2*(sum(v or 0 for v in rows[c])>=th)
 bp+=4*(sum(v is not None and v>0 for v in rows[3])==4)
 bp+=3*(sum(v is not None and v>0 for v in rows[4])==4)
 bp+=2*sum(v is not None and v>0 for v in rows[6])
 return bp

class TestSolver(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.native=json.loads(subprocess.check_output([str(HERE/'exact_quotient'),'--audit-scores'],text=True))
  cls.reference=json.loads((HERE.parent/'oracle_v37/reference_exact_q_v27.json').read_text())
 def test_all_1764_category_scores_vs_independent_and_cxx(self):
  self.assertEqual(len(HISTS),252)
  for i,h in enumerate(HISTS):
   for c in range(7):
    v=independent_score(c,h)
    self.assertEqual(SCORES[c][i],v)
    self.assertEqual(self.native[i][c],v)
 def test_10000_raw_terminal_scores(self):
  r=random.Random(43)
  for _ in range(10000):
   card={}
   for c,name in enumerate(CATS):
    possible=SCORES[c]
    card[name]=[r.choice(possible) for k in range(4)]
   z=compress(card)
   self.assertEqual(terminal(z),independent_terminal(card))
 def test_10000_quotient_updates(self):
  r=random.Random(44)
  for _ in range(10000):
   card={}
   for c,name in enumerate(CATS):
    n=r.randrange(5)
    card[name]=[r.choice(SCORES[c]) for i in range(n)]+[None]*(4-n)
   z=compress(card)
   legal=[c for c,k in enumerate(z[0]) if k]
   if not legal:continue
   c=r.choice(legal);d=r.choice(HISTS);val=independent_score(c,d)
   card[CATS[c]][card[CATS[c]].index(None)]=val
   self.assertEqual(advance(z,c,val),compress(card))
 def test_transition_multiplicities(self):
  from integer_proof import transitions,HOLD_TABLE
  self.assertEqual(len(HOLD_TABLE),252)
  for i,h in enumerate(HISTS):
   for hold in HOLD_TABLE[i]:
    self.assertEqual(sum(w for j,w in transitions(hold)),7776)
 def test_exact_policy_integer_and_terminal(self):
  r=random.Random(15)
  for _ in range(30):
   card={c:[r.choice(SCORES[j]) for i in range(4)] for j,c in enumerate(CATS)}
   z=compress(card);n,d=exact_fixed_policy(z)
   self.assertEqual((n,d),(terminal(z),1))
 def test_frozen_92_exact_q_enclosed(self):
  checked=0
  for row in self.reference:
   s=row['stateInput'];z=(tuple(4-x for x in s[:7]),tuple(s[7:11]),s[11],s[12],s[13],s[14]);dice=s[15:20]
   a=action_envelopes(z,dice,s[20],guaranteed_policy_lower,physical_bound_u)
   test=compare_with_exact(a,row['exactActionQ']);checked+=test['checked']
   self.assertEqual(test['violations'],0,repr(test))
  self.assertEqual(checked,92)
 def test_exact_native_few_short_horizons(self):
  # public engine *only* exact for <=7; no silent approximations.
  z=(tuple([0,0,0,0,0,2,0]),(0,0,0,0),0,0,0,410)
  e=__import__('bounds_andor').exact_native(z,[2,3,4,5,6],2,limit=60000,timeout=15)
  self.assertEqual(e['status'],'EXACT_FLOAT64')
  a=action_envelopes(z,[2,3,4,5,6],2,guaranteed_policy_lower,physical_bound_u)
  for key,q in e['actions'].items():
   if key.startswith('score:'):
    _,cc,sc=key.split(':');key='score:'+CATS[int(cc)]+':'+sc
   low,high,den=a[key]
   self.assertLessEqual(low/den-1e-10,q)
   self.assertGreaterEqual(high/den+1e-10,q)
 def test_selective_expansion_improves_and_is_valid(self):
  z=compress({c:[None]*4 for c in CATS})
  z=advance(z,5,17)
  lower,upper=preturn_interval(z,True)
  self.assertGreaterEqual(lower,guaranteed_policy_lower(z))
  self.assertLessEqual(upper,physical_bound_u(z))
  self.assertLessEqual(lower,upper)

if __name__=='__main__':unittest.main(verbosity=2)