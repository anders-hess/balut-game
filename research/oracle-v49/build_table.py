#!/usr/bin/env python3
"""Rebuild 28-turn last-roll seven-category admissible U table from v47.
The information dual reads this fixed table. Never use these upper values as Q*.
"""
import json,sys,subprocess,hashlib
from pathlib import Path
SRC=Path(__file__).resolve().parent
V47=next(q for q in (SRC.parent/'oracle_v47', SRC.parent/'oracle-v47') if q.exists())
V48=next(q for q in (SRC.parent/'oracle_v48', SRC.parent/'oracle-v48') if q.exists())
sys.path.insert(0,str(V47))
from bounds_andor import HISTS,SCORES,CATS,compress,advance
from run_gate2 import quota_u
SCALE=1000000
p=json.loads((V48/'gate3_result6.json').read_text())
z=compress(p['scorecard']);die=p['dice'];r=p['rerolls_left']
assert sum(z[0])==28 and r==2 and sorted(die)==[1,3,4,4,5]
policy={ (CATS.index(x['category']),int(x['score'])):int(x['policy_micro_floor']) for x in p['policy_leaf_audit']}
U={}
for a in (10000,14000,18000):
    result=quota_u(z,die,r,a)
    for key,v in result['leaf_micro'].items():
        c,s=map(int,key.split(':'))
        U[c,s]=min(U.get((c,s),10**15),int(v))
all_keys={(c,int(score)) for c in range(7) for score in SCORES[c]}
assert all_keys.issubset(U.keys()) and all_keys.issubset(policy.keys()),(len(all_keys),len(U),len(policy))
table=[]
for d in HISTS:
    stopU=max(U[c,SCORES[c][i]] for c in range(7) for i in [HISTS.index(d)])
    stopL=max(policy[c,SCORES[c][i]] for c in range(7) for i in [HISTS.index(d)])
    assert stopL<=stopU,(d,stopL,stopU)
    count=[d.count(k) for k in range(1,7)];table.append(' '.join(map(str,count+[stopU,stopL])))
txt='\n'.join(table)+'\n'
(SRC/'last_roll_table.tsv').write_text(txt)
(SRC/'leaf_bounds.json').write_text(json.dumps({'category_score_U_micro':{f'{CATS[c]}:{sc}':v for (c,sc),v in sorted(U.items())},'category_score_L_micro':{f'{CATS[c]}:{sc}':v for (c,sc),v in sorted(policy.items())},'table_sha256':hashlib.sha256(txt.encode()).hexdigest()},indent=2)+'\n')
print(json.dumps({'stop_dice_outcomes':len(HISTS),'category_score_leaves':len(all_keys),'min_U_micro':min(U.values()),'max_U_micro':max(U.values()),'min_L_micro':min(policy.values()),'max_L_micro':max(policy.values()),'sha256':hashlib.sha256(txt.encode()).hexdigest()}))