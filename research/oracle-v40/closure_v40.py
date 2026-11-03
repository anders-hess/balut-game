"""Oracle v40: exact-integer transitive closure of global Q* difference bounds.
Requires oracle_v37/robust_swap_v34.py from complete v39 package.
U[a,b]>=Q*(a)-Q*(b). Triangle: U[a,c]<=U[a,b]+U[b,c].
The closed upper is valid for the true fully adaptive 7-category final BP objective.
"""
from robust_swap_v34 import CATS, INDEX, HISTS, build_swap_lower, holds, hold_transitions
DEN=7776**2
def evaluate(board,dice):
    ix=INDEX[tuple(sorted(dice))]
    legal=[i for i,c in enumerate(CATS) if None in board[c]]
    n=len(legal)
    U=[[0 if i==j else 10**40 for j in range(n)] for i in range(n)]
    HB={}
    for j,c in enumerate(legal):
        D=build_swap_lower(board,ix,c)
        for i,a in enumerate(legal):
            if i!=j: U[i][j]=-D[a][ix]*DEN
        stop=[max(-D[a][y] for a in legal) for y in range(252)]
        prev=[]
        for y in range(252):
            v=stop[y]*7776
            for h in holds(HISTS[y]):
                m=5-len(h)
                v=max(v,sum(w*stop[k] for k,w in hold_transitions(h))*6**(5-m))
            prev.append(v)
        HB[j]={h:sum(w*prev[k] for k,w in hold_transitions(h))*6**len(h) for h in holds(HISTS[ix])}
    old=[r[:] for r in U]
    for k in range(n):
        for i in range(n):
            for j in range(n): U[i][j]=min(U[i][j],U[i][k]+U[k][j])
    holds0=list(HB[0])
    H={h:[min(HB[k][h]+U[k][j] for k in range(n)) for j in range(n)] for h in holds0}
    assert all(U[i][i]==0 for i in range(n))
    return {'scoreTightened':sum(U[i][j]<old[i][j] for i in range(n) for j in range(n)),
            'holdTightened':sum(H[h][j]<HB[j][h] for h in holds0 for j in range(n)),
            'scoreEliminated':sum(any(U[i][j]<0 for j in range(n)) for i in range(n)),
            'holdEliminated':sum(any(H[h][j]<0 for j in range(n)) for h in holds0),
            'certified':any(all(U[i][j]<0 for i in range(n) if i!=j) and all(H[h][j]<0 for h in holds0) for j in range(n))}
