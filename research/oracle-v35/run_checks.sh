#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export PYTHONPATH="$PWD/research/oracle-v34:$PWD/research/oracle-v35"
python research/oracle-v35/test_v35.py
python - <<'PY'
import test_exact_q_v34 as ref
from joint_swap_v35 import build_exact_pathwise_lower
ref.build_swap_lower=build_exact_pathwise_lower
ref.main()
PY
if [[ "${RUN_BENCH:-0}" == "1" ]]; then
  for start in 0 4 16 24; do
    case "$start" in 0) n=4;; 4) n=12;; 16) n=8;; 24) n=12;; esac
    python research/oracle-v35/run_v35.py --start "$start" --count "$n" --out "/tmp/v35_${start}.json"
  done
fi
