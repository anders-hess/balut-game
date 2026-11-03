"""Independent integer certificate-audit of frozen v47 action intervals.
Does not use or trust printed float gap to determine certification.
"""
import json,glob,statistics,time
from pathlib import Path
from bounds_andor import compress,INDEX,CATS,hold_names
from integer_proof import certificate
HERE=Path(__file__).resolve().parent

def read_batches(pattern):
 out={}
 for path in HERE.glob(pattern):
  for row in json.loads(path.read_text())['results']:
   k=row['case']
   if k in out:raise AssertionError((path,k,'duplicate'))
   out[k]=row
 return out

def audited_actions(row):
 return {a:(int(v['lo_num']),int(v['up_num']),int(v['den'])) for a,v in row['actions'].items()}

def main():
 cases=json.loads((HERE/'observed_early_cases_v28.json').read_text())['cases']
 older=read_batches('observed_[0-9]*_[0-9]*.json');newer=read_batches('portfolio_[0-9]*_[0-9]*.json')
 assert sorted(older)==list(range(36)),('missing old',sorted(older));assert sorted(newer)==list(range(36)),('missing portfolio',sorted(newer))
 for i,row in enumerate(cases):
  old=audited_actions(older[i]);new=audited_actions(newer[i]);z=compress(row['board']);dice=row['dice']
  assert set(old)==set(new)
  assert len(old)==sum(bool(k) for k in z[0])+len(hold_names(dice))
  assert (len(old)>=7 or any(k==0 for k in z[0]))
  for a,v in old.items():
   l,u,d=v;L,U,den=new[a]
   assert d==den and l==L and L<=U<=u
  assert (cert:=certificate(new))['pruned']==newer[i]['pruned']
  assert cert['certified']==newer[i]['certified']==False
  assert cert['gap_bp']>=0
  assert row['remaining']==sum(z[0])==older[i]['remaining']==newer[i]['remaining']
 for n in (0,8):
  selective=json.loads((HERE/f'selective_hold_case{n}.json').read_text())
  ref=audited_actions(newer[n]);after={a:(int(v['lo_num']),int(v['up_num']),int(v['den'])) for a,v in selective['all_actions'].items()}
  assert set(after)==set(ref)
  assert all(after[a][0]==ref[a][0] and after[a][1]<=ref[a][1] for a in after)
  assert certificate(after)['certified']==False
 allrows=list(newer.values())
 original=list(older.values());totalActions=sum(x['legal_actions'] for x in allrows)
 assert totalActions==964
 out={'n_early_positions':36,'current_legal_actions':totalActions,'certified_early_top':sum(r['certified'] for r in allrows),
   'pruned_early_actions':sum(r['pruned'] for r in allrows),
   'v45_mean_gap_bp':statistics.mean(r['baseline_gap_bp'] for r in original),
   'v47_rootwise_mean_gap_bp':statistics.mean(r['gap_bp'] for r in original),
   'v47_leaf_portfolio_mean_gap_bp':statistics.mean(r['gap_bp'] for r in allrows),
   'improvement_vs_v45_bp':statistics.mean(r['baseline_gap_bp'] for r in original)-statistics.mean(r['gap_bp'] for r in allrows),
   'min_remaining_gap_bp':min(r['gap_bp'] for r in allrows),
   'max_remaining_gap_bp':max(r['gap_bp'] for r in allrows),
   'native_quota_dp_total_states':sum(c['states'] for r in original for c in r['calls']),
   'native_quota_dp_total_holdops':sum(c['holdOps'] for r in original for c in r['calls']),
   'root_run_total_seconds':sum(r['seconds_total'] for r in original),
   'leaf_portfolio_total_seconds':sum(r['seconds_total'] for r in allrows),
   'selective_hold_case0':{k:json.loads((HERE/'selective_hold_case0.json').read_text())[k] for k in ('target_rival_hold','leaf_budget','seconds_total')},
   'selective_hold_case8':{k:json.loads((HERE/'selective_hold_case8.json').read_text())[k] for k in ('target_rival_hold','leaf_budget','seconds_total')},
   'by_turns':[]}
 for h in range(28,19,-1):
  rows=[r for r in allrows if r['remaining']==h]
  out['by_turns'].append({'remaining':h,'n':len(rows),'mean_gap_bp':statistics.mean(x['gap_bp'] for x in rows),'pruned':sum(x['pruned'] for x in rows)})
 (HERE/'summary_metrics.json').write_text(json.dumps(out,indent=2))
 print(json.dumps(out,indent=2))
if __name__=='__main__':main()