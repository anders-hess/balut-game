#!/usr/bin/env python3
"""All 408 immutable exact-Bellman current-action comparisons; v37 where practical.

Uses new k-use v37 for Fours/Fives/Sixes; v36-equivalent first-use for
Straight, House, Choice and Balut to avoid expensive Choice k=4 prototype.
No heuristic fallback, no re-solving the exact Q references.
"""
import json
from multistop_v37 import *
from test_exact_q_v34 import synthetic
from pathlib import Path

refs=json.loads(Path(__file__).with_name('reference_exact_q_v27.json').read_text())
count=0;min_slack=1e9;improved=0
for ref in refs:
 s=ref['stateInput'];card=synthetic(s);dice=s[15:20];r=s[20]
 q={tuple([json.loads(k)[0],json.loads(k)[1],tuple(json.loads(k)[2]) if json.loads(k)[2] is not None else None]):v for k,v in ref['exactActionQ'].items()}
 for c in range(7):
  key=('score',CATS[c],None)
  if key not in q:continue
  v=compare_candidate(card,dice,c,r,multi=c in (0,1,2),compressed_total=s[14])
  for name,upper in v['scoreRivalUpperBP'].items():
   exact=q[('score',name,None)]-q[key];slack=upper-exact
   assert slack>=-1e-8,(ref['case'],c,name,slack)
   count+=1;min_slack=min(min_slack,slack)
  for h,upper in v['holdRivalUpperBP'].items():
   ht=tuple(int(x) for x in h.strip('()').split(',') if x.strip())
   exact=q[('hold',None,tuple(ht.count(face) for face in FACES))]-q[key]
   slack=upper-exact
   assert slack>=-1e-8,(ref['case'],c,h,slack)
   count+=1;min_slack=min(min_slack,slack)
  improved+=v['improvedSyCells']
  multiuse_pattern.cache_clear();first_use_normalized.cache_clear()
  joint_two_rows.cache_clear();joint_one_row.cache_clear();row_bonus_outcomes.cache_clear()
  fast_bonus_diff_min.cache_clear();row_bonus_min.cache_clear();bonus_diff_min.cache_clear()
 print(ref['case'],'verified so far',count,flush=True)
assert count==408,count
result={'exactBellmanReferenceRoots':5,'actionQDifferenceUpperComparisons':count,
 'minimumUpperMinusFloatExactQBP':min_slack,'violations':0,
 'thresholdCandidateSyImprovementCount':improved,
 'nonThresholdAndChoiceCandidates':'v36 first-use lower (no new multiuse)'}
print(json.dumps(result,indent=2))
Path(__file__).with_name('v37_all408_audit.json').write_text(json.dumps(result,indent=2))
