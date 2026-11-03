#!/usr/bin/env python3
"""Reproduce v36 36 locked observed 20-28-turn early roots."""
import argparse,json,time,resource
from pathlib import Path
from stochastic_first_use_v36 import *
from fixtures import observed,BEST

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--start',type=int,default=0)
    p.add_argument('--count',type=int,default=4)
    p.add_argument('--all-candidates',action='store_true')
    p.add_argument('--out',required=True)
    a=p.parse_args();cases=observed();rows=[];t=time.perf_counter()
    for i in range(a.start,min(len(cases),a.start+a.count)):
        row=cases[i]
        cs=([c for c in range(7) if None in row['board'][CATS[c]]]
            if a.all_candidates else [CATS.index(BEST[i])])
        out=[]
        for c in cs:
            out.append(compare_candidate(row['board'],row['dice'],c))
            joint_two_rows.cache_clear();joint_one_row.cache_clear()
            row_bonus_outcomes.cache_clear();fast_bonus_diff_min.cache_clear()
            reachable_bonus_diff_min.cache_clear();other_reachable_bits.cache_clear()
        rows.append({'caseIndex':i,'remaining':row['remaining'],
                     'dice':row['dice'],'actions':out})
        print('case',i,'remaining',row['remaining'],'candidates',len(out),
              'certified',sum(v['certifiedUnique'] for v in out),
              'bestRegretUpperBP',min(v['maxRivalAdvantageUpperBP'] for v in out),
              flush=True)
    payload={'method':'v36 integer stochastic stopping exchange',
             'results':rows,'elapsedSeconds':time.perf_counter()-t,
             'peakRSS_MB':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024}
    Path(a.out).write_text(json.dumps(payload,indent=2))
if __name__=='__main__':main()
