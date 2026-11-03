#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
g++ -O3 -std=c++20 -DNDEBUG quota_upper.cpp -o quota_upper
g++ -O3 -std=c++20 -DNDEBUG exact_quotient.cpp -o exact_quotient
g++ -O3 -std=c++20 -DNDEBUG exact_reachable.cpp -o exact_reachable
python -m unittest -v test_quota test_conditional test_route
python verify_results.py > /tmp/balut_v47_audit.json
python - <<'PY'
import json
s=json.load(open('/tmp/balut_v47_audit.json'))
assert (s['n_early_positions'],s['current_legal_actions'],s['certified_early_top'],s['pruned_early_actions'])==(36,964,0,0)
print('PASS: frozen 36/964 early-action interval and numeric certificate audit')
PY