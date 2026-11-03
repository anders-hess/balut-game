"""Feasibility performance benchmark. Never interprets timeout as an exact value."""
from compare_solvers import *
import argparse

def hard_seven():
 card={
  'fours':[16,16,16,None], 'fives':[20,20,20,None],
  'sixes':[24,24,24,None], 'straight':[15,20,15,None],
  'fullHouse':[22,22,24,None], 'choice':[30,30,30,None],
  'balut':[50,0,0,None]}
 return compress(card)

def execute(extended=False):
 rows=[]
 for h in ([3,4,5,6,7,8,9] if extended else [3,4,5]):
  k=PATTERNS[h] if h<=7 else ([2,1,1,1,1,1,1] if h==8 else [2,1,1,1,1,1,2]);z=compress(card_for(k,4650+h*13));dic=[1,2,3,4,5]
  rows_here=[]
  for name,exe in [('v44',BASE),('v46',ROOT/'exact_reachable')]:
   if h>=8 and name=='v44':continue
   cap=30000 if name=='v44' and h>=6 else (120000 if h>=9 else 250000)
   budget=17 if h>=9 else 23
   result=run_binary(exe,z,dic,2,cap,budget)
   rows_here.append((name,result))
  diff=None
  if len(rows_here)==2 and all(x[1]['status']=='EXACT_FLOAT64' for x in rows_here):diff=compare(rows_here[0][1],rows_here[1][1])
  row={'fixture':f'{h} remaining; seeded valid-score card','k':k,'initial_totalSmall':z[-1],'dice':dic,'max_abs_Q_error':diff,
       'solvers':{name:{key:r.get(key) for key in ['status','states','seconds','elapsed','lookups','detail']} for name,r in rows_here}}
  rows.append(row);print(row,flush=True)
 if extended:
  z=hard_seven();dicts=[('v44',BASE,30000,16),('v46',ROOT/'exact_reachable',35000,12)]
  row={'fixture':'7 remaining; deliberately bonus-active','k':list(z[0]),'p':list(z[1]),'st':z[2],'fh':z[3],'ba':z[4], 'totalSmall':z[5],'dice':[4,4,4,5,6], 'solvers':{}}
  for name,exe,cap,budget in dicts:
   r=run_binary(exe,z,[4,4,4,5,6],2,cap,budget)
   row['solvers'][name]={key:r.get(key) for key in ['status','states','seconds','elapsed','lookups','detail']}
  rows.append(row);print(row,flush=True)
 (ROOT/'capacity_regenerated.json').write_text(json.dumps(rows,indent=2))

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--extended',action='store_true');p.add_argument('--quick',action='store_true');a=p.parse_args()
 execute(extended=a.extended)