from bounds_andor import exact_native
import json,time,subprocess,resource
from pathlib import Path
p=Path(__file__).resolve().parent
states=[('1-turn', [0,0,0,0,0,1,0],400,50000,15),('2-turn',[0,0,0,0,0,1,1],400,50000,15),('4-turn',[1,1,1,0,0,1,0],400,50000,15),('7-turn-diverse',[1,1,1,1,1,1,1],400,30000,25)]
rows=[]
for name,ks,total,cap,timeout in states:
 z=(tuple(ks),(0,0,0,0),0,0,0,total)
 t=time.perf_counter()
 try:
  o=exact_native(z,[1,2,3,4,5],2,limit=cap,timeout=timeout)
  row={'fixture':name,'status':o['status'],'states':o['states'],'seconds':o['seconds'],'legal_actions':len(o['actions']),'best_action':o['best']}
 except Exception as e:
  row={'fixture':name,'status':'EXACT_RESOURCE_LIMIT_NO_FALLBACK','reason':str(e)[:140],'seconds':time.perf_counter()-t,'state_cap':cap}
 rows.append(row);print(row,flush=True)
(p/'exact_benchmark.json').write_text(json.dumps(rows,indent=2))
