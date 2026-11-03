"""Independent exact-integer all-action Gate-3 certificate checker.

Separately regenerates current legal actions and propagates 75 exact-rational
policy floors through both rerolls. Does NOT rely on production certificate().
The mathematical validity of future policy values is checked by source-level
proof and independent Fraction fixtures in test_adaptive6.py.
"""
import json,hashlib,itertools,math
from collections import Counter
from pathlib import Path
HERE=Path(__file__).parent
D=6**5; S=10**6
CAT=('fours','fives','sixes','straight','fullHouse','choice','balut')

def dice_score(cat,d):
 n=Counter(d);total=sum(d)
 if cat=='fours':return 4*n[4]
 if cat=='fives':return 5*n[5]
 if cat=='sixes':return 6*n[6]
 if cat=='straight':return 15 if tuple(d)==(1,2,3,4,5) else 20 if tuple(d)==(2,3,4,5,6) else 0
 if cat=='fullHouse':return total if sorted(n.values())==[2,3] else 0
 if cat=='choice':return total
 return total+20 if len(n)==1 else 0

def histograms(n):return tuple(itertools.combinations_with_replacement(range(1,7),n))
ALL=histograms(5);idx={t:i for i,t in enumerate(ALL)}

def holds(ds):
 cnt=Counter(ds)
 for keep in itertools.product(*(range(cnt[i]+1) for i in range(1,7))):
  out=tuple(i for i,k in enumerate(keep,1) for _ in range(k))
  if len(out)<5:yield out

def outcomes(h):
 n=5-len(h);total=0
 for v in histograms(n):
  den=math.factorial(n)
  for q in Counter(v).values():den//=math.factorial(q)
  w=den*6**len(h);total+=w
  yield idx[tuple(sorted(h+v))],w
 assert total==D

def assert_correct():
 root=json.loads((HERE/'observed_early_cases_v28.json').read_text())['cases'][0]
 x=json.loads((HERE/'gate3_result6.json').read_text());old=json.loads((HERE/'portfolio_0_2.json').read_text())['results'][0]
 assert x['dice']==root['dice']==[4,1,3,4,5]
 assert x['scorecard']==root['board'] and root['remaining']==28
 assert x['rerolls_left']==2 and x['actual_legal_actions']==30
 assert len(x['policy_leaf_audit'])==75
 leaf={(v['category'],v['score']):int(v['policy_micro_floor']) for v in x['policy_leaf_audit']}
 assert len(leaf)==75
 for cat in CAT:
  support={dice_score(cat,d) for d in ALL}
  assert {sc for c,sc in leaf if c==cat}==support
 stop=[max(leaf[(cat,dice_score(cat,d))] for cat in CAT) for d in ALL]
 once=[]
 for i,d in enumerate(ALL):
  opt=stop[i]*D
  for h in holds(d):opt=max(opt,sum(w*stop[j] for j,w in outcomes(h)))
  once.append(opt)
 acts={}
 for cat in CAT:
  key=f'score:{cat}:{dice_score(cat,tuple(sorted(x["dice"]))) }'
  acts[key]=leaf[(cat,dice_score(cat,tuple(sorted(x['dice']))))]*D**2
 for h in holds(x['dice']):
  key='hold:'+''.join(str(h.count(i)) for i in range(1,7))
  acts[key]=sum(w*once[j] for j,w in outcomes(h))
 assert len(acts)==30
 assert set(acts)==set(old['actions'])==set(x['action_intervals'])
 assert sum(a.startswith('hold:') for a in acts)==23
 assert sum(a.startswith('score:') for a in acts)==7
 den=S*D**2
 lows={};ups={}
 for a,entry in x['action_intervals'].items():
  olde=old['actions'][a]
  assert int(entry['den'])==int(olde['den'])==den
  observed=int(entry['lo_num']);expected=max(acts[a],int(olde['lo_num']))
  assert observed==expected,(a,observed,expected)
  assert int(entry['up_num'])==int(olde['up_num'])
  assert observed<=int(entry['up_num'])
  lows[a]=observed;ups[a]=int(entry['up_num'])
 best=max(lows,key=lambda a:lows[a]);maxr=max(ups[a] for a in acts if a!=best)
 cert=lows[best]>maxr
 pruned=sum(ups[a]<lows[best] for a in acts if a!=best)
 assert not cert and pruned==0
 witness=x['root_certification']['exact_integer_witness']
 assert int(witness['best_low_num'])==lows[best]
 assert int(witness['max_rival_high_num'])==maxr
 assert int(witness['common_denominator'])==den
 assert best=='hold:000200' and max(ups,key=ups.get)=='hold:000200'
 assert max((a for a in acts if a!=best),key=lambda a:ups[a])=='hold:001110'
 return {'independent_check':'PASS','case':0,'turns':28,'dice':x['dice'],'score_count':7,'hold_count':23,
   'positive_score_actions':['score:fours:8','score:fives:5','score:choice:17'],
   'checked_policy_score_leaf_floors':75,'action_count':30,'candidate':best,
   'candidate_L_micro_num':str(lows[best]),'largest_rival_U_micro_num':str(maxr),
   'common_denominator':str(den),'strict_certificate':cert,'pruned_actions':pruned,
   'gap_bp':(maxr-lows[best])/den,'root_input_sha256':hashlib.sha256((HERE/'observed_early_cases_v28.json').read_bytes()).hexdigest(),
   'result_sha256':hashlib.sha256((HERE/'gate3_result6.json').read_bytes()).hexdigest()}

if __name__=='__main__':
 outcome=assert_correct()
 print(json.dumps(outcome,indent=2))
 (HERE/'independent_check.json').write_text(json.dumps(outcome,indent=2))