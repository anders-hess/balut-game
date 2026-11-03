from pathlib import Path
from statistics import mean
import json
p=Path(__file__).resolve().parent
rows=[]
for batch in [(0,8),(8,16),(16,24),(20,21),(21,22),(22,23),(23,24),(24,30),(30,36)]:
 arr=json.loads((p/f'batch_{batch[0]}_{batch[1]}.json').read_text())
 for row in arr:
  if row['case_index'] not in [x['case_index'] for x in rows]:rows.append(row)
rows.sort(key=lambda x:x['case_index']);assert len(rows)==36 and [r['case_index'] for r in rows]==list(range(36))
summary={'observed_roots':36,'certified_early_top':sum(x['certified'] for x in rows),'actions_pruned':sum(x['pruned'] for x in rows),'legal_action_intervals':sum(x['legal_actions'] for x in rows),'mean_proof_gap_bp':mean(x['gap_bp'] for x in rows),'min_proof_gap_bp':min(x['gap_bp'] for x in rows),'max_proof_gap_bp':max(x['gap_bp'] for x in rows),'sum_root_cpu_seconds':sum(x['seconds'] for x in rows),'max_rss_kb':max(x['rss_kb'] for x in rows)}
(p/'observed_metrics.json').write_text(json.dumps({'summary':summary,'roots':rows},indent=2))
print(json.dumps(summary,indent=2))
