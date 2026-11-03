#!/usr/bin/env python3
"""Independent regression and mathematical tests for original Balut v50 dual."""
import unittest,sys,json
from fractions import Fraction as F
from pathlib import Path
from math import factorial
from collections import Counter
from itertools import permutations
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'legacy'))
from bounds_andor import CATS,HISTS,SCORES,compress,terminal,bonus
from integer_proof import D,HOLD_TABLE,transitions
from dual_multiturn_bonus import CoupledRewardDual,bonus_board
from verify_certificates import verify

class V50Tests(unittest.TestCase):
 def test_real_scorecard_possible_in_game(self):
  for n in (3,4):
   b=bonus_board(n)
   for c,name in enumerate(CATS):
    allowed=set(SCORES[c]);allowed.add(0) # scratch legal
    for x in b[name]:
     if x is not None:self.assertIn(x,allowed,(n,name,x))
   self.assertEqual(sum(compress(b)[0]),n)
   self.assertIn('choice',b)
   self.assertEqual(b['choice'],[26,26,30,None])

   # Production chooses rightmost free column for high 4s/5s/6s/high-straight,
   # leftmost for all other scores. Prove each row is physically reachable.
   for c,name in enumerate(CATS):
    target=b[name]; values=[x for x in target if x is not None]
    def high(x):
     return (c==0 and x>=16) or (c==1 and x>=20) or (c==2 and x>=24) or (c==3 and x==20)
    reachable=False
    for perm in set(permutations(values)):
     cols=[None]*4
     for x in perm:
      open_slots=[j for j,y in enumerate(cols) if y is None]
      place=(open_slots[-1] if high(x) else open_slots[0])
      cols[place]=x
     if cols==target:reachable=True;break
    self.assertTrue(reachable,(n,name,target))
 def test_rule_bonus_continues_above_450(self):
  self.assertEqual([bonus(n) for n in (299,300,349,350,399,400,449,450,499,500,550)],[-2,-1,-1,0,0,1,1,2,2,3,4])
 def test_all_252_histograms_and_210_holds(self):
  self.assertEqual(len(HISTS),252)
  self.assertEqual(sum(factorial(5)//__import__('math').prod(factorial(v) for v in Counter(h).values()) for h in HISTS),D)
  self.assertEqual(len({h for holds in HOLD_TABLE for h in holds}),210)
  for h in {hold for hs in HOLD_TABLE for hold in hs}:
   self.assertEqual(sum(w for _,w in transitions(h)),D)
 def test_short_original_action_certificates(self):
  for n in (3,4):
   j=verify(n)
   self.assertEqual(j['category_count'],n)
   self.assertTrue(j['certificate']['strict_positive_integer_margin'].isdigit())
   self.assertEqual(j['certificate']['positive_current_competitors_pruned'],n-1)
 def test_3turn_independent_python_full_fraction_against_cplusplus(self):
  j=json.loads((ROOT/'native3.json').read_text())
  p=CoupledRewardDual(3).evaluate()
  for c,name in [('0','fours'),('1','fives'),('5','choice')]:
   self.assertEqual(j['actions'][c]['original_num'],p['actions'][name]['original_num'])
   self.assertEqual(j['actions'][c]['conditional_num'],p['actions'][name]['conditional_num'])
 def test_28turn_not_relabelled_exact(self):
  a=json.loads((ROOT/'frozen_opening_v49.json').read_text())
  self.assertEqual(a['remaining_turns'],28)
  self.assertEqual(a['current_legal_actions'],30)
  self.assertEqual(a['certified_early_actions'],0)
  self.assertEqual(a['newly_pruned_actions'],0)
  self.assertAlmostEqual(a['gap_BP'],13.970800495756173,places=10)
 def test_exact_zero_mean_for_each_action_and_penalty(self):
  for n in (3,4):
   a=json.loads((ROOT/f'native{n}.json').read_text()); mass=a['event_mass'];h=3*(n-1)
   for action,v in a['actions'].items():
    q=[F(int(v['conditional_num'][e]),mass[e]*D**(h-1)) for e in (0,1)]
    for factor in (F(1,4),F(1,2),F(3,4),F(1)):
     p=[factor*x for x in q]
     mean=sum(F(mass[e],D)*p[e] for e in (0,1))
     penalty_mean=sum(F(mass[e],D)*(p[e]-mean) for e in (0,1))
     self.assertEqual(penalty_mean,F(0))

if __name__=='__main__':unittest.main()