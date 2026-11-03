from integer_proof import *
import json,time,resource,sys
from pathlib import Path
p=Path(__file__).resolve().parent
obs=json.loads((p.parent/'oracle_v37/observed_early_cases_v28.json').read_text())['cases']
start=int(sys.argv[1]);end=int(sys.argv[2]);out=[]
for i in range(start,end):
 row=obs[i];t=time.perf_counter()
 a=action_envelopes(compress(row['board']),row['dice'],2,guaranteed_policy_lower,physical_bound_u)
 rec={**certificate(a),'case_index':i,'remaining':row['remaining'],'dice':row['dice'],'seconds':time.perf_counter()-t,'rss_kb':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
 out.append(rec)
 print(i,rec['gap_bp'],rec['seconds'],flush=True)
 (p/f'batch_{start}_{end}.json').write_text(json.dumps(out,indent=2))
