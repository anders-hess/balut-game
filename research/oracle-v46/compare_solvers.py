"""Reproducible differential verification and scaling study, no silent fallbacks."""
import sys, json, subprocess, time, random, resource, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'oracle_v43_45'))
from bounds_andor import compress, CATS, SCORES, HISTS
BASE=ROOT/'oracle_v43_45/exact_quotient'
SHAPE=ROOT/'exact_shaped'
PATTERNS={
1:[0,0,0,0,0,1,0], 2:[0,0,0,0,0,1,1],
3:[1,0,0,0,0,1,1],4:[1,1,1,0,0,1,0],
5:[1,1,1,0,0,1,1],6:[1,1,1,1,0,1,1],7:[1,1,1,1,1,1,1],
}
def card_for(k,seed):
 rng=random.Random(seed)
 card={}
 for c,cat in enumerate(CATS):
  n=4-k[c]
  # real possible dice scores, including valid and scratches. Positive ordinary cases assured.
  values=tuple(sorted(set(SCORES[c])))
  card[cat]=[rng.choice(values) for _ in range(n)]+[None]*k[c]
 return card

def run_binary(exe,z,dice=(1,2,3,4,5),rerolls=2,cap=50000,timeout=25):
 k,p,st,fh,ba,total=z
 args=[str(a) for a in [*k,*p,st,fh,ba,total,*dice,rerolls,cap]]
 t=time.perf_counter()
 try:
  p=subprocess.run([str(exe),*args],capture_output=True,text=True,timeout=timeout)
  elapsed=time.perf_counter()-t
  if p.returncode:
   return {'status':'LIMIT_OR_ERROR','detail':p.stderr.strip()[:160],'elapsed':elapsed}
  x=json.loads(p.stdout)
  x['elapsed_wall']=elapsed
  return x
 except subprocess.TimeoutExpired:
  return {'status':'TIMEOUT','elapsed':time.perf_counter()-t}

def compare(a,b):
 assert a['status']=='EXACT_FLOAT64' and b['status']=='EXACT_FLOAT64'
 assert a['actions'].keys()==b['actions'].keys()
 diffs={key:abs(a['actions'][key]-b['actions'][key]) for key in a['actions']}
 m=max(diffs.values(),default=0)
 assert m<2e-11,m
 return m

def study():
 rows=[];issues=[]
 for h in range(1,8):
  k=PATTERNS[h]
  for variant in range(2 if h<=5 else 1):
   card=card_for(k,4650+variant*211+h*13)
   z=compress(card)
   dice=[1,2,3,4,5] if variant==0 else [4,4,4,6,6]
   cap=60000 if h<=6 else 30000
   time_budget=26 if h<=6 else 20
   a=run_binary(BASE,z,dice,2,cap,time_budget)
   b=run_binary(SHAPE,z,dice,2,cap,time_budget)
   d=None
   if a['status']=='EXACT_FLOAT64' and b['status']=='EXACT_FLOAT64':
    d=compare(a,b)
   row={'remaining':h,'variant':variant,'total':z[-1],'current_dice':dice,
        'baseline_status':a['status'],'baseline_states':a.get('states'),
        'baseline_sec':a.get('seconds',a.get('elapsed')),
        'shaped_status':b['status'],'shaped_states':b.get('states'),
        'shaped_sec':b.get('seconds',b.get('elapsed')),
        'shaped_lookups':b.get('lookups'), 'max_abs_q_difference':d}
   rows.append(row)
   if d is None:issues.append((h,variant,a['status'],b['status']))
   print(row,flush=True)
  (ROOT/'bench_work.json').write_text(json.dumps(rows,indent=2))
 print('completed checks',sum(r['max_abs_q_difference'] is not None for r in rows),'of',len(rows))
 (ROOT/'bench_results.json').write_text(json.dumps(rows,indent=2))
 return rows
if __name__=='__main__':study()