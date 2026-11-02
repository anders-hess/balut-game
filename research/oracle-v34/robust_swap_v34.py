#!/usr/bin/env python3
"""Oracle v34 research-only stochastic policy-swap regret certificate.

For any current score c(x), a nonanticipative randomized policy can simulate
any rival's current rerolls and category d(y), then follow the rival's virtual
future policy, swapping the first future c(z) to d(z) when d!=c. Exact terminal
bonus minimization gives a pathwise D_c(d,y) lower on A minus rival; a rational
two-reroll adversarial DP gives Q*(rival)-Q*(score c)<=M_c(rival).
No trained model, no approximate terminal reward, no claimed early optimum.
"""
from collections import Counter
from itertools import combinations_with_replacement
from functools import lru_cache
from pathlib import Path
import argparse,json,time

CATS=('fours','fives','sixes','straight','fullHouse','choice','balut')
THRESH=(52,65,78,0,0,100,0)
REWARDS=(2,2,2,4,3,2,2)
FACES=range(1,7)
HISTS=list(combinations_with_replacement(FACES,5))
INDEX={h:i for i,h in enumerate(HISTS)}
DICE=[]
for d in HISTS:
 c=Counter(d);sm=sum(d)
 DICE.append((4*c[4],5*c[5],6*c[6],
   15 if d==(1,2,3,4,5) else (20 if d==(2,3,4,5,6) else 0),
   sm if sorted(c.values())==[2,3] else 0,
   sm,sm+20 if len(c)==1 else 0))
SCORES=tuple(tuple(row[c] for row in DICE) for c in range(7))
SCORE_SETS=tuple(tuple(sorted(set(sc))) for sc in SCORES)
PAIRSETS=tuple(tuple(tuple(sorted(set((DICE[i][c],DICE[i][d])
  for i in range(252)))) for d in range(7)) for c in range(7))
SCOREMAX=tuple(max(s) for s in SCORES)
SCOREMIN=tuple(min(s) for s in SCORES)

@lru_cache(None)
def reachable_sums(c,n):
 vals={0}
 for _ in range(n):vals={a+b for a in vals for b in SCORE_SETS[c]}
 return tuple(sorted(vals))

def bonus(total):
 if total<300:return -2
 if total<350:return -1
 if total<400:return 0
 if total<450:return 1
 return 2+(total-450)//50

@lru_cache(None)
def bonus_diff_min(delta,lo,hi):
 assert hi>=lo
 return min(bonus(t+delta)-bonus(t) for t in range(lo,hi+1))

@lru_cache(None)
def row_bonus_min(cat,old,new,filled_scores,other_slots):
 assert 0<=other_slots<=3
 if cat in (0,1,2,5):
  base=sum(filled_scores);th=THRESH[cat]
  return min(2*(base+v+new>=th)-2*(base+v+old>=th)
    for v in reachable_sums(cat,other_slots))
 if cat in (3,4):
  if any(x==0 for x in filled_scores):return 0
  difference=REWARDS[cat]*((new>0)-(old>0))
  return difference if other_slots==0 else min(0,difference)
 if cat==6:return 2*((new>0)-(old>0))
 raise ValueError(cat)

@lru_cache(None)
def hold_transitions(hold):
 """Return exact integer multinomial (next histogram ID, multiplicity)."""
 from math import factorial
 n=5-len(hold);assert 1<=n<=5
 out=[]
 for rolled in combinations_with_replacement(FACES,n):
  cc=Counter(rolled);merged=tuple(sorted(hold+rolled))
  mult=factorial(n)
  for v in cc.values():mult//=factorial(v)
  out.append((INDEX[merged],mult))
 assert sum(w for _,w in out)==6**n
 return tuple(out)

@lru_cache(None)
def holds(d):
 c=Counter(d);opts=[()]
 for face,count in sorted(c.items()):
  opts=[h+(face,)*n for h in opts for n in range(count+1)]
 return tuple(h for h in opts if len(h)<5)

