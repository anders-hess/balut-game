#!/usr/bin/env python3
"""Independent exact-rational verifier for the v50 native multidate dual.
All tests are on ORIGINAL Balut terminal Big Points, no surrogate bonuses.
Uses only frozen JSON integer outputs, not the optimizer's decision logic.
"""
from fractions import Fraction
from pathlib import Path
import json, sys, hashlib, math
D=7776
ROOT=Path(__file__).resolve().parent
SCORE={0:'Fours',1:'Fives',2:'Sixes',3:'Straight',4:'Full House',5:'Choice',6:'Balut'}

def verify(horizon):
 native=json.loads((ROOT/f'native{horizon}.json').read_text())
 old=json.loads((ROOT/f'native_exact{horizon}.json').read_text())
 assert native['horizon']==horizon
 assert native['event_mass']==[4668,3108]
 acts=native['actions']
 assert len(acts)==horizon
 common=D**(3*(horizon-1))
 # Reconstruct current scoring Q and optimistic per-action U from integer values.
 action=[]
 for k,v in acts.items():
  assert v['score']>0
  low=int(v['original_num']);upper=sum(map(int,v['conditional_num']))
  assert upper>=low  # information relaxation cannot reduce optimal expected reward
  label=f'score:{k}:{v["score"]}'
  assert label in old['actions'],label
  assert abs(float(Fraction(low,common))-old['actions'][label])<1e-11
  action.append(dict(id=label,score=v['score'],low=low,upper=upper,
                     exact=float(Fraction(low,common)),future_oracle=float(Fraction(upper,common))))
 action.sort(key=lambda row:(-row['low'],row['id']))
 champion=action[0];rivals=action[1:]
 strongest=max(rivals,key=lambda x:x['upper'])
 margin=champion['low']-strongest['upper']
 assert margin>0, 'strict candidate L must beat ALL competing dual U'
 assert all(champion['low']>r['upper'] for r in rivals)
 assert all(a['low']<=a['upper'] for a in action)
 # Separate reconstruction of same-event martingale penalties via fractions.
 mass=native['event_mass'];phi={}
 cond={k:[Fraction(int(v['conditional_num'][e]),mass[e]*D**(3*(horizon-1)-1)) for e in (0,1)] for k,v in acts.items()}
 exact=max(Fraction(int(v['original_num']),common) for v in acts.values())
 oracle=max((sum(Fraction(mass[e],D)*cond[k][e] for e in (0,1)) for k in cond))
 clairvoyant=sum(Fraction(mass[e],D)*max(cond[k][e] for k in cond) for e in (0,1))
 assert oracle>=exact and clairvoyant>=oracle
 for p,q in [(0,1),(1,4),(1,2),(3,4),(1,1)]:
  penalty={k:[Fraction(p,q)*y for y in x] for k,x in cond.items()}
  expectation={k:sum(Fraction(mass[e],D)*penalty[k][e] for e in (0,1)) for k in cond}
  upper=sum(Fraction(mass[e],D)*max(cond[k][e]-penalty[k][e]+expectation[k] for k in cond) for e in (0,1))
  assert upper>=oracle
  phi[f'{p}/{q}']={'value':str(upper),'value_bp':float(upper),'slack_above_true_Q_bp':float(upper-exact)}
 assert phi['0/1']['value']==str(clairvoyant)
 assert phi['1/1']['value']==str(oracle)
 return dict(horizon=horizon,category_count=len(action),all_positive=True,action_intervals=action,
             independent_float64_Bellman_action_comparisons=len(action),
             certificate={'globally_optimal_current_score':champion['id'],
                          'candidate_exact_rational_L_numerator':str(champion['low']),
                          'largest_competitor_dual_U_numerator':str(strongest['upper']),
                          'common_denominator':str(common),'strict_positive_integer_margin':str(margin),
                          'margin_BP':float(Fraction(margin,common)),
                          'competing_action_with_highest_U':strongest['id'],
                          'positive_current_competitors_pruned':len(rivals),
                          'valid_only_for_this_short_horizon':True},
             clairvoyant_info_dual={'unpenalized':str(clairvoyant),'perfect_current_stage_penalty':str(oracle),
                                     'unremoved_future_stage_information_gap_BP':float(oracle-exact),
                                     'penalty_experiments':phi},
             memory_states=native['memo_states'],hold_operations=native['hold_operations'],
             elapsed_native_s=native['seconds'])

def main():
 res={'status':'EXACT_SHORT_HORIZON_ONLY','entries':[verify(3),verify(4)],
      'early_28_turn_top_certificates':0,'early_28_turn_pruned_actions_from_this_dual':0,
      'reason':'This multi-turn full-reward dual is not computed for 28 turns; v48/v49 bounds are unchanged.'}
 (ROOT/'v50_results.json').write_text(json.dumps(res,indent=2)+'\n')
 for e in res['entries']:
  print(f"{e['horizon']} turns: {e['category_count']} positive legal score actions; best={e['certificate']['globally_optimal_current_score']}; strict margin={e['certificate']['margin_BP']:.12f} BP; nodes={e['memory_states']}; hold_ops={e['hold_operations']}")
 print('28-turn observed opening: 0 certified / 0 pruned (no valid new early bound constructed)')
if __name__=='__main__':main()