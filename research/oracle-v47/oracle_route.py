"""Research-only strict Oracle routing: 1..7 always native EXACT Bellman.
If exact cannot finish within resource budget, return explicitly UNRESOLVED.
For >=8, return numerically certified lower/upper bounds for every current
legal action, never an unsupported 'optimal' answer.
"""
import json,subprocess,time
from pathlib import Path
from bounds_andor import CATS,compress
from run_gate2 import evaluate
HERE=Path(__file__).resolve().parent

def native_exact(z,dice,r,state_cap=250000,timeout=60):
 k,p,st,fh,ba,total=z
 cmd=[str(HERE/'exact_reachable'),*(str(x) for x in (*k,*p,st,fh,ba,total,*dice,r,state_cap))]
 try:
  q=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout)
  if q.returncode:raise RuntimeError(q.stderr.strip() or 'native error')
  out=json.loads(q.stdout)
  out['actions']={('score:'+CATS[int(key.split(':')[1])]+':'+key.split(':')[2] if key.startswith('score:') else key):v for key,v in out['actions'].items()}
  out['best']=max(out['actions'],key=out['actions'].get)
  return out
 except (RuntimeError,subprocess.TimeoutExpired) as e:
  return {'status':'EXACT_RESOURCE_LIMIT_NO_FALLBACK','reason':str(e),'remaining':sum(k),'actions':None,'best':None}

def oracle(card,dice,r=2,**kw):
 z=compress(card)
 if sum(z[0])<=7:return native_exact(z,dice,r,**kw)
 return evaluate(z,dice,r)