"""Gate 3: frozen ordinary opening, rigorous stronger legal policy floor vs ALL 30 existing uppers.

No Monte Carlo; exact numerator/denominator with positive category outcomes preserved.
"""
import sys
sys.path.insert(0,str(__import__("pathlib").Path(__file__).resolve().parent.parent / "oracle_v47"))
import json, time, hashlib, resource
from pathlib import Path
from bounds_andor import compress,advance,CATS,SCORES
from integer_proof import action_envelopes,certificate,physical_bound_u,SCALE
import group_policy5 as gp
HERE=Path(__file__).resolve().parent
TARGET=HERE/'observed_early_cases_v28.json'
ROW=json.loads(TARGET.read_text())['cases'][0]
Z=compress(ROW['board']); DICE=tuple(ROW['dice']);R=2
ALPHA=(10000,14000,18000)
assert DICE==(4,1,3,4,5) and sum(Z[0])==28
assert gp.GROUP==(0,1,2,4,5)
assert gp.WEIGHTS==(240,190,160,0,140,100,0)

def run():
    start=time.monotonic()
    baseline=json.loads((HERE/'portfolio_0_2.json').read_text())['results'][0]
    original={a:tuple(int(v[k]) for k in ('lo_num','up_num','den')) for a,v in baseline['actions'].items()}
    assert len(original)==30
    policy_micros={}
    audit=[]
    # 7 legal category choices, their finite score supports, for current two-reroll chance propagation.
    for c in range(7):
        vals=sorted(set(SCORES[c]));t=time.monotonic()
        for sc in vals:
            child=advance(Z,c,sc)
            n,d=gp.adaptive_group_value(child)
            low=(n*SCALE)//d
            policy_micros[child]=max(policy_micros.get(child,-10**100),low)
            audit.append({'category':CATS[c],'score':sc,'policy_micro_floor':str(low),
                          'numerator_sha256':hashlib.sha256(str(n).encode()).hexdigest(),
                          'denominator_sha256':hashlib.sha256(str(d).encode()).hexdigest()})
        print('leaf',CATS[c],'outcomes',len(vals),'seconds',round(time.monotonic()-t,3),'total',round(time.monotonic()-start,3),flush=True)
    # A strict legal continuation policy per *post-score* state gives a bona-fide L action bound.
    new=action_envelopes(Z,DICE,R,lambda z:policy_micros[z],physical_bound_u)
    assert set(new)==set(original)
    combined={a:(max(new[a][0],original[a][0]),original[a][1],original[a][2]) for a in original}
    assert all(l<=u for l,u,d in combined.values())
    result=certificate(combined)
    output={'experiment':'v48_Gate3_frozen_observed_root_0','scorecard':ROW['board'],'dice':list(DICE),
            'turns_remaining':28,'rerolls_left':2,'weights':gp.WEIGHTS,'group_categories':[CATS[c] for c in gp.GROUP],
            'old_candidate':baseline['candidate'],'old_gap_bp':baseline['gap_bp'],'old_best_lower_bp':baseline['best_lower_bp'],
            'actual_legal_actions':len(combined),'root_certification':result,
            'seconds':time.monotonic()-start,'maxrss_kib':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            'future_score_leaves_exactly_evaluated':len(audit),'policy_leaf_audit':audit,
            'action_intervals':{a:{'lo_num':str(l),'up_num':str(u),'den':str(d)} for a,(l,u,d) in combined.items()},
            'previous_action_intervals_sha256':hashlib.sha256(json.dumps(baseline['actions'],sort_keys=True).encode()).hexdigest(),
            'status':'CERTIFIED_INTEGER' if result['certified'] else 'BOUNDED_NOT_CERTIFIED'}
    (HERE/'gate3_result.json').write_text(json.dumps(output,indent=2))
    print('SUMMARY',json.dumps({k:output[k] for k in ('status','seconds','maxrss_kib','future_score_leaves_exactly_evaluated')}),flush=True)
    print('CERT',json.dumps(result,indent=2),flush=True)
if __name__=='__main__':run()