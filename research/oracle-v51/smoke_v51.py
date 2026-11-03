#!/usr/bin/env python3
"""Oracle v51: reference-Q and frozen opening upper-bound smoke tests."""
import json, subprocess
from pathlib import Path
P=Path(__file__).resolve().parent
OLD=P.parent/'oracle-v47'
def run(exe,values):
 r=subprocess.run([str(exe),*map(str,values)],capture_output=True,text=True,check=True,timeout=30)
 return json.loads(r.stdout)
root=[4]*7+[0]*8+[1,3,4,4,5,2,14000]
new=run(P/'bonus_automata',root)
old=run(P/'quota_upper',root)
a=new['actions_micro'];b=old['actions_micro']
assert len(a)==len(b)==30 and set(a)==set(b)
assert all(a[k]<=b[k] for k in a)
assert all(a[k]<b[k] for k in a),'Expected all 30 upper improvements'
assert a['hold:001110']==17258203,('frozen opening upper changed',a['hold:001110'])
assert new['states']==199998
rows=json.loads((OLD/'reference_exact_q_v27.json').read_text())
checks=[]
for row in rows:
 s=row['stateInput'];inp=[*[4-x for x in s[:7]],*s[7:15],*s[15:20],s[20],14000]
 got=run(P/'bonus_automata',inp)['actions_micro']
 for raw,q in row['exactActionQ'].items():
  act=json.loads(raw)
  if act[0]=='score':
   candidate=[k for k in got if k.startswith('score:'+act[1]+':')]
   assert len(candidate)==1,(row['case'],raw,candidate)
   name=candidate[0]
  else:name='hold:'+''.join(str(n) for n in act[2])
  assert name in got
  slack=got[name]/1000000-q
  assert slack>=-1e-10,(row['case'],name,slack)
  checks.append(slack)
assert len(checks)==92
dead=[0,0,0,2,1,0,0,52,65,78,100,0,1,0,400,2,2,2,5,5,2,14000]
assert run(P/'bonus_automata',dead)['actions_micro']==run(P/'quota_upper',dead)['actions_micro']
print('PASS: 30/30 opening U improved, original exact Q 92/92 upper, unreachable bonus flags invariant')
print('Minimum observed Q reference slack:',min(checks))
print('Opening bound at alpha=0.014, rival hold 3-4-5:',a['hold:001110']/1e6,'BP')
