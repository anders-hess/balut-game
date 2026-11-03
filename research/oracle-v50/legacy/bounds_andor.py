"""Research-only exact reward quotient + mathematically admissible decision-directed bounds.

No estimator is labeled exact. For remaining 1..7, public oracle() calls the
native full exact Bellman; state cap/time failures propagate as UNRESOLVED.
All current legal score actions (including positive scores and scratches) and
all legal holds are enumerated. Float64 interval propagation is outward-rounded.
"""
from __future__ import annotations
from collections import Counter
from functools import lru_cache
from itertools import combinations_with_replacement
from math import factorial, nextafter, inf
from pathlib import Path
import subprocess, json, time, argparse

CATS=('fours','fives','sixes','straight','fullHouse','choice','balut')
THR=(52,65,78,0,0,100,0)
MAXS=(20,25,30,20,30,30,50)
HISTS=tuple(combinations_with_replacement(range(1,7),5))
INDEX={h:i for i,h in enumerate(HISTS)}

def scorer(c,d):
 n=Counter(d);su=sum(d)
 if c<3:return (c+4)*n[c+4]
 if c==3:return 15 if tuple(d)==(1,2,3,4,5) else 20 if tuple(d)==(2,3,4,5,6) else 0
 if c==4:return su if sorted(n.values())==[2,3] else 0
 if c==5:return su
 return su+20 if len(n)==1 else 0
SCORES=tuple(tuple(scorer(c,d) for d in HISTS) for c in range(7))

def bonus(t):
 return -2 if t<300 else -1 if t<350 else 0 if t<400 else 1 if t<450 else 2+(t-450)//50

def compress(card):
 k=[];p=[0]*4;st=fh=ba=total=0
 for c,name in enumerate(CATS):
  col=card[name];assert len(col)==4
  filled=[int(x) for x in col if x is not None]
  k.append(4-len(filled));su=sum(filled);total+=su
  if c in (0,1,2,5):p[{0:0,1:1,2:2,5:3}[c]]=min(THR[c],su)
  if c==3:st=sum(x>0 for x in filled)
  if c==4:fh=sum(x>0 for x in filled)
  if c==6:ba=sum(x>0 for x in filled)
 return (tuple(k),tuple(p),st,fh,ba,total)

def advance(z,c,sc):
 k,p,st,fh,ba,t=z
 assert k[c]
 k=list(k);p=list(p);k[c]-=1;t+=sc
 if c in (0,1,2,5):
  j={0:0,1:1,2:2,5:3}[c];p[j]=min(THR[c],p[j]+sc)
 if c==3:st+=sc>0
 if c==4:fh+=sc>0
 if c==6:ba+=sc>0
 return (tuple(k),tuple(p),st,fh,ba,t)

def terminal(z):
 k,p,st,fh,ba,t=z
 assert sum(k)==0
 return bonus(t)+2*ba+2*sum(p[j]>=THR[c] for j,c in enumerate((0,1,2,5)))+4*(st==4)+3*(fh==4)

def physical_upper(z):
 """Exact integer pathwise dominating final Big Points, no stochastic optimism hidden."""
 k,p,st,fh,ba,t=z
 v=bonus(t+sum(a*b for a,b in zip(k,MAXS)))+2*(ba+k[6])
 v+=2*sum(p[j]+k[c]*MAXS[c]>=THR[c] for j,c in enumerate((0,1,2,5)))
 v+=4*(st+k[3]==4)+3*(fh+k[4]==4)
 return v

def physical_lower(z):
 # Every category Big Points contribution is nonnegative and terminal Small bonus >= -2.
 # Past secured row rewards survive into terminal, unlike arbitrary future scratches.
 k,p,st,fh,ba,t=z
 v=-2+2*ba
 v+=2*sum(p[j]>=THR[c] for j,c in enumerate((0,1,2,5)))
 v+=4*(st==4)+3*(fh==4)
 return v

def hold_names(d):
 n=Counter(d);out=[()]
 for face,count in sorted(n.items()):out=[h+(face,)*j for h in out for j in range(count+1)]
 return tuple(h for h in out if len(h)<5)

@lru_cache(None)
def transitions(h):
 n=5-len(h);out=[]
 for d in combinations_with_replacement(range(1,7),n):
  c=Counter(d);weight=factorial(n)
  for v in c.values():weight//=factorial(v)
  out.append((INDEX[tuple(sorted(h+d))],weight))
 assert sum(w for _,w in out)==6**n
 return tuple(out)

def down(x):return nextafter(x,-inf)
def up(x):return nextafter(x,inf)

def weighted(lohi,h,upward=False):
 f=up if upward else down
 v=0.0
 for j,w in transitions(h):v=f(v+f(lohi[j]*w))
 return f(v/(6**(5-len(h))))

