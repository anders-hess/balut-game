#!/usr/bin/env python3
"""Independent mathematically exact 2-turn *illustrative* stochastic toy.
NOT Balut scoring rules, not an early global optimality certificate.
True coupled terminal bonus is retained; stage 1 observes x1, chooses category;
stage 2 shock x2 is unknowable, unless relaxed. Penalize h(s_after,x2)-E[h|choice].
"""
from fractions import Fraction as F
from itertools import product
import json
from pathlib import Path
OUT=Path(__file__).resolve().parent
OUTCOMES=(0,1,2)
A=(0,4,8)
B=(8,4,0)
def terminal(x1,first,x2):
    first_val=(A if first=='A' else B)[x1]
    second_val=(B if first=='A' else A)[x2]
    small=first_val+second_val
    # Coupled, nonlinear threshold reward, analogous in kind to Balut bonus.
    return small+(4 if small>=10 else -2)
def dual(x1,potential):
    # Perfect-information recourse: sees future x2 before choosing A or B.
    m={a:sum(potential(x1,a,x2) for x2 in OUTCOMES)/F(3) for a in ('A','B')}
    primal=max(sum(F(terminal(x1,a,x2),3) for x2 in OUTCOMES) for a in ('A','B'))
    clairvoyant=sum(F(max(terminal(x1,a,x2) for a in ('A','B')),3) for x2 in OUTCOMES)
    bound=sum(F(max(terminal(x1,a,x2)-potential(x1,a,x2)+m[a] for a in ('A','B')),3) for x2 in OUTCOMES)
    assert bound>=primal
    return primal,clairvoyant,bound

def test():
    ans={}
    for x1 in OUTCOMES:
        toy={}
        pots={'zero':lambda i,a,j:F(0),
              'immediate_small':lambda i,a,j:F((B if a=='A' else A)[j]),
              'exact_terminal':lambda i,a,j:F(terminal(i,a,j))}
        for key,p in pots.items():
            primal,clv,bound=dual(x1,p)
            toy[key]={'primal':str(primal),'perfect_information':str(clv),'dual_upper':str(bound)}
            if key=='zero':assert bound==clv
            if key=='exact_terminal':assert bound==primal
        ans[str(x1)]=toy
    # Strict premonition advantage occurs at x1=1; nontrivial reward thresholds.
    assert F(ans['1']['zero']['dual_upper'])>F(ans['1']['zero']['primal'])
    assert F(ans['1']['exact_terminal']['dual_upper'])==F(ans['1']['exact_terminal']['primal'])
    j={'classification':'independent synthetic 2-turn toy, not Balut scoring','outcomes':ans,
       'passed':'exact rational weak duality, strict clairvoyance gap, strong duality with exact terminal potential'}
    (OUT/'toy_exact_fraction.json').write_text(json.dumps(j,indent=2)+'\n')
    print(json.dumps(j,indent=2))
if __name__=='__main__':test()