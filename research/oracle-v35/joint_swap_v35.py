#!/usr/bin/env python3
"""Oracle v35: exact joint exchanged-row and reachable-terminal payoff envelope.
Research-only, no production integration. Imports v34 source via PYTHONPATH.
"""
from robust_swap_v34 import *
from functools import lru_cache

@lru_cache(None)
def possible_row_sums(cat, slots):
    pairs={(0,True)}
    for _ in range(slots):
        pairs={(a+b, good and b>0) for a,good in pairs for b in SCORE_SETS[cat]}
    return tuple(sorted(pairs))

@lru_cache(None)
def row_bonus_outcomes(cat, old, new, filled, slots):
    out=set()
    for small,all_valid in possible_row_sums(cat,slots):
        if cat in (0,1,2,5):
            v=2*((sum(filled)+small+new>=THRESH[cat])-(sum(filled)+small+old>=THRESH[cat]))
        elif cat in (3,4):
            v=0 if any(x==0 for x in filled) or not all_valid else REWARDS[cat]*((new>0)-(old>0))
        else:
            v=2*((new>0)-(old>0))
        out.add((small,v))
    return tuple(sorted(out))

@lru_cache(None)
def joint_two_rows(cat1,old1,new1,filled1,slots1,cat2,old2,new2,filled2,slots2):
    a=row_bonus_outcomes(cat1,old1,new1,filled1,slots1)
    b=row_bonus_outcomes(cat2,old2,new2,filled2,slots2)
    best={}
    for sa,ra in a:
        for sb,rb in b:
            s=sa+sb;v=ra+rb
            if s not in best or v<best[s]:best[s]=v
    return tuple(sorted(best.items()))

@lru_cache(None)
def joint_one_row(cat,old,new,filled,slots):
    best={}
    for s,r in row_bonus_outcomes(cat,old,new,filled,slots):
        if s not in best or r<best[s]:best[s]=r
    return tuple(sorted(best.items()))

@lru_cache(None)
def fast_bonus_diff_min(delta,lo,hi):
    assert lo<=hi
    candidates={lo}
    for offset in (0,-delta):
        k=max(0,(lo-300-offset)//50)
        while 300+50*k+offset<=hi:
            t=300+50*k+offset
            if t>=lo:candidates.add(t)
            k+=1
    return min(bonus(t+delta)-bonus(t) for t in candidates)

def build_joint_lower(card,current_idx,c,*,compressed_total=None):
    filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
    k=tuple(4-len(f) for f in filled)
    present_total=sum(sum(f) for f in filled) if compressed_total is None else compressed_total
    x=SCORES[c][current_idx]
    D=[[None]*252 for _ in range(7)]
    for d in range(7):
        if not k[d]:continue
        other_lo=sum(k[e]*SCOREMIN[e] for e in range(7) if e not in (c,d))
        other_hi=sum(k[e]*SCOREMAX[e] for e in range(7) if e not in (c,d))
        if d==c:
            other_lo=sum(k[e]*SCOREMIN[e] for e in range(7) if e!=c)
            other_hi=sum(k[e]*SCOREMAX[e] for e in range(7) if e!=c)
        for y in range(252):
            sy=SCORES[d][y]
            if d==c:
                delta=x-sy
                joint=joint_one_row(c,sy,x,filled[c],k[c]-1)
                D[d][y]=min(r+fast_bonus_diff_min(delta,present_total+sy+s+other_lo,present_total+sy+s+other_hi) for s,r in joint)
            else:
                best=1000
                for zc,zd in PAIRSETS[c][d]:
                    delta=x+zd-sy-zc
                    joint=joint_two_rows(c,zc,x,filled[c],k[c]-1,d,sy,zd,filled[d],k[d]-1)
                    base=present_total+sy+zc+other_lo
                    top=present_total+sy+zc+other_hi
                    val=min(r+fast_bonus_diff_min(delta,base+s,top+s) for s,r in joint)
                    if val<best:best=val
                D[d][y]=best
    return D

@lru_cache(None)
def other_reachable_bits(remaining_quotas):
    bits=1
    for cat,n in enumerate(remaining_quotas):
        for _ in range(n):
            nxt=0
            for score in SCORE_SETS[cat]:nxt|=bits<<score
            bits=nxt
    return bits

@lru_cache(None)
def reachable_bonus_diff_min(delta,base,bits):
    maximum=bits.bit_length()-1
    lo,hi=base,base+maximum
    events={lo,hi+1}
    for offset in (0,-delta):
        k=max(0,(lo-300-offset)//50)
        while 300+50*k+offset<=hi:
            t=300+50*k+offset
            if t>=lo:events.add(t)
            k+=1
    boundaries=sorted(events)
    best=10**9
    for a,b in zip(boundaries,boundaries[1:]):
        start=a-base;length=b-a
        if ((bits>>start)&((1<<length)-1)):
            best=min(best,bonus(a+delta)-bonus(a))
    assert best<10**9
    return best

def build_exact_pathwise_lower(card,current_idx,c,*,compressed_total=None):
    """Exact worst possible terminal exchange, NOT the stochastic Bellman Q*."""
    filled=tuple(tuple(v for v in card[name] if v is not None) for name in CATS)
    k=tuple(4-len(f) for f in filled)
    present_total=sum(sum(f) for f in filled) if compressed_total is None else compressed_total
    x=SCORES[c][current_idx]
    D=[[None]*252 for _ in range(7)]
    for d in range(7):
        if not k[d]:continue
        other_quotas=tuple(0 if e in (c,d) else k[e] for e in range(7))
        bits=other_reachable_bits(other_quotas)
        if d==c:
            other_quotas=tuple(0 if e==c else k[e] for e in range(7))
            bits=other_reachable_bits(other_quotas)
        for y in range(252):
            sy=SCORES[d][y]
            if d==c:
                delta=x-sy
                joint=joint_one_row(c,sy,x,filled[c],k[c]-1)
                D[d][y]=min(r+reachable_bonus_diff_min(delta,present_total+sy+s,bits) for s,r in joint)
            else:
                best=1000
                for zc,zd in PAIRSETS[c][d]:
                    delta=x+zd-sy-zc
                    joint=joint_two_rows(c,zc,x,filled[c],k[c]-1,d,sy,zd,filled[d],k[d]-1)
                    base=present_total+sy+zc
                    val=min(r+reachable_bonus_diff_min(delta,base+s,bits) for s,r in joint)
                    if val<best:best=val
                D[d][y]=best
    return D
