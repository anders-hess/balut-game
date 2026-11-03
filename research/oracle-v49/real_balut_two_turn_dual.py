#!/usr/bin/env python3
"""Actual Balut-scoring 2-turn nonanticipativity dual, exact integer.
Current state has exactly two categories open (Fours, Choice), one slot each;
current dice are fixed and no rerolls remain; next turn has 3 full rolls.
Clairvoyant sees ONLY the future first roll before current category choice.
Independent exact optimal value, zero/immediate/perfect martingale duals.
Does NOT certify any 28-turn decision.
"""
from fractions import Fraction as F
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(next(q for q in (ROOT.parent/'oracle_v47',ROOT.parent/'oracle-v47') if q.exists())))
from bounds_andor import compress,advance,terminal,SCORES,HISTS,INDEX,CATS
from integer_proof import HOLD_TABLE,transitions
from collections import Counter
from math import factorial
D=7776
BOARD={
 'fours':[12,16,20,None], 'fives':[10,10,15,20], 'sixes':[12,12,12,12],
 'straight':[15,0,0,20], 'fullHouse':[0,0,0,0],
 'choice':[25,25,25,None], 'balut':[0,0,0,0]
}
DICE=[4,4,4,5,5]
def weighted(vals,h):return sum(w*vals[idx] for idx,w in transitions(h))
WEIGHTS=[]
for d in HISTS:
 m=factorial(5)
 for count in Counter(d).values():m//=factorial(count)
 WEIGHTS.append(m)
assert sum(WEIGHTS)==D

def future_value_by_first_roll(current_category):
 z=compress(BOARD)
 assert sum(z[0])==2
 i=INDEX[tuple(sorted(DICE))]
 current=advance(z,current_category,SCORES[current_category][i]);other=5 if current_category==0 else 0
 end=[terminal(advance(current,other,SCORES[other][j])) for j in range(252)]
 first=[]
 for j,d in enumerate(HISTS):
  first.append(max([D*end[j]]+[weighted(end,h) for h in HOLD_TABLE[j]]))
 second=[]
 for j,d in enumerate(HISTS):
  second.append(max([D*D*end[j]]+[weighted(first,h) for h in HOLD_TABLE[j]]))
 return end,first,second

def dual(second,firstpot):
 # second[c][y] and firstpot[c][y] both in reward * D^2 units;
 # first roll distribution has integer w/D; actual Q = num / D^3.
 mu=[sum(w*p for w,p in zip(WEIGHTS,firstpot[c])) for c in range(2)]
 res=sum(w*max(D*(second[c][j]-firstpot[c][j])+mu[c] for c in range(2))
             for j,w in enumerate(WEIGHTS))
 return F(res,D**4)

def run():
 ed0,f0,v0=future_value_by_first_roll(0);ed1,f1,v1=future_value_by_first_roll(5)
 v=[v0,v1];ends=[ed0,ed1]
 exact_by_current=[F(sum(w*a for w,a in zip(WEIGHTS,s)),D**3) for s in v]
 optimum=max(exact_by_current)
 clair=F(sum(w*max(s[i] for s in v) for i,w in enumerate(WEIGHTS)),D**3)
 zero=dual(v,[[0]*252,[0]*252])
 immediate=dual(v,[[e*D*D for e in end] for end in ends])
 one_reroll=dual(v,[[x*D for x in f0],[x*D for x in f1]])
 search=[(p,q,dual(v,[[((p*a*D)+(q*b))//(p+q) for a,b in zip(f0,v0)], [((p*a*D)+(q*b))//(p+q) for a,b in zip(f1,v1)]])) for p,q in [(1,0),(4,1),(1,1),(1,4),(0,1)]]
 best_proxy=min(search,key=lambda x:x[2])
 perfect=dual(v,v)
 assert zero==clair and optimum<=immediate and perfect==optimum
 # Enumerate Q of both real current scoring actions independently as brute-force
 # exact 252 multinomial distributions and future adaptively chosen legal holds.
 result={'model':'genuine Balut terminal scoring, constructed legal 2-turn board',
  'current_dice':DICE,'remaining_turns':2,'rerolls_left':0,'category_actions':['Fours 12','Choice 22'],
  'current_action_Q_exact':{CATS[c]:str(q) for c,q in zip((0,5),exact_by_current)},
  'global_best':CATS[(0,5)[exact_by_current.index(optimum)]],
  'exact_global_Q':str(optimum),'clairvoyant_U':str(clair),
  'dual_immediate_terminal_potential_U':str(immediate),
  'dual_exact_conditional_value_potential_U':str(perfect),
  'dual_one_reroll_potential_U':str(one_reroll),
  'best_proxy_dual_U':str(best_proxy[2]),
  'best_proxy_weights':list(best_proxy[:2]),
  'clairvoyance_gap_BP':float(clair-optimum),
  'immediate_potential_improvement_BP':float(clair-immediate),
  'fraction_exact':True,'all_five_dice_histograms':len(HISTS),
  'all_possible_current_score_actions':2}
 (ROOT/'balut_two_turn_exact_dual.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2))
if __name__=='__main__':run()