def reroll_bounds(z,dice,r,leaf_lower,leaf_upper):
 """Return complete current actions with outward-rounded valid bounds."""
 idx=INDEX[tuple(sorted(dice))]
 legal=[c for c,x in enumerate(z[0]) if x]
 lo0=[max(leaf_lower(advance(z,c,SCORES[c][i])) for c in legal) for i in range(252)]
 hi0=[max(leaf_upper(advance(z,c,SCORES[c][i])) for c in legal) for i in range(252)]
 actions={}
 for c in legal:
  sc=SCORES[c][idx];s=advance(z,c,sc)
  actions['score:'+CATS[c]+':'+str(sc)]=(float(leaf_lower(s)),float(leaf_upper(s)))
 if r:
  lprev=lo0;uprev=hi0
  if r==2:
   # A feasible strategy can elect to stop and score, or reroll adaptively.
   lprev=[max(lo0[i],*(weighted(lo0,h) for h in hold_names(HISTS[i]))) for i in range(252)]
   uprev=[max(hi0[i],*(weighted(hi0,h,True) for h in hold_names(HISTS[i]))) for i in range(252)]
  for h in hold_names(tuple(sorted(dice))):
   ct=tuple(h.count(i) for i in range(1,7))
   actions['hold:'+''.join(map(str,ct))]=(weighted(lprev,h),weighted(uprev,h,True))
 return actions

# Exact feasible continuation policy: choose a fixed future category ordering,
# and within each turn optimize the expected Small Points from that category.
# The stage policy is nonanticipating, uses the correct two rerolls, and is legal.
# Its value is computed by finite integer convolutions (not Monte Carlo).
@lru_cache(None)
def fixed_category_distribution(c):
 D=7776
 score0=SCORES[c]
 firstValue=[];firstOut=[]
 for i,d in enumerate(HISTS):
  optVal=score0[i]*D
  optOut={score0[i]:D}
  for h in hold_names(d):
   n=5-len(h);dist={}
   for j,w in transitions(h):dist[score0[j]]=dist.get(score0[j],0)+w*6**(5-n)
   v=sum(k*w for k,w in dist.items())
   if v>optVal:optVal,optOut=v,dist
  firstValue.append(optVal);firstOut.append(optOut)
 secondOut=[]
 for i,d in enumerate(HISTS):
  optValue=score0[i]*D*D
  optDist={score0[i]:D*D}
  for h in hold_names(d):
   n=5-len(h);dist={}
   for j,w in transitions(h):
    for score0_,w0 in firstOut[j].items():dist[score0_]=dist.get(score0_,0)+w*w0*6**(5-n)
   v=sum(score0_*w for score0_,w in dist.items())
   if v>optValue:optValue,optDist=v,dist
  secondOut.append(optDist)
 total={}
 for i,d in enumerate(HISTS):
  weight=factorial(5)
  for j in range(1,7):weight//=factorial(d.count(j))
  for val,n in secondOut[i].items():total[val]=total.get(val,0)+n*weight
 assert sum(total.values())==D**3
 return tuple(sorted(total.items())),D**3

def conv(a,b):
 out={}
 for x,n in a.items():
  for y,m in b.items():out[x+y]=out.get(x+y,0)+n*m
 return out

@lru_cache(maxsize=500)
def exact_fixed_policy(z):
 """Mathematically exact rational expected final Big Points of a legal continuation.

 returns (numerator,denominator); every summand integral; can be costly for 28 turns.
 """
 k,p,st,fh,ba,t=z
 if sum(k)==0:return terminal(z),1
 num=(2*ba+4*(k[3]==0 and st==4)+3*(k[4]==0 and fh==4)+2*sum(k[c]==0 and p[j]>=THR[c] for j,c in enumerate((0,1,2,5))));den=1
 bonusSum={0:1};bonusDen=1
 for c in range(7):
  if k[c]==0:continue
  row={0:1};rowDen=1
  rolls,rollDen=fixed_category_distribution(c);rolls=dict(rolls)
  for _ in range(k[c]):row=conv(row,rolls);rowDen*=rollDen
  if c in (0,1,2,5):
   j={0:0,1:1,2:2,5:3}[c]
   rowNum=2*sum(cnt for sc,cnt in row.items() if p[j]+sc>=THR[c])
  else:rowNum=0
  if c in (3,4):
   oldSuccess=st if c==3 else fh
   rowNum=0
   if oldSuccess==4-k[c]:
    # success iff each future score >0; count positive outcomes directly
    successCnt=sum(w for sc,w in rolls.items() if sc>0)
    rowNum=(4 if c==3 else 3)*successCnt**k[c]
  if c==6:
   countPos=sum(w for sc,w in rolls.items() if sc>0)
   rowNum=2*k[c]*countPos*rollDen**(k[c]-1)
  num=num*rowDen+rowNum*den;den*=rowDen
  bonusSum=conv(bonusSum,row);bonusDen*=rowDen
 # num/den already accumulates all category Big Points; plus Small Point bonus.
 bonusNum=sum(bonus(t+sc)*cnt for sc,cnt in bonusSum.items())
 assert bonusDen==den
 return num+bonusNum,den

