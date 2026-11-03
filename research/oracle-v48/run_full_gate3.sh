#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ORACLE_V47="$PWD/../oracle_v47"
[[ -d "$ORACLE_V47" ]] || ORACLE_V47="$PWD/../oracle-v47"
export PYTHONPATH="$PWD:$ORACLE_V47"
cp gate3_result6.json gate3_frozen_backup.json
trap 'mv -f gate3_frozen_backup.json gate3_result6.json' EXIT
ulimit -v 1800000
/usr/bin/time -v timeout 100s python -u gate3_policy6.py
python verify_gate3.py
python - <<'PY'
import json
old=json.load(open('gate3_frozen_backup.json'))
new=json.load(open('gate3_result6.json'))
for k in ('scorecard','dice','weights','action_intervals','policy_leaf_audit','root_certification','status'):
 assert old[k]==new[k],f'REPRODUCTION MISMATCH at {k}'
print('PASS: full 6-category exact policy re-evaluation reproduces all 75 leaf and 30 action bounds')
PY