#!/usr/bin/env python3
import json,sys,time,resource
from pathlib import Path
from multistop_v37 import *
rows=json.load(open('observed_early_cases_v28.json'))['cases']
start=int(sys.argv[1]);end=int(sys.argv[2]);out=Path(sys.argv[3]);results=[];t=time.time()
for i in range(start,min(end,len(rows))):
 row=rows[i];board=row['board'];dice=row['dice']
 cs=[c for c in (0,1,2) if None in board[CATS[c]]]
 if not cs:continue
 # Fixed reproducible candidate selection: first legal threshold category.
 c=cs[0];startcase=time.time()
 b=compare_candidate(board,dice,c,multi=False)
 a=compare_candidate(board,dice,c,multi=True)
 assert a['maxRivalAdvantageUpperBP']<=b['maxRivalAdvantageUpperBP']+1e-8
 assert all(a['scoreRivalUpperBP'][k]<=v+1e-8 for k,v in b['scoreRivalUpperBP'].items())
 assert all(a['holdRivalUpperBP'][k]<=v+1e-8 for k,v in b['holdRivalUpperBP'].items())
 results.append({'index':i,'remaining':row['remaining'],'dice':dice,'candidate':CATS[c],
  'v36MaxAdvantageUpperBP':b['maxRivalAdvantageUpperBP'],'v37MaxAdvantageUpperBP':a['maxRivalAdvantageUpperBP'],
  'certified':a['certifiedUnique'],'prunedScore':len(a['scorePruned']), 'prunedHold':len(a['holdsPruned']),
  'improvedSyCells':a['improvedSyCells'],'largestSyLowerImprovementBP':a['largestSyLowerImprovementBP'],
  'scoreRivalCount':len(a['scoreRivalUpperBP']),'holdRivalCount':len(a['holdRivalUpperBP']),
  'seconds':time.time()-startcase})
 print(i,'T',row['remaining'],'c',CATS[c], 'U36',b['maxRivalAdvantageUpperBP'],'U37',a['maxRivalAdvantageUpperBP'], 'sec',round(time.time()-startcase,2),flush=True)
 # Save each completed case to withstand time limits
 out.write_text(json.dumps({'results':results,'elapsed':time.time()-t,'peakRSS_kb':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss},indent=2))
 multiuse_pattern.cache_clear();first_use_normalized.cache_clear()
 joint_two_rows.cache_clear();joint_one_row.cache_clear();row_bonus_outcomes.cache_clear()
 fast_bonus_diff_min.cache_clear();row_bonus_min.cache_clear();bonus_diff_min.cache_clear()
