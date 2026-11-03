#!/usr/bin/env python3
"""General exact-integer multistage information-relaxation DP for actual Balut.

No Monte Carlo, no replacement of final bonus, all rerolls adaptive.
Scenario anticipates just a binary event of the *last future turn's initial roll*.
The event may be revealed during all earlier future decisions; optional
martingale penalty for revealing it before the CURRENT scoring choice.
For small 3/4-turn positions only; not an early 28-turn global U engine.
"""
from pathlib import Path
from fractions import Fraction as F
from collections import Counter
from math import factorial
from functools import lru_cache
import argparse,json,time,sys
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'legacy'))
from bounds_andor import HISTS,INDEX,SCORES,CATS,compress,advance,terminal
from integer_proof import D,HOLD_TABLE,transitions

W=[]
for dice in HISTS:
 counts=Counter(dice);num=factorial(5)
 for count in counts.values():num//=factorial(count)
 W.append(num)
assert sum(W)==D
T=[tuple(transitions(hold) for hold in hs) for hs in HOLD_TABLE]

def roll_back(previous,stop,stop_scale):
 return [max(stop[i]*stop_scale,max(sum(w*previous[j] for j,w in t) for t in T[i])) for i in range(252)]

def full_turn_numerator(stop):
 one=roll_back(stop,stop,D)
 two=roll_back(one,stop,D*D)
 return sum(x*w for x,w in zip(two,W))

def last_conditional_numerator(stop,indices):
 one=roll_back(stop,stop,D)
 two=roll_back(one,stop,D*D)
 return sum(W[i]*two[i] for i in indices)

def bonus_board(n):
 # n=3 => 3 active Fours/Fives/Choice
 board={
  'fours':[12,16,16,None], 'fives':[15,20,20,None],
  'sixes':[18,18,24,24], 'straight':[15,20,15,20],
  'fullHouse':[20,18,22,22], 'choice':[26,26,30,None],
  'balut':[0,0,0,0],
 }
 if n==4:
  board['sixes']=[18,18,24,None]
 return board

class CoupledRewardDual:
 def __init__(self, n, event='sum_ge_19'):
  self.n=n;self.board=bonus_board(n)
  self.dice=(4,4,4,5,5) if n==3 else (4,4,5,5,6)
  self.root=compress(self.board)
  if event=='sum_ge_19':f=lambda h:sum(h)>=19
  elif event=='at_least_two_fives':f=lambda h:h.count(5)>=2
  else:raise ValueError(event)
  self.partitions=[tuple(i for i,h in enumerate(HISTS) if f(h)==a) for a in [False,True]]
  self.mass=[sum(W[i] for i in arr) for arr in self.partitions]
  assert 0<min(self.mass)<D and sum(self.mass)==D
  self.counts={'last_event':0,'last_original':0,'conditional':0,'original':0}

 @lru_cache(maxsize=None)
 def val_cond(self,z,e):
  n=sum(z[0]);assert n
  if n==1:
   self.counts['last_event']+=1
   c=next(c for c,k in enumerate(z[0]) if k)
   stop=[terminal(advance(z,c,SCORES[c][i])) for i in range(252)]
   return last_conditional_numerator(stop,self.partitions[e])
  self.counts['conditional']+=1
  cats=[c for c,k in enumerate(z[0]) if k]
  leaf={(c,sc):self.val_cond(advance(z,c,sc),e) for c in cats for sc in set(SCORES[c])}
  stop=[max(leaf[c,SCORES[c][i]] for c in cats) for i in range(252)]
  return full_turn_numerator(stop)

 @lru_cache(maxsize=None)
 def val_orig(self,z):
  n=sum(z[0]);assert n
  if n==1:
   self.counts['last_original']+=1
   c=next(c for c,k in enumerate(z[0]) if k)
   stop=[terminal(advance(z,c,SCORES[c][i])) for i in range(252)]
   return full_turn_numerator(stop)
  self.counts['original']+=1
  cats=[c for c,k in enumerate(z[0]) if k]
  leaf={(c,sc):self.val_orig(advance(z,c,sc)) for c in cats for sc in set(SCORES[c])}
  stop=[max(leaf[c,SCORES[c][i]] for c in cats) for i in range(252)]
  return full_turn_numerator(stop)

 def evaluate(self):
  assert sum(self.root[0])==self.n
  idx=INDEX[tuple(sorted(self.dice))]
  data={}
  for c,k in enumerate(self.root[0]):
   if not k:continue
   sc=SCORES[c][idx];child=advance(self.root,c,sc)
   nq=self.val_orig(child)
   cond=[self.val_cond(child,e) for e in (0,1)]
   den=D**(3*(self.n-1))
   data[CATS[c]]={'score':sc,'exact_Q':str(F(nq,den)),
       'conditional_Q':[str(F(cond[e],self.mass[e]*D**(3*(self.n-1)-1))) for e in (0,1)],
       'original_num':str(nq),'conditional_num':list(map(str,cond))}
  assert len(data)==self.n
  true_best=max(F(d['exact_Q']) for d in data.values())
  futures_best=max(F(sum(map(int,d['conditional_num'])),D**(3*(self.n-1))) for d in data.values())
  unpenalized=sum(F(self.mass[e],D)*max(F(int(d['conditional_num'][e]),self.mass[e]*D**(3*(self.n-1)-1)) for d in data.values()) for e in [0,1])
  potentials={}
  for p,q in ((0,1),(1,4),(1,2),(3,4),(1,1)):
   P={c:[F(p*int(d['conditional_num'][e]),q*self.mass[e]*D**(3*(self.n-1)-1)) for e in (0,1)] for c,d in data.items()}
   means={c:sum(F(self.mass[e],D)*P[c][e] for e in (0,1)) for c in data}
   value=sum(F(self.mass[e],D)*max(F(int(d['conditional_num'][e]),self.mass[e]*D**(3*(self.n-1)-1))-P[c][e]+means[c] for c,d in data.items()) for e in (0,1))
   potentials[f'{p}/{q}']=value
  assert potentials['0/1']==unpenalized
  assert potentials['1/1']==futures_best
  assert all(v>=futures_best>=true_best for v in potentials.values())
  return {'horizon':self.n,'board':self.board,'dice':list(self.dice),'rerolls_left':0,
   'event':'last-future-turn initial five dice sum >=19', 'event_mass':self.mass,
   'event_is_not_observable_at_first_choice':True,'all_actions_positive':all(d['score']>0 for d in data.values()),
   'actions':data,'true_original_global_optimum':str(true_best),'current_best':max(data,key=lambda c:F(data[c]['exact_Q'])),
   'clairvoyant_unpenalized':str(unpenalized),'dual_perfect_current_stage':str(futures_best),
   'dual_penalty_potential_fraction':{k:str(v) for k,v in potentials.items()},
   'irreducible_future_information_gap':str(futures_best-true_best),
   'expected_clairvoyance_gap':str(unpenalized-true_best),
   'full_true_terminal_reward':True,'chance_probabilities_exact':True,
   'original_28_turn_global_certificate':False,'counts':self.counts}

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--horizon',type=int,choices=[3,4],default=3);ap.add_argument('--out',type=Path);a=ap.parse_args()
 t=time.monotonic();solver=CoupledRewardDual(a.horizon);result=solver.evaluate();result['seconds']=time.monotonic()-t
 if a.out:a.out.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k not in ('actions','board','dual_penalty_potential_fraction')},indent=2))