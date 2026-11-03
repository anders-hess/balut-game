"""Decision-directed stochastic AND/OR bound refinement.

The upper-optimal *current rival hold* induces a distribution on category / score
leaves. Re-optimize the true nonlinear-remaining-bonus quota relaxation at the
most influential score leaves; all unexpanded leaves retain certified upper.
All actual upper-propagation and certification are exact integer, only the
priority ordering is heuristic. Does NOT claim original 28-turn exactness.
"""
from collections import Counter
import argparse,json,subprocess,time
from pathlib import Path
from bounds_andor import CATS,SCORES,HISTS,INDEX,compress,advance
from integer_proof import D,HOLD_TABLE,transitions,action_envelopes,certificate,physical_bound_l,physical_bound_u
from run_gate2 import quota_u,obs_cases,ALPHAS
from run_leaf_portfolio import refine_leaf
HERE=Path(__file__).resolve().parent

def cached_old(i):
 for p in HERE.glob('observed_[0-9]*_[0-9]*.json'):
  for row in json.loads(p.read_text())['results']:
   if row['case']==i:return {k:tuple(int(v[t]) for t in ('lo_num','up_num','den')) for k,v in row['actions'].items()}
 raise RuntimeError('missing old case')

def native_state_u(child,alpha,timeout=45):
 k,p,st,fh,ba,t=child
 cmd=[str(HERE/'quota_upper'),'--value',*(str(x) for x in (*k,*p,st,fh,ba,t,alpha))]
 q=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout)
 if q.returncode:raise RuntimeError(q.stderr)
 return json.loads(q.stdout)

def rank_optimistic_leaves(z,dice,r,leaf):
 assert r==2
 root=INDEX[tuple(sorted(dice))]
 stop=[];bestcat=[]
 for i in range(252):
  opts=[(leaf[c,SCORES[c][i]],c) for c,k in enumerate(z[0]) if k]
  v,c=max(opts)
  stop.append(v);bestcat.append(c)
 one=[];policy=[]
 for i,d in enumerate(HISTS):
  b=stop[i];arg=None
  for h in HOLD_TABLE[i]:
   q=(sum(w*stop[j] for j,w in transitions(h))+D-1)//D
   if q>b:b=q;arg=h
  one.append(b);policy.append(arg)
 return stop,bestcat,one,policy

def select_target_and_rank(z,dice,actions,leaf,top=8):
 # Upper-leading competing hold, excluding lower-leading candidate.
 cert=certificate(actions)
 candidate=cert['candidate']
 rivals=sorted((v[1],key) for key,v in actions.items() if key!=candidate and key.startswith('hold:'))
 if not rivals:raise RuntimeError('no competing hold')
 target=rivals[-1][1]
 htuple=tuple(int(s) for s in target.split(':')[1]);first_hold=tuple(f for i,n in enumerate(htuple,1) for f in [i]*n)
 _,bestcat,_,pol=rank_optimistic_leaves(z,dice,2,leaf)
 mass=Counter()
 for i,wfirst in transitions(first_hold):
  follow=pol[i]
  if follow is None:
   c=bestcat[i];mass[c,SCORES[c][i]]+=wfirst*D
  else:
   for j,wsecond in transitions(follow):
    c=bestcat[j];mass[c,SCORES[c][j]]+=wfirst*wsecond
 assert sum(mass.values())==D**2,(sum(mass.values()),D**2)
 selected=mass.most_common(top)
 return target,selected

def run(case=0,leaf_budget=8):
 row=obs_cases()[case];z=compress(row['board']);dice=row['dice'];r=2
 baseline=cached_old(case);t0=time.monotonic()
 child_u={(c,s):physical_bound_u(advance(z,c,s)) for c,k in enumerate(z[0]) if k for s in set(SCORES[c])}
 for alpha in ALPHAS:
  res=quota_u(z,dice,r,alpha)
  for key,v in res['leaf_micro'].items():
   c,s=map(int,key.split(':'));child_u[c,s]=min(child_u[c,s],v)
 def build_bounds():
  mapping={advance(z,c,s):v for (c,s),v in child_u.items()}
  a=action_envelopes(z,dice,r,physical_bound_l,lambda child:mapping[child])
  return {key:(baseline[key][0],min(baseline[key][1],a[key][1]),baseline[key][2]) for key in a}
 before=build_bounds();target,ranked=select_target_and_rank(z,dice,before,child_u,top=leaf_budget)
 rec=[]
 for (c,s),mass in ranked:
  child=advance(z,c,s)
  prev=child_u[c,s]
  details=[]
  for alpha in ALPHAS:
   x=native_state_u(child,alpha)
   details.append({k:x[k] for k in ('alpha_micro','value_micro','states','seconds')})
   child_u[c,s]=min(child_u[c,s],x['value_micro'])
  partial=build_bounds()
  rec.append({'category':CATS[c],'score':s,'path_weight_fraction':[str(mass),str(D**2)],'old_leaf_upper_micro':prev,'new_leaf_upper_micro':child_u[c,s],
              'old_target_upper_micro':before[target][1]//D**2,'target_upper_bp':partial[target][1]/partial[target][2],
              'new_gap_bp':certificate(partial)['gap_bp'],'child_calls':details})
 result=build_bounds()
 record={'case':case,'dice':dice,'remaining':sum(z[0]),'target_rival_hold':target,'leaf_budget':leaf_budget,'seconds_total':time.monotonic()-t0,
         'baseline_portfolio':certificate(before),'after':certificate(result),'reoptimized_leaves':rec,
         'all_actions':{a:{'lo_num':str(v[0]),'up_num':str(v[1]),'den':str(v[2])} for a,v in result.items()}}
 (HERE/f'selective_hold_case{case}.json').write_text(json.dumps(record,indent=2))
 print('target',target,'selected',ranked,'base gap',record['baseline_portfolio']['gap_bp'],'new gap',record['after']['gap_bp'],'pruned',record['after']['pruned'],'seconds',record['seconds_total'],flush=True)
 for r in rec:print(r['category'],r['score'],'leaf_upper_micro',r['old_leaf_upper_micro'],'→',r['new_leaf_upper_micro'],'gap',r['new_gap_bp'],flush=True)
 return record
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--case',type=int,default=0);p.add_argument('--leaf-budget',type=int,default=8);args=p.parse_args();run(args.case,args.leaf_budget)