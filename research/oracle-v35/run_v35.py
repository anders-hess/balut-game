#!/usr/bin/env python3
"""V35 exact rational root-action adversary. Run with PYTHONPATH=v34:v35."""
import argparse,json,time
from pathlib import Path
from joint_swap_v35 import *
from fixtures import observed,BEST

ROOT=Path(__file__).resolve().parents[1]/'oracle-v34'

def candidate_bound(board,dice,c,exact=False):
    idx=INDEX[tuple(sorted(dice))]
    legal=[d for d in range(7) if None in board[CATS[d]]]
    D=(build_exact_pathwise_lower if exact else build_joint_lower)(board,idx,c)
    old=build_swap_lower(board,idx,c)
    assert all(D[d][y]>=old[d][y] for d in legal for y in range(252))
    leaf=[max(-D[d][y] for d in legal) for y in range(252)]
    previous=[max(leaf[y]*7776,max(
        (sum(w*leaf[j] for j,w in hold_transitions(h))*6**len(h)
         for h in holds(HISTS[y])),default=-10**12)) for y in range(252)]
    score={CATS[d]:-D[d][idx] for d in legal if d!=c}
    hold={str(h):sum(w*previous[j] for j,w in hold_transitions(h))*6**len(h)
          for h in holds(HISTS[idx])}
    den=7776**2
    return {'candidate':'score:'+CATS[c],
            'scoreUpper':score,
            'holdUpperNumerators':{h:str(v) for h,v in hold.items()},
            'denominator':str(den),
            'certified':all(v<0 for v in score.values()) and all(v<0 for v in hold.values()),
            'scoresPruned':sum(v<0 for v in score.values()),
            'holdsPruned':sum(v<0 for v in hold.values()),
            'regretUpperDisplayBP':max(max(score.values(),default=-100),max(hold.values(),default=-10**12)/den)}

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--start',type=int,default=0)
    p.add_argument('--count',type=int,default=4)
    p.add_argument('--all-candidates',action='store_true')
    p.add_argument('--exact-pathwise',action='store_true')
    p.add_argument('--out',required=True)
    a=p.parse_args()
    cases=observed()
    output=[];start=time.time()
    for i in range(a.start,min(a.start+a.count,len(cases))):
        row=cases[i]
        names=['score:'+CATS[c] for c in range(7) if None in row['board'][CATS[c]]] if a.all_candidates else ['score:'+BEST[i]]
        actions=[candidate_bound(row['board'],row['dice'],CATS.index(n.split(':')[1]),a.exact_pathwise) for n in names]
        output.append({'caseIndex':i,'remaining':row['remaining'],'dice':row['dice'],'actions':actions})
        print(i,row['remaining'],'certified',sum(x['certified'] for x in actions),'seconds',round(time.time()-start,2),flush=True)
        joint_two_rows.cache_clear();joint_one_row.cache_clear();row_bonus_outcomes.cache_clear()
        fast_bonus_diff_min.cache_clear();reachable_bonus_diff_min.cache_clear();other_reachable_bits.cache_clear()
    Path(a.out).write_text(json.dumps({'results':output,'seconds':time.time()-start},indent=2))

if __name__=='__main__':main()