def approx_fixed_lower(z):
 n,d=exact_fixed_policy(z)
 # integer quotient floor at 1e-6 precision for an unambiguously admissible lower bound.
 return (n*1000000//d)/1000000

def cert(actions):
 best=max(actions,key=lambda x:actions[x][0]);l=actions[best][0]
 maxComp=max((b[1] for a,b in actions.items() if a!=best),default=-inf)
 return {'candidate':best,'certified':l>maxComp,'gap_to_certificate':maxComp-l,
         'pruned':sum(v[1]<l for a,v in actions.items() if a!=best),'legal_actions':len(actions)}

def exact_native(z,dice,r,limit=250000,timeout=30):
 exe=Path(__file__).with_name('exact_quotient')
 k,p,st,fh,ba,t=z
 args=[str(v) for v in [*k,*p,st,fh,ba,t,*dice,r,limit]]
 proc=subprocess.run([str(exe),*args],capture_output=True,text=True,timeout=timeout)
 if proc.returncode!=0:raise RuntimeError(proc.stderr.strip() or 'EXACT_UNAVAILABLE')
 return json.loads(proc.stdout)

def evaluate(card,dice,r,depth=0,policy=False):
 z=compress(card);remaining=sum(z[0]);start=time.monotonic()
 if remaining<=7:
  try:
   e=exact_native(z,dice,r)
   actions={a:(v,v) for a,v in e['actions'].items()}
   return dict(status='EXACT_FLOAT64',seconds=time.monotonic()-start,remaining=remaining,**cert(actions),actions=actions,exact=e)
  except (RuntimeError,subprocess.TimeoutExpired) as ex:
   return {'status':'EXACT_RESOURCE_LIMIT_NO_FALLBACK','remaining':remaining,'error':str(ex),'seconds':time.monotonic()-start}
 lower=approx_fixed_lower if policy else physical_lower
 upper=physical_upper
 # depth=1 is exact first new turn with admissible terminal bounds,
 # not exact global 28-turn Bellman.
 if depth:
  @lru_cache(maxsize=None)
  def lfn(z):
   return _lookahead(z,lower,upper)[0]
  @lru_cache(maxsize=None)
  def ufn(z):
   return _lookahead(z,lower,upper)[1]
  lower,upper=lfn,ufn
 actions=reroll_bounds(z,dice,r,lower,upper)
 return dict(status='BOUNDED',seconds=time.monotonic()-start,remaining=remaining,**cert(actions),actions=actions)

def _lookahead(z,lower,upper):
 legal=[c for c,k in enumerate(z[0]) if k]
 scoreL=[];scoreU=[]
 for i in range(252):
  scoreL.append(max(lower(advance(z,c,SCORES[c][i])) for c in legal))
  scoreU.append(max(upper(advance(z,c,SCORES[c][i])) for c in legal))
 for _ in (1,2):
  scoreL=[max(scoreL[i],*(weighted(scoreL,h) for h in hold_names(HISTS[i]))) for i in range(252)]
  scoreU=[max(scoreU[i],*(weighted(scoreU,h,True) for h in hold_names(HISTS[i]))) for i in range(252)]
 weights=[]
 for d in HISTS:
  n=Counter(d);w=factorial(5)
  for c in n.values():w//=factorial(c)
  weights.append(w)
 l=down(sum(weights[i]*scoreL[i] for i in range(252))/7776)
 u=up(sum(weights[i]*scoreU[i] for i in range(252))/7776)
 return (l,u)

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--observed',type=Path,required=True);a.add_argument('--start',type=int,default=0);a.add_argument('--count',type=int,default=2);a.add_argument('--depth',type=int,default=0);a.add_argument('--policy',action='store_true');a.add_argument('--out',type=Path,default=Path('metrics.json'));args=a.parse_args()
 cases=json.loads(args.observed.read_text())['cases'][args.start:args.start+args.count]
 results=[]
 for j,row in enumerate(cases):
  t=time.monotonic();z=evaluate(row['board'],row['dice'],2,args.depth,args.policy)
  result={k:v for k,v in z.items() if k not in ('actions','exact')}
  result.update(case_index=args.start+j,game=row['game'],dice=row['dice'],peak_memory_kb=__import__('resource').getrusage(__import__('resource').RUSAGE_SELF).ru_maxrss)
  results.append(result)
  print(json.dumps(result),flush=True)
 args.out.write_text(json.dumps(results,indent=2))