#!/usr/bin/env python3
"""Independently recompute original, unmodified v43-45 exact native Q values."""
from pathlib import Path
import subprocess, json, sys
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'legacy'))
from bounds_andor import compress

def board(n):
 b={'fours':[12,16,16,None], 'fives':[15,20,20,None],
     'sixes':[18,18,24,24], 'straight':[15,20,15,20],
     'fullHouse':[20,18,22,22], 'choice':[26,26,30,None],
     'balut':[0,0,0,0]}
 if n==4:b['sixes']=[18,18,24,None]
 return b

def main():
 for n in (3,4):
  z=compress(board(n))
  dice=[4,4,4,5,5] if n==3 else [4,4,5,5,6]
  args=[*map(str,z[0]),*map(str,z[1]),str(z[2]),str(z[3]),str(z[4]),str(z[5]),*map(str,dice),'0','150000']
  cmd=[str(ROOT/'exact_quotient'),*args]
  r=subprocess.run(cmd,capture_output=True,text=True,check=True,timeout=45)
  j=json.loads(r.stdout)
  assert j['status']=='EXACT_FLOAT64' and j['remaining']==n
  (ROOT/f'native_exact{n}.json').write_text(json.dumps(j,indent=2)+'\n')
  print(f'exact original Bellman {n} turns: {j["states"]} unique successor states, {len(j["actions"])} positive current scores')
if __name__=='__main__':main()