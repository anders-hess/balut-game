"""v47: combine three directed-rounding integer quota upper envelopes with exact-integer policy lower.
No claims of original exact 28-turn Q, no statistical simulation.
"""
import argparse,hashlib,json,subprocess,time,os,resource
from pathlib import Path
from integer_proof import action_envelopes,certificate,guaranteed_policy_lower,physical_bound_u,compare_with_exact,D,SCALE
from bounds_andor import CATS,compress
HERE=Path(__file__).resolve().parent
ALPHAS=(10000,14000,18000)

def quota_u(z,dice,r,alpha,timeout=40):
    k,p,st,fh,ba,t=z
    args=[str(x) for x in (*k,*p,st,fh,ba,t,*dice,r,alpha)]
    res=subprocess.run([str(HERE/'quota_upper'),*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=timeout)
    if res.returncode:raise RuntimeError('quota_upper failed: '+res.stderr[:400])
    return json.loads(res.stdout)

def evaluate(z,dice,r,alphas=ALPHAS,reference=None,record_actions=True):
    t0=time.monotonic()
    physical=action_envelopes(z,dice,r,guaranteed_policy_lower,physical_bound_u)
    bound_calls=[]
    actions=dict(physical)
    for alpha in alphas:
        result=quota_u(z,dice,r,alpha)
        bound_calls.append({k:result[k] for k in ('alpha_micro','G_micro','beta_micro','states','holdOps','seconds')})
        upper=result['actions_micro']
        assert upper.keys()==actions.keys(),(upper.keys()-actions.keys(),actions.keys()-upper.keys())
        for name,u in upper.items():
            lo,old,den=actions[name]
            new=min(old,u*(D**r))
            assert lo<=new,('invalid upper / lower',name,lo,new,den)
            actions[name]=(lo,new,den)
    out=certificate(actions)
    out.update({'status':'BOUNDED_INTEGER_NOT_CERTIFIED' if not out['certified'] else 'CERTIFIED_INTEGER',
                'seconds_total':time.monotonic()-t0,'calls':bound_calls,
                'upper_improvements':sum(actions[a][1]<physical[a][1] for a in actions),
                'baseline_gap_bp':certificate(physical)['gap_bp'],
                'gap_reduction_bp':certificate(physical)['gap_bp']-out['gap_bp']})
    if reference is not None:
        out['reference_check']=compare_with_exact(actions,reference)
    if record_actions:
        out['actions']={key:{'lo_num':str(v[0]),'up_num':str(v[1]),'den':str(v[2])} for key,v in actions.items()}
    return out

def obs_cases():return json.loads((HERE/'observed_early_cases_v28.json').read_text())['cases']
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--start',type=int,default=0);parser.add_argument('--end',type=int,default=36);parser.add_argument('--alphas',default='10000,14000,18000');parser.add_argument('--reference',action='store_true');args=parser.parse_args()
    alphas=tuple(int(x) for x in args.alphas.split(',') if x)
    if args.reference:
        rows=json.loads((HERE/'reference_exact_q_v27.json').read_text());cases=[]
        for i,row in enumerate(rows):
            s=row['stateInput'];z=(tuple(4-x for x in s[:7]),tuple(s[7:11]),s[11],s[12],s[13],s[14])
            cases.append((i,z,s[15:20],s[20],row['exactActionQ'],row['case']))
        prefix='reference'
    else:
        rows=obs_cases();cases=[(i,compress(row['board']),row['dice'],2,None,str(row['game'])+':'+str(row['remaining'])) for i,row in enumerate(rows)];prefix='observed'
    output=[]
    for i,z,dice,r,reference,name in cases[args.start:args.end]:
        t=time.monotonic()
        out=evaluate(z,dice,r,alphas,reference=reference)
        out.update(case=i,case_name=name,remaining=sum(z[0]),dice=dice,scorecard_key_sha256=hashlib.sha256(repr(z).encode()).hexdigest())
        output.append(out)
        print(json.dumps({x:out[x] for x in ('case','remaining','legal_actions','pruned','gap_bp','baseline_gap_bp','upper_improvements','seconds_total')},sort_keys=True),flush=True)
        (HERE/f'{prefix}_{args.start}_{args.end}.json').write_text(json.dumps({'alphas':alphas,'results':output},indent=2))
    print('completed',len(output),'cases,',sum(r['legal_actions'] for r in output),'actions,',sum(r['pruned'] for r in output),'pruned',flush=True)
if __name__=='__main__':main()