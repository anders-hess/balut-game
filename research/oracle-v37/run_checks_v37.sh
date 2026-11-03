#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export PYTHONPATH="$ROOT/research/oracle-v37:$ROOT/research/oracle-v35:$ROOT/research/oracle-v34"
cd research/oracle-v37
python - <<'PY'
import json
from fixtures import observed,exact_q
from pathlib import Path
Path('observed_early_cases_v28.json').write_text(json.dumps({'cases':observed()}))
Path('reference_exact_q_v27.json').write_text(json.dumps(exact_q()))
print('restored unchanged compressed v27/v28 frozen fixtures')
PY
OPENBLAS_NUM_THREADS=1 python test_v37.py 5
python - <<'PY'
import json
x=json.load(open('summary_v37.json'))
assert x['observedRoots']==36 and x['certifiedUnique']==0
assert x['scoreRivals']==212 and x['holdRivals']==716
assert x['improvedRoots']==34
print('v37 frozen 36-root aggregate checked')
PY
# Full observed replay: python run_v37.py 0 3 replay.json
