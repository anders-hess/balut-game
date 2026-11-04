from fractions import Fraction
from itertools import product
import json, time, resource, random
CATS=('fours','fives','sixes','straight','fullHouse','choice','balut')
CAP=(20,25,30,20,30,30,50)
THRESH=(52,65,78,None,None,100,None)
POINTS=(2,2,2,4,3,2,2)
def bonus(s):
    return -2 if s<300 else -1 if s<350 else 0 if s<400 else 1 if s<450 else 2+(s-450)//50
def category_bp(c,values):
    if c==6:return 2*sum(x>0 for x in values)
    if c in (3,4):return POINTS[c] if len(values)==4 and all(x>0 for x in values) else 0
    return POINTS[c] if sum(values)>=THRESH[c] else 0
def upper(card):
    assert len(card)==7 and all(len(v)<=4 for v in card)
    maxsmall=0; maxbp=0
    for c,v in enumerate(card):
        potential=tuple(v)+(CAP[c],)*(4-len(v))
        maxsmall+=sum(potential)
        maxbp+=category_bp(c,potential)
    return Fraction(maxbp+bonus(maxsmall))
def lower(card):
    return Fraction(sum(category_bp(c,v) for c,v in enumerate(card))-2)
def terminal(card):
    assert all(len(v)==4 for v in card)
    return Fraction(sum(category_bp(c,v) for c,v in enumerate(card))+bonus(sum(map(sum,card))))
def score(c,d):
    counts=[d.count(x) for x in range(1,7)]
    s=sum(d)
    if c<3:return (4,5,6)[c]*counts[(4,5,6)[c]-1]
    if c==3:return 15 if sorted(d)==[1,2,3,4,5] else 20 if sorted(d)==[2,3,4,5,6] else None
    if c==4:return s if sorted(counts,reverse=True)[:2]==[3,2] else None
    if c==5:return s
    return s+20 if 5 in counts else None
def run():
    t=time.perf_counter(); rng=random.Random(5704)
    tests=0
    for _ in range(10000):
        card=tuple(tuple(rng.randrange(0,CAP[c]+1) for _ in range(rng.randrange(5))) for c in range(7))
        lo,hi=lower(card),upper(card);assert lo<=hi;tests+=1
        for c in range(7):
            if len(card[c])==4:continue
            val=rng.randrange(CAP[c]+1)
            child=list(card);child[c]=card[c]+(val,);child=tuple(child)
            assert lower(child)>=lo and upper(child)<=hi,(card,c,val,hi,upper(child))
            assert lower(child)<=upper(child);tests+=3
    for _ in range(1000):
        card=tuple(tuple(rng.randrange(CAP[c]+1) for _ in range(4)) for c in range(7))
        assert lower(card)<=terminal(card)==upper(card);tests+=1
    d=(1,3,4,4,5)
    positive=[(CATS[c],score(c,d)) for c in range(7) if score(c,d) is not None and score(c,d)>0]
    holds=set()
    for bits in product((0,1),repeat=5):holds.add(tuple(sorted(x for x,b in zip(d,bits) if b)))
    empty=tuple(() for _ in range(7))
    action_intervals=[]
    for h in sorted(holds):
        action_intervals.append({'action':'hold '+str(h),'L':str(lower(empty)),'U':str(upper(empty))})
    for name,val in positive:
        c=CATS.index(name);child=list(empty);child[c]=(val,);child=tuple(child)
        action_intervals.append({'action':'score '+name+' '+str(val),'L':str(lower(child)),'U':str(upper(child))})
    best_lower=max(int(x['L']) for x in action_intervals)
    pruned=sum(int(x['U'])<best_lower for x in action_intervals)
    assert pruned==0
    result={'version':'v57','model':'real Balut terminal scoring; category-physical-ceiling relaxation, no stochastic Bellman','tests_passed':tests,'opening_positive_scores':positive,'opening_distinct_hold_multisets':len(holds),'opening_score_actions_tested':len(positive),'opening_hold_actions_tested':len(holds),'opening_total_distinct_action_types':len(holds)+len(positive),'root_L':str(lower(empty)),'root_U':str(upper(empty)),'opening_certified_top':0,'opening_pruned_rivals':pruned,'opening_action_intervals':action_intervals,'original_Q_fixtures':'NOT RUN','exact_Bellman_1_to_7':'NOT RUN','locked_30_action_Q':'NOT RUN','elapsed_seconds':round(time.perf_counter()-t,4),'peak_rss_kb':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
    print(json.dumps(result,indent=2))
if __name__=='__main__':run()
