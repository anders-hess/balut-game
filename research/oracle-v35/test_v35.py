#!/usr/bin/env python3
"""V35 independent exact-integer tests; run with PYTHONPATH=research/oracle-v34:research/oracle-v35."""
import random,json
from pathlib import Path
from joint_swap_v35 import *
from test_swap_v34 import complete_pair,independently_score,terminal
import test_exact_q_v34 as reference

def main():
    rng=random.Random(350026)
    for i,h in enumerate(HISTS):
        assert tuple(SCORES[c][i] for c in range(7))==independently_score(h)
    for _ in range(12000):
        lo=rng.randrange(1000);hi=lo+rng.randrange(300);delta=rng.randrange(-100,101)
        assert fast_bonus_diff_min(delta,lo,hi)==bonus_diff_min(delta,lo,hi)
    for _ in range(2000):
        counts=tuple(rng.randrange(3) if rng.random()<.24 else 0 for _ in range(7))
        bits=other_reachable_bits(counts);base=rng.randrange(650);delta=rng.randrange(-100,101)
        brute=min(bonus(base+s+delta)-bonus(base+s) for s in range(bits.bit_length()) if bits>>s&1)
        assert reachable_bonus_diff_min(delta,base,bits)==brute
    control={'fours':[0]*4,'fives':[0]*4,'sixes':[0]*4,'straight':[0]*4,
             'fullHouse':[0,0,7,18],'choice':[30,30,None,None],'balut':[50]*4}
    x=INDEX[(6,6,6,6,6)];y=INDEX[(1,1,1,1,1)]
    old=build_swap_lower(control,x,5)[5][y]
    exact=build_exact_pathwise_lower(control,x,5)[5][y]
    direct=[]
    for v in SCORE_SETS[5]:
        A={k:[s for s in row if s is not None] for k,row in control.items()}
        B={k:list(row) for k,row in A.items()}
        A['choice'] += [30,v];B['choice'] += [5,v]
        direct.append(terminal(A)-terminal(B))
    assert (old,exact,min(direct))==(0,1,1)
    rows=json.loads((Path(__file__).resolve().parents[1]/'oracle-v34'/'observed_early_cases_v28.json').read_text())['cases']
    checked=0
    for i in [0,8,35]:
        card=rows[i]['board'];idx=INDEX[tuple(sorted(rows[i]['dice']))]
        legal=[c for c in range(7) if None in card[CATS[c]]]
        c=legal[0] if i!=8 else 3
        d35=build_exact_pathwise_lower(card,idx,c);d34=build_swap_lower(card,idx,c)
        assert all(d35[d][y]>=d34[d][y] for d in legal for y in range(252))
        for _ in range(300):
            d=rng.choice(legal);y=rng.randrange(252);z=rng.randrange(252)
            sy=SCORES[d][y];sz=tuple(SCORES[e][z] for e in range(7))
            difference=complete_pair(card,c,d,sy,sz,SCORES[c][idx],rng)
            assert difference>=d35[d][y]
            checked+=1
        joint_two_rows.cache_clear();joint_one_row.cache_clear()
        row_bonus_outcomes.cache_clear();reachable_bonus_diff_min.cache_clear();other_reachable_bits.cache_clear()
    print(json.dumps({'scoreHistograms':252,'bonusIntervalChecks':12000,
                      'reachableBonusChecks':2000,'terminalPayoffChecks':checked,
                      'legalPositiveControl':{'old':0,'exact':1},'passed':True}))
    reference.build_swap_lower=build_exact_pathwise_lower
    reference.main() # 408 pairwise comparisons against five unchanged exact Q roots

if __name__=='__main__':main()
