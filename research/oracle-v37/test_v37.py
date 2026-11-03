#!/usr/bin/env python3
"""Independent arithmetic tests and frozen exact Bellman Q regression for v37."""
import json,time,sys
from fractions import Fraction
from math import factorial
from itertools import product
from multistop_v37 import *
from test_exact_q_v34 import synthetic

# No calls to v37's sparse-matrix stochastic routine in independent reference.
def independent_one_turn(scores, skip=None):
    from functools import lru_cache
    @lru_cache(None)
    def roll_value(hist,remaining):
        stop=Fraction(scores[INDEX[hist]])
        if skip is not None:stop=min(stop,Fraction(skip))
        if remaining==0:return stop
        return min([stop]+[sum(Fraction(w,6**(5-len(h)))*roll_value(HISTS[nxt],remaining-1)
                     for nxt,w in hold_transitions(h)) for h in holds(hist)])
    weights=[factorial(5)//__import__('math').prod(factorial(n) for n in Counter(h).values()) for h in HISTS]
    return sum(Fraction(w,DEN)*roll_value(h,2) for h,w in zip(HISTS,weights))

def arithmetic():
    mat,starts,initial=transition_matrix()
    assert mat.shape==(4116,252) and mat.nnz==253848
    assert np.all(np.asarray(mat.sum(axis=1)).reshape(-1)==DEN)
    assert sum(initial)==DEN
    scores=[(SCORES[0][i]-9)*SCALE for i in range(252)]
    exact=independent_one_turn([SCORES[0][i]-9 for i in range(252)])
    lo=floor_stochastic_min(scores)
    assert Fraction(lo,SCALE)<=exact<=Fraction(lo+3,SCALE),(lo,exact)
    # With K=1, the multi-use DP is precisely an exact two-reroll minimization
    # of the terminal first-use reward, independent of future categories.
    K=1;deadline=1;base=0;x=8;th=52;vals=SCORE_SETS[0]
    pattern=tuple(range(len(vals)))
    q,states=multiuse_pattern(K,deadline,base,x,th,vals,pattern,SCALE)
    independent=independent_one_turn([2*(int(x>=th)-int(SCORES[0][i]>=th))+pattern[vals.index(SCORES[0][i])] for i in range(252)])
    assert Fraction(q,SCALE)<=independent<=Fraction(q+3,SCALE)
    # Independently solve the full K=2, T=2 nonanticipative multi-use game
    # using arbitrary-precision Fraction at BOTH stochastic turns.
    base=0;x=4;th=12;pattern=(1,0,3,2,5,4)
    second={z:independent_one_turn([
        2*(int(base+x+SCORES[0][i]>=th)-int(base+z+SCORES[0][i]>=th))
        +pattern[vals.index(z)] for i in range(252)]) for z in vals}
    exact_two=independent_one_turn([second[SCORES[0][i]] for i in range(252)])
    q2,states2=multiuse_pattern(2,2,base,x,th,vals,pattern,SCALE)
    assert Fraction(q2,SCALE)<=exact_two<=Fraction(q2+7,SCALE),(q2,exact_two)
    return {'transitionRows':mat.shape[0],'weightedEdges':mat.nnz,'independentExactOneTurn':str(exact),
            'multiuseK1Exact':str(independent),'multiuseK2T2Exact':str(exact_two),'oneSidedFloorPassed':True}

def exactq(limit=None):
    rows=json.load(open('reference_exact_q_v27.json'))
    count=0;cases=0;min_slack=1e9;max_improvement=0;improved=0;results=[]
    for row in rows[:limit]:
        state=row['stateInput'];board=synthetic(state);dice=state[15:20];r=state[20]
        q={tuple([json.loads(k)[0],json.loads(k)[1],tuple(json.loads(k)[2]) if json.loads(k)[2] is not None else None]):v for k,v in row['exactActionQ'].items()}
        for c in (0,1,2):
            key=('score',CATS[c],None)
            if key not in q:continue
            a=compare_candidate(board,dice,c,r,compressed_total=state[14]);b=compare_candidate(board,dice,c,r,multi=False,compressed_total=state[14]);
            for name,upper in a['scoreRivalUpperBP'].items():
                exact=q[('score',name,None)]-q[key]
                slack=upper-exact
                assert slack>=-1e-8,(row['case'],c,name,slack)
                assert upper<=b['scoreRivalUpperBP'][name]+1e-8
                count+=1;min_slack=min(min_slack,slack)
                improved+=upper<b['scoreRivalUpperBP'][name]-1e-6
                max_improvement=max(max_improvement,b['scoreRivalUpperBP'][name]-upper)
            for h,upper in a['holdRivalUpperBP'].items():
                ht=tuple(int(x) for x in h.strip('()').split(',') if x.strip())
                keyh=('hold',None,tuple(ht.count(face) for face in FACES))
                exact=q[keyh]-q[key]
                slack=upper-exact
                assert slack>=-1e-8,(row['case'],c,h,slack)
                assert upper<=b['holdRivalUpperBP'][h]+1e-8
                count+=1;min_slack=min(min_slack,slack)
                improved+=upper<b['holdRivalUpperBP'][h]-1e-6
                max_improvement=max(max_improvement,b['holdRivalUpperBP'][h]-upper)
            results.append({'reference':row['case'],'candidate':CATS[c], 'exactQComparisons':len(a['scoreRivalUpperBP'])+len(a['holdRivalUpperBP']),
                'oldMaxRegretUpper':b['maxRivalAdvantageUpperBP'],'newMaxRegretUpper':a['maxRivalAdvantageUpperBP'],
                'improvedSyCells':a['improvedSyCells']})
            multiuse_pattern.cache_clear()
            joint_two_rows.cache_clear();joint_one_row.cache_clear();row_bonus_outcomes.cache_clear()
        cases+=1
    return {'cases':cases,'comparisons':count,'minSlackToFloatExactQ':min_slack,'improvedActionBounds':improved,
            'maxImprovementBP':max_improvement,'violations':0,'details':results}

if __name__=='__main__':
    t=time.perf_counter();a=arithmetic();print('ARITHMETIC',json.dumps(a),flush=True)
    lim=int(sys.argv[1]) if len(sys.argv)>1 else 5
    b=exactq(lim)
    print('EXACTQ',json.dumps(b),flush=True)
    print('ELAPSED',time.perf_counter()-t)
    open('v37_exact_q_audit.json','w').write(json.dumps({'arithmetic':a,'exactQ':b,'elapsed':time.perf_counter()-t},indent=2))
