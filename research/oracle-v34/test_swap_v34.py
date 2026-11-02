#!/usr/bin/env python3
"""Independent scoring, 210 multinomial distributions, terminal payoff audit.

No use of the research implementation for computing the independent scoring
or final Big Point function; only compare its reported lower bounds.
"""
from collections import Counter
from itertools import product,combinations_with_replacement
import random
from robust_swap_v34 import (CATS,HISTS,INDEX,SCORES,holds,
  hold_transitions,build_swap_lower,bonus,evaluate)

def independent_score(d):
 c=Counter(d);t=sum(d);s=sorted(d)
 return (4*c[4],5*c[5],6*c[6],
  15 if s==[1,2,3,4,5] else (20 if s==[2,3,4,5,6] else 0),
  t if sorted(c.values())==[2,3] else 0,
  t,t+20 if len(c)==1 else 0)

def independent_terminal(board):
 total=sum(v for k in CATS for v in board[k])
 bp=-2 if total<300 else -1 if total<350 else 0 if total<400 else 1 if total<450 else 2+(total-450)//50
 for c,k in enumerate(CATS):
  row=board[k]
  if c in (0,1,2,5):
   bp+=2*(sum(row)>={0:52,1:65,2:78,5:100}[c])
  elif c in (3,4):
   bp+={3:4,4:3}[c]*all(v>0 for v in row)
  else:bp+=2*sum(v>0 for v in row)
 return bp

def test():
 for i,h in enumerate(HISTS):
  assert tuple(SCORES[c][i] for c in range(7))==independent_score(h)
 ntrans=0
 for n in range(5):
  for h in combinations_with_replacement(range(1,7),n):
   got=Counter(dict(hold_transitions(h)))
   want=Counter(INDEX[tuple(sorted(h+d))] for d in product(range(1,7),repeat=5-n))
   assert got==want
   ntrans+=1
 assert ntrans==210
 rng=random.Random(340011)
 empty={k:[None]*4 for k in CATS}
 board24={k:list(v) for k,v in empty.items()}
 board24['fours']=[12,None,None,None]
 board24['fives']=[20,15,None,None]
 board24['straight']=[0,None,None,None]
 board20={k:list(v) for k,v in empty.items()}
 board20['straight']=[15,15,20,None]
 board20['sixes']=[0,6,12,18]
 board20['choice']=[5,None,None,None]
 checks=0
 for board,x in [(empty,[4,1,3,4,5]),(board24,[2,6,4,5,3]),(board20,[2,3,4,5,6])]:
  idx=INDEX[tuple(sorted(x))]
  legal=[c for c,k in enumerate(CATS) if None in board[k]]
  for c in legal:
   D=build_swap_lower(board,idx,c)
   for _ in range(200):
    d=rng.choice(legal);y=rng.randrange(252);z=rng.randrange(252)
    sy=SCORES[d][y];sz=tuple(SCORES[i][z] for i in range(7))
    A={k:[v for v in board[k] if v is not None] for k in CATS}
    B={k:list(v) for k,v in A.items()}
    if d==c:
     A[CATS[c]].append(SCORES[c][idx]);B[CATS[c]].append(sy)
    else:
     A[CATS[c]].append(SCORES[c][idx]);B[CATS[c]].append(sz[c])
     A[CATS[d]].append(sz[d]);B[CATS[d]].append(sy)
    for i,k in enumerate(CATS):
     while len(A[k])<4:
      v=independent_score(tuple(rng.randint(1,6) for _ in range(5)))[i]
      A[k].append(v);B[k].append(v)
    assert independent_terminal(A)-independent_terminal(B)>=D[d][y]
    checks+=1
 # Special r=0 witness is weak, but NOT proved when rerolls remain.
 witness=evaluate(board20,[2,3,4,5,6],0)
 assert any(a['candidate']=='score:straight' and a['globallyCertifiedWeak'] for a in witness['actions'])
 witness2=evaluate(board20,[2,3,4,5,6],2)
 assert not any(a['globallyCertifiedWeak'] for a in witness2['actions'])
 print('PASS scores=252 holds=210 complete-payoff-pairs=',checks,'v33-r0-positive/r2-negative')
if __name__=='__main__':test()