def build_swap_lower(card,current_idx,c,*,compressed_total=None):
 """D[d][y] is a conservative integer terminal BP advantage for score c."""
 filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
 k=tuple(4-len(f) for f in filled)
 assert k[c]>0
 present_total=sum(sum(f) for f in filled) if compressed_total is None else compressed_total
 x=SCORES[c][current_idx]
 D=[[None]*252 for _ in range(7)]
 for d in range(7):
  if not k[d]:continue
  for y in range(252):
   yscore=SCORES[d][y]
   if d==c:
    delta=x-yscore
    row_min=row_bonus_min(c,yscore,x,filled[c],k[c]-1)
    others_lo=sum((k[e]-(e==c))*SCOREMIN[e] for e in range(7))
    others_hi=sum((k[e]-(e==c))*SCOREMAX[e] for e in range(7))
    lo=present_total+yscore+others_lo
    hi=present_total+yscore+others_hi
    D[d][y]=row_min+bonus_diff_min(delta,lo,hi)
    continue
   others_lo=sum((k[e]-(e in (c,d)))*SCOREMIN[e] for e in range(7))
   others_hi=sum((k[e]-(e in (c,d)))*SCOREMAX[e] for e in range(7))
   best=1000
   for zc,zd in PAIRSETS[c][d]:
    delta=x+zd-yscore-zc
    row_c=row_bonus_min(c,zc,x,filled[c],k[c]-1)
    row_d=row_bonus_min(d,yscore,zd,filled[d],k[d]-1)
    lo=present_total+yscore+zc+others_lo
    hi=present_total+yscore+zc+others_hi
    val=row_c+row_d+bonus_diff_min(delta,lo,hi)
    if val<best:best=val
   D[d][y]=best
 return D

def evaluate(card,dice,rerolls=2):
 """All legal immediate-score candidates versus every rival score and hold.

The adversarial Bellman uses denominator 7776**r and integer numerators.
No Float64 is used for the sign tests or certified elimination counts.
"""
 assert rerolls in (0,1,2)
 idx=INDEX[tuple(sorted(dice))]
 filled=[sum(x is not None for x in card[k]) for k in CATS]
 legal=[c for c in range(7) if filled[c]<4]
 out=[]
 for c in legal:
  D=build_swap_lower(card,idx,c)
  stops=[max(-D[d][y] for d in legal) for y in range(252)]
  values=[stops]
  for r in range(1,rerolls+1):
   denom=7776**r
   prior=values[-1]
   targets=range(252) if r<rerolls else [idx]
   cur=[]
   for y in targets:
    best=stops[y]*denom
    for h in holds(HISTS[y]):
     n=5-len(h)
     numerator=sum(w*prior[j] for j,w in hold_transitions(h))*6**(5-n)
     if numerator>best:best=numerator
    cur.append(best)
   values.append(cur)
  score_ub={CATS[d]:-D[d][idx] for d in legal if d!=c}
  hold_raw=[]
  if rerolls:
   prior=values[rerolls-1]
   for h in holds(HISTS[idx]):
    n=5-len(h)
    hold_raw.append(sum(w*prior[j] for j,w in hold_transitions(h))*6**(5-n))
  best_raw=max(hold_raw) if hold_raw else None
  out.append({
   'candidate':'score:'+CATS[c],
   'maxRivalScoreAdvantageUpperBP':max(score_ub.values(),default=None),
   'maxRivalHoldAdvantageUpperBP':best_raw/(7776**rerolls) if best_raw is not None else None,
   'scoreActionsEliminated':[name for name,u in score_ub.items() if u<0],
   'holdsEliminated':sum(u<0 for u in hold_raw),
   'holdCount':len(hold_raw),
   'globallyCertifiedUnique':all(u<0 for u in score_ub.values()) and
      (best_raw is None or best_raw<0),
   'globallyCertifiedWeak':all(u<=0 for u in score_ub.values()) and
      (best_raw is None or best_raw<=0),
   'bestHoldNumerator':str(best_raw) if best_raw is not None else None,
   'bestHoldDenominator':str(7776**rerolls) if best_raw is not None else None})
 return {'remaining':28-sum(filled),'dice':dice,'rerolls':rerolls,'actions':out}

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--cases',default=str(Path(__file__).resolve().parent/'observed_early_cases_v28.json'))
 p.add_argument('--start',type=int,default=0)
 p.add_argument('--count',type=int,default=1)
 p.add_argument('--out',default='v34_result.json')
 p.add_argument('--rerolls',type=int,default=2)
 args=p.parse_args()
 cases=json.loads(Path(args.cases).read_text())['cases']
 t=time.time();results=[]
 for i in range(args.start,min(len(cases),args.start+args.count)):
  row=cases[i];v=evaluate(row['board'],row['dice'],args.rerolls)
  v.update({'caseIndex':i,'game':row['game']});results.append(v)
  print('case',i,'remaining',v['remaining'],'certified',
        sum(a['globallyCertifiedUnique'] for a in v['actions']),flush=True)
 Path(args.out).write_text(json.dumps({'results':results,'seconds':time.time()-t},indent=2))
if __name__=='__main__':main()
