from fractions import Fraction
from joint_threshold_v39 import *
from test_v37 import independent_one_turn
a=[2*int(40+x>=52) for x in SCORES[0]]
b=[2*int(50+y>=65) for y in SCORES[1]]
ea=-independent_one_turn([-x for x in a])
eb=-independent_one_turn([-x for x in b])
exact=-independent_one_turn([-max(Fraction(a[i])+eb,Fraction(b[i])+ea) for i in range(252)])
q,n=coupled_threshold_upper(0,1,1,1,2,40,50,52,65)
assert exact<=Fraction(q,SCALE)<=exact+Fraction(8,SCALE),(exact,q)
print('EXACT_TWO_TURN',exact,'CEIL',Fraction(q,SCALE),'states',n)
for T,ka,kb in [(2,1,1),(8,1,1),(20,1,1),(20,2,1),(28,2,2)]:
    j,n=coupled_threshold_upper(0,1,ka,kb,T,40,50,52,65)
    x,_=independent_threshold_upper(0,ka,T,40,52)
    y,_=independent_threshold_upper(1,kb,T,50,65)
    assert 0<=j<=x+y<=4*SCALE
    print('TEST',T,ka,kb,'joint',j/SCALE,'independent',(x+y)/SCALE,'states',n)
print('PASS')
