#!/usr/bin/env python3
"""408 rigorous swap inequalities against five unchanged exact Bellman Q roots."""
import json
from robust_swap_v34 import *
from joint_swap_v35 import build_exact_pathwise_lower
from fixtures import exact_q

def synthetic(state):
    n=state[:7];cap=state[7:11];valids=state[11:14]
    board={}
    for c,name in enumerate(CATS):
        if c in (0,1,2,5):
            ix={0:0,1:1,2:2,5:3}[c]
            f=([cap[ix]]+[0]*(n[c]-1)) if n[c] else []
        else:
            cnt=valids[{3:0,4:1,6:2}[c]]
            f=[1]*cnt+[0]*(n[c]-cnt)
        board[name]=f+[None]*(4-n[c])
    return board

def bounds_for(card,dice,r,c,total):
    idx=INDEX[tuple(sorted(dice))]
    legal=[i for i,k in enumerate(CATS) if card[k].count(None)>0]
    D=build_exact_pathwise_lower(card,idx,c,compressed_total=total)
    stop=[max(-D[d][y] for d in legal) for y in range(252)]
    prev=stop
    if r==2:
        prev=[]
        for y in range(252):
            best=stop[y]*7776
            for h in holds(HISTS[y]):
                n=5-len(h)
                best=max(best,sum(w*stop[j] for j,w in hold_transitions(h))*6**(5-n))
            prev.append(best)
    out={}
    for d in legal:
        if d!=c:out[('score',CATS[d],None)]=-D[d][idx]
    if r:
        for h in holds(HISTS[idx]):
            n=5-len(h)
            raw=sum(w*prev[j] for j,w in hold_transitions(h))*6**(5-n)
            counts=tuple(h.count(face) for face in FACES)
            out[('hold',None,counts)]=raw/7776**r
    return out

def main():
    rows=exact_q();checked=0;minimum=1e9
    for row in rows:
        state=row['stateInput'];card=synthetic(state);dice=state[15:20];r=state[20]
        q={}
        for k,v in row['exactActionQ'].items():
            key=json.loads(k)
            q[(key[0],key[1],tuple(key[2]) if key[2] is not None else None)]=v
        assert 28-sum(state[:7])==row['remaining']
        for c in range(7):
            key=('score',CATS[c],None)
            if key not in q:continue
            bounds=bounds_for(card,dice,r,c,state[14])
            assert len(bounds)==len(q)-1
            for b,upper in bounds.items():
                slack=upper-(q[b]-q[key])
                assert slack>=-1e-8,(row['case'],c,b,slack)
                minimum=min(minimum,slack);checked+=1
        print('exact-Q reference',row['case'],'r',r,flush=True)
    assert checked==408
    print(json.dumps({'exactBellmanActionComparisons':checked,'minReferenceSlack':minimum,'passed':True}))

if __name__=='__main__':main()
