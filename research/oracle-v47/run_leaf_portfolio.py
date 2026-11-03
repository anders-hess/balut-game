"""v47b: propagate per-outcome min of multiple admissible quota majorants through
ALL current holds. Pure integer numerical certificate; no float interval step.
"""
import argparse,hashlib,json,time
from pathlib import Path
from integer_proof import action_envelopes,certificate,physical_bound_l,physical_bound_u,guaranteed_policy_lower,D
from bounds_andor import compress,advance,SCORES
from run_gate2 import quota_u,obs_cases,ALPHAS
HERE=Path(__file__).resolve().parent

def refine_leaf(z,dice,r,alphas=ALPHAS,prev=None,child_budget=0):
    start=time.monotonic();known={}
    for c,k in enumerate(z[0]):
        if not k:continue
        for sc in set(SCORES[c]):
            child=advance(z,c,sc)
            known[(c,sc)]=physical_bound_u(child)
    calls=[]
    for a in alphas:
        res=quota_u(z,dice,r,a)
        calls.append({k:res[k] for k in ('alpha_micro','states','seconds','holdOps')})
        for key,v in res['leaf_micro'].items():
            c,sc=map(int,key.split(':'))
            known[c,sc]=min(known[c,sc],v)
    lookup={advance(z,c,sc):u for (c,sc),u in known.items()}
    reroll=action_envelopes(z,dice,r,physical_bound_l,lambda child:lookup[child])
    if prev is None:
        lower=action_envelopes(z,dice,r,guaranteed_policy_lower,physical_bound_u)
        prev=lower
    assert reroll.keys()==prev.keys()
    final={a:(prev[a][0],min(prev[a][1],reroll[a][1]),prev[a][2]) for a in prev}
    for a,(l,u,d) in final.items():assert l<=u,('inconsistent upper',a,l,u,d)
    result=certificate(final)
    result.update(status='BOUNDED_INTEGER',seconds_total=time.monotonic()-start,calls=calls,actions={a:{'lo_num':str(v[0]),'up_num':str(v[1]),'den':str(v[2])} for a,v in final.items()})
    return result

def run(start,end):
    cases=obs_cases();results=[]
    prev={}
    for name in HERE.glob('observed_[0-9]*_[0-9]*.json'):
        for x in json.loads(name.read_text())['results']:
            prev[x['case']]=x
    for i in range(start,end):
        row=cases[i];z=compress(row['board']);dice=row['dice'];r=2
        old=prev.get(i)
        if old:
            from integer_proof import certificate
            current={a:tuple(map(int,(v['lo_num'],v['up_num'],v['den']))) for a,v in old['actions'].items()}
        else:current=None
        result=refine_leaf(z,dice,r,prev=current)
        if old:result.update(baseline_v47_gap_bp=old['gap_bp'],gain_vs_v47=old['gap_bp']-result['gap_bp'],upper_reductions=sum(result['actions'][a]['up_num']!=old['actions'][a]['up_num'] for a in old['actions']))
        result.update(case=i,remaining=row['remaining'],dice=row['dice'])
        results.append(result)
        (HERE/f'portfolio_{start}_{end}.json').write_text(json.dumps({'alphas':ALPHAS,'results':results},indent=2))
        print(json.dumps({k:result.get(k) for k in ['case','remaining','gap_bp','gain_vs_v47','upper_reductions','pruned','certified','seconds_total']}),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--start',type=int,default=0);p.add_argument('--end',type=int,default=36);a=p.parse_args();run(a.start,a.end)