#!/usr/bin/env python3
"""Independently freeze v49 exact integer all-action quantities, excluding walltime."""
import json,hashlib
from pathlib import Path
r=Path(__file__).resolve().parent
res=json.loads((r/'v49_results.json').read_text())
fields=('frozen_opening','hold_bounds','node_gap_counts','gap_BP','certified_early_actions','newly_pruned_actions','source_table_sha256')
sub={k:res[k] for k in fields}
sha=hashlib.sha256(json.dumps(sub,sort_keys=True,separators=(',',':')).encode()).hexdigest()
wanted=(r/'frozen_v49_sha256.txt').read_text().strip()
assert sha==wanted,('frozen v49 full current action result changed',sha,wanted)
assert res['gap_BP']>13 and res['newly_pruned_actions']==0 and res['certified_early_actions']==0
print('PASS v49 frozen reproducibility SHA256',sha)