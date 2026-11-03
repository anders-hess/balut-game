#!/usr/bin/env python3
"""Regenerate all 36 original observed roots; preserving all score and hold actions."""
import argparse, json, subprocess, sys, statistics, time
from pathlib import Path
P=Path(__file__).resolve().parent
V47=P.parent/'oracle-v47';sys.path.insert(0,str(V47))
from bounds_andor import compress
ap=argparse.ArgumentParser();ap.add_argument('--start',type=int,default=0);ap.add_argument('--end',type=int,default=36)
args=ap.parse_args()
raw=json.loads((V47/'observed_early_cases_v28.json').read_text())['cases']
old={}
for fp in V47.glob('portfolio_[0-9]*_[0-9]*.json'):
 for row in json.loads(fp.read_text())['results']:
  if row['case'] in old:raise ValueError('duplicate '+str(row['case']))
  old[row['case']]=row
assert len(raw)==len(old)==36
D=7776;MIC=1000000;DEN=D*D*MIC
out=[]
for i in range(args.start,args.end):
 case=raw[i];k,p,st,fh,ba,total=compress(case['board']);dice=case['dice']
 actions={}
 start=time.monotonic()
 q=[]
 for alpha in (10000,14000,18000):
  vals=[*k,*p,st,fh,ba,total,*dice,2,alpha]
  x=subprocess.run([str(P/'bonus_automata'),*map(str,vals)],capture_output=True,text=True,timeout=30,check=True)
  q.append(json.loads(x.stdout))
 for name,r in old[i]['actions'].items():
  lo=int(r['lo_num']);up=int(r['up_num']);assert int(r['den'])==DEN
  improved=min(up,min(x['actions_micro'][name] for x in q)*D*D)
  assert lo<=improved<=up,(i,name)
  actions[name]=(lo,improved,DEN)
 best=max(actions,key=lambda name: actions[name][0]);lo=actions[best][0]
 rival=max(v[1] for n,v in actions.items() if n!=best)
 item={'case':i,'remaining':case['remaining'],'n_actions':len(actions),'n_improved':sum(v[1]<int(old[i]['actions'][n]['up_num']) for n,v in actions.items()),'pruned':sum(v[1]<lo for n,v in actions.items() if n!=best),'certified':lo>rival,'gap_bp':(rival-lo)/DEN,'old_gap_bp':old[i]['gap_bp'],'candidate':best,'seconds':time.monotonic()-start,'actions':{n:{'lo_num':str(v[0]),'up_num':str(v[1]),'den':str(DEN)} for n,v in actions.items()}}
 out.append(item);print(i,case['remaining'],item['gap_bp'],item['pruned'],flush=True)
if args.start==0 and args.end==36:
 summary={'n':36,'actions':sum(x['n_actions'] for x in out),'tighter':sum(x['n_improved'] for x in out),'pruned':sum(x['pruned'] for x in out),'certified':sum(x['certified'] for x in out),'mean_gap':statistics.mean(x['gap_bp'] for x in out)}
 assert summary['actions']==964 and summary['tighter']==964 and summary['pruned']==0 and summary['certified']==0
 assert abs(summary['mean_gap']-15.45194635311871)<1e-9
 print('REPRODUCED',summary)
else:summary=None
(P/f'generated_observed_{args.start}_{args.end}.json').write_text(json.dumps({'summary':summary,'results':out},indent=2))
