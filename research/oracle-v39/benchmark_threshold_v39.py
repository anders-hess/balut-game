import json,time
from joint_threshold_v39 import *
from pathlib import Path
raw=json.loads(Path(__file__).with_name('observed_early_cases_v28.json').read_text())['cases']
rows=[];t0=time.perf_counter()
for case in raw:
    board=case['board'];T=case['remaining']
    if None not in board['fours'] or None not in board['fives']:continue
    base_a=sum(x for x in board['fours'] if x is not None)
    base_b=sum(x for x in board['fives'] if x is not None)
    # Truncated one-use-per-row probe: not the original card's quotas.
    j,n=coupled_threshold_upper(0,1,1,1,T,base_a,base_b,52,65)
    a,_=independent_threshold_upper(0,1,T,base_a,52)
    b,_=independent_threshold_upper(1,1,T,base_b,65)
    rows.append({'game':case['game'],'remaining':T,'dice':case['dice'],
                 'pairBonusUpper':j/SCALE,'independentBonusUpper':(a+b)/SCALE,
                 'couplingGainBP':(a+b-j)/SCALE,'states':n,
                 'actualFoursRemaining':board['fours'].count(None),
                 'actualFivesRemaining':board['fives'].count(None)})
result={'method':'one-use-per-row threshold bonus subproblem; not Balut Q*',
        'positions':len(rows),'improved':sum(x['couplingGainBP']>0 for x in rows),
        'maxGainBP':max((x['couplingGainBP'] for x in rows),default=None),
        'meanGainBP':sum(x['couplingGainBP'] for x in rows)/len(rows),
        'seconds':time.perf_counter()-t0,'rows':rows}
Path(__file__).with_name('v39_observed_threshold.json').write_text(json.dumps(result,indent=2))
print({k:v for k,v in result.items() if k!='rows'})
