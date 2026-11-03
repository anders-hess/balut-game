"""Check every legal action Q against older exact Bellman on multiple frozen states."""
from compare_solvers import *
from bounds_andor import advance
from independent_fraction import one_turn, score_independent, pass_one, roll_dist
from fractions import Fraction
import random, os

cases=[]
matrix = [(1,2),(2,1),(3,1),(4,1)] if os.environ.get("QUICK_Q_CHECK", "0")=="1" else [(1,5),(2,4),(3,4),(4,2),(5,1)]
for h,variants in matrix:
 for variant in range(variants):
  card=card_for(PATTERNS[h], 77000 + h*101+variant*27)
  z=compress(card)
  dice=[1,2,3,4,5] if variant%2==0 else [4,4,4,6,6]
  old=run_binary(BASE,z,dice,2,65000,23)
  new=run_binary(ROOT/'exact_reachable',z,dice,2,65000,23)
  assert old['status']==new['status']=='EXACT_FLOAT64',(h,variant,old,new)
  err=compare(old,new)
  cases.append({'remaining':h,'variant':variant,'dice':dice,'max_abs_action_Q_error':err,'number_actions_checked':len(old['actions']),'v44_states':old['states'],'v46_states':new['states'],'v44_seconds':old['seconds'],'v46_seconds':new['seconds']})
  print('Q-check',h,variant,'actions',len(old['actions']),'error',err,flush=True)
# genuinely independent exact Fraction for two-turn positive score branches
z=(tuple([1,0,0,0,0,1,0]),tuple([45,65,78,80]),4,4,2,410)
dice=[4,4,4,5,6]
native=run_binary(ROOT/'exact_reachable',z,dice,0,50000,10)
assert native['status']=='EXACT_FLOAT64'
for a,v in native['actions'].items():
 c=int(a.split(':')[1]);sc=score_independent(c,tuple(sorted(dice)))
 ref=one_turn(advance(z,c,sc))
 assert abs(v-float(ref))<1e-11,(a,v,ref)
print('two-turn independent Fraction positive actions',len(native['actions']))
res={'q_action_tests':sum(c['number_actions_checked'] for c in cases),'q_states':len(cases),
     'max_abs_error':max(c['max_abs_action_Q_error'] for c in cases),
     'fraction_positive_score_actions':len(native['actions']),'cases':cases}
(ROOT/('quick_audit_results.json' if os.environ.get('QUICK_Q_CHECK', '0')=='1' else 'audit_results.json')).write_text(json.dumps(res,indent=2))
print(json.dumps({k:v for k,v in res.items() if k!='cases'},indent=2))