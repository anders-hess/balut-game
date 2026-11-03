from fractions import Fraction
from joint_two_category_v38 import *
from multistop_v37 import SCORES
from test_v37 import independent_one_turn
fa=[(v-8)//4 for v in SCORES[0]]
fb=[(v-10)//5 for v in SCORES[1]]
ea=independent_one_turn(fa);eb=independent_one_turn(fb)
exact=independent_one_turn([min(Fraction(fa[i])+eb,Fraction(fb[i])+ea) for i in range(252)])
q,n=joint_min(fa,fb,1,1,2)
assert Fraction(q,SCALE)<=exact<=Fraction(q+6,SCALE)
print('FRACTION_2TURN',exact,'fixedpoint',q/SCALE)
for t in (2,3,5,20,28):
    j,_=joint_min(fa,fb,1,1,t)
    a,_=single_min(fa,1,t)
    b,_=single_min(fb,1,t)
    assert j>=a+b
    print('COUPLING',t,(j-a-b)/SCALE)
print('PASS')